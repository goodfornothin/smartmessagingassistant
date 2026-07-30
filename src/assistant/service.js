const { matchFaq, getOffer, listOffers, renderTemplate, loadKnowledge } = require('../knowledge/faq');
const store = require('../store/inbox');
const { listConversations, sendTextMessage, getUserProfile } = require('../meta/instagram');
const { sendBatchPaced } = require('../meta/rateLimit');

/**
 * Process an inbound Instagram message from webhook.
 */
async function handleInboundMessage(msg) {
  store.recordMessage({
    direction: 'inbound',
    platform: msg.platform || 'instagram',
    senderId: msg.senderId,
    recipientId: msg.recipientId,
    text: msg.text,
    messageId: msg.messageId,
    timestamp: msg.timestamp || Date.now(),
  });

  const faq = matchFaq(msg.text || '');
  return {
    contactId: msg.senderId,
    text: msg.text,
    faqSuggestion: faq
      ? {
          faqId: faq.id,
          draftReply: faq.answer,
          confidence: faq.score,
        }
      : null,
  };
}

/**
 * Who have we not responded to? (from local webhook store)
 */
function getUnrepliedLocal(limit = 50) {
  return store.listUnreplied({ limit });
}

/**
 * Enrich unreplied list using Conversations API when tokens are configured.
 */
async function getUnreplied({ limit = 25, preferApi = true } = {}) {
  const local = getUnrepliedLocal(limit);

  if (!preferApi || !process.env.META_PAGE_ACCESS_TOKEN && !process.env.INSTAGRAM_ACCESS_TOKEN) {
    return { source: 'local_store', items: local };
  }

  try {
    const data = await listConversations({ limit });
    const items = [];
    for (const conv of data.data || []) {
      const messages = conv.messages?.data || [];
      if (!messages.length) continue;
      const latest = messages[0];
      const fromId = latest.from?.id;
      const igBusinessId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
      const isFromCustomer = fromId && fromId !== igBusinessId;
      if (!isFromCustomer) continue;

      let firstName;
      const participant = (conv.participants?.data || []).find((p) => p.id === fromId);
      if (participant?.username) {
        firstName = participant.username;
      }

      items.push({
        id: fromId,
        conversationId: conv.id,
        lastInboundAt: Date.parse(latest.created_time || conv.updated_time || '') || Date.now(),
        lastInboundText: latest.message || '',
        username: participant?.username,
        firstName,
        awaitingReply: true,
      });
    }
    return { source: 'instagram_conversations_api', items: items.slice(0, limit) };
  } catch (err) {
    console.warn('[assistant] Conversations API failed, using local store:', err.message);
    return { source: 'local_store_fallback', items: local, warning: err.message };
  }
}

/**
 * Draft personalized offer / follow-up messages for eligible contacts.
 * Instagram forbids cold DMs to followers who never messaged you.
 */
function draftOfferMessages({ offerId, contactIds, withinHours = 24 } = {}) {
  const offer = getOffer(offerId);
  if (!offer) {
    throw new Error(`Unknown offer: ${offerId}. Known: ${listOffers().map((o) => o.id).join(', ')}`);
  }

  let contacts;
  if (Array.isArray(contactIds) && contactIds.length) {
    contacts = contactIds.map((id) => ({ id }));
  } else {
    contacts = store.listContactsEligibleForFollowUp({ withinHours, limit: 100 });
  }

  const drafts = contacts.map((c) => {
    const text = renderTemplate('offerSoft', {
      firstName: c.firstName,
      offer: offer.summary,
      cta: offer.cta,
      link: offer.link,
    });
    return store.saveDraft({
      type: 'offer',
      offerId: offer.id,
      recipientId: c.id,
      firstName: c.firstName || null,
      username: c.username || null,
      text,
      windowHours: withinHours,
    });
  });

  return {
    offer,
    count: drafts.length,
    note:
      'Only people who already messaged you (within the messaging window) can be contacted via the Instagram API. Cold DMs to followers are not allowed.',
    drafts,
  };
}

function draftUnrepliedReplies({ limit = 20 } = {}) {
  const unreplied = store.listUnreplied({ limit });
  const drafts = unreplied.map((c) => {
    const faq = matchFaq(c.lastInboundText || '');
    const body = faq
      ? faq.answer
      : 'Thanks for writing in — how can we help? Classes are £10 (Tue Cafe Sol / Wed King’s Cross), social after is free.';
    const text = renderTemplate('unrepliedFollowUp', {
      firstName: c.firstName,
      body,
    });
    return store.saveDraft({
      type: 'unreplied_reply',
      recipientId: c.id,
      firstName: c.firstName || null,
      username: c.username || null,
      text,
      basedOnInbound: c.lastInboundText || '',
      faqId: faq?.id || null,
    });
  });

  return { count: drafts.length, drafts };
}

function draftEmergency({ body, withinHours = 24 * 7 } = {}) {
  if (!body) throw new Error('Emergency body text is required');
  const contacts = store.listContactsEligibleForFollowUp({ withinHours, limit: 200 });
  const drafts = contacts.map((c) => {
    const text = renderTemplate('emergency', {
      firstName: c.firstName,
      body,
    });
    return store.saveDraft({
      type: 'emergency',
      recipientId: c.id,
      firstName: c.firstName || null,
      text,
      useHumanAgentTag: withinHours > 24,
    });
  });
  return {
    count: drafts.length,
    note: 'Emergency blasts still require a prior conversation + valid messaging window. HUMAN_AGENT tag is only for human-approved sends.',
    drafts,
  };
}

/**
 * Send approved drafts with rate limiting.
 */
async function sendApprovedDrafts({ draftIds, approveAllPending = false } = {}) {
  let drafts;
  if (approveAllPending) {
    drafts = store.listPendingDrafts();
  } else if (Array.isArray(draftIds)) {
    drafts = draftIds.map((id) => store.getDraft(id)).filter(Boolean);
  } else {
    throw new Error('Provide draftIds or approveAllPending=true');
  }

  for (const d of drafts) {
    store.updateDraft(d.id, { status: 'approved' });
  }

  const results = await sendBatchPaced(
    drafts.map((d) => ({
      draftId: d.id,
      recipientId: d.recipientId,
      text: d.text,
      useHumanAgentTag: Boolean(d.useHumanAgentTag),
    })),
    async (item) => sendTextMessage(item)
  );

  for (const result of results) {
    if (result.status === 'sent') {
      store.updateDraft(result.draftId, { status: 'sent', sentAt: Date.now() });
      store.recordMessage({
        direction: 'outbound',
        recipientId: result.recipientId,
        text: result.text,
        timestamp: Date.now(),
      });
    } else if (result.status === 'error') {
      store.updateDraft(result.draftId, { status: 'error', error: result.reason });
    } else {
      store.updateDraft(result.draftId, { status: 'pending_approval', note: result.reason });
    }
  }

  return {
    limits: loadKnowledge().limits,
    results,
  };
}

async function enrichFirstName(contactId) {
  const profile = await getUserProfile(contactId);
  if (profile?.name) {
    const firstName = String(profile.name).split(/\s+/)[0];
    store.upsertContact({ id: contactId, firstName, username: profile.username });
    return firstName;
  }
  if (profile?.username) {
    store.upsertContact({ id: contactId, username: profile.username, firstName: profile.username });
    return profile.username;
  }
  return null;
}

module.exports = {
  handleInboundMessage,
  getUnreplied,
  getUnrepliedLocal,
  draftOfferMessages,
  draftUnrepliedReplies,
  draftEmergency,
  sendApprovedDrafts,
  enrichFirstName,
  listOffers,
};
