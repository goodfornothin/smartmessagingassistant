/**
 * In-memory + optional JSON file contact/message store.
 * On Vercel, prefer Instagram Conversations API as source of truth;
 * this store captures webhook events while the function instance is warm
 * and supports local/dev persistence via DATA_DIR.
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const STORE_PATH = path.join(DATA_DIR, 'inbox-store.json');

/** @type {{ contacts: Record<string, object>, messages: object[], drafts: object[] }} */
let state = {
  contacts: {},
  messages: [],
  drafts: [],
};

function ensureLoaded() {
  if (ensureLoaded.done) return;
  ensureLoaded.done = true;
  try {
    if (fs.existsSync(STORE_PATH)) {
      state = JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'));
      state.contacts = state.contacts || {};
      state.messages = state.messages || [];
      state.drafts = state.drafts || [];
    }
  } catch (err) {
    console.warn('[store] Could not load store file:', err.message);
  }
}

function persist() {
  if (process.env.VERCEL) {
    // Ephemeral filesystem on serverless — skip disk writes
    return;
  }
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(STORE_PATH, JSON.stringify(state, null, 2));
  } catch (err) {
    console.warn('[store] Could not persist store:', err.message);
  }
}

function upsertContact(partial) {
  ensureLoaded();
  const id = partial.id;
  if (!id) return null;
  const existing = state.contacts[id] || { id, createdAt: Date.now() };
  state.contacts[id] = {
    ...existing,
    ...partial,
    updatedAt: Date.now(),
  };
  persist();
  return state.contacts[id];
}

function recordMessage(msg) {
  ensureLoaded();
  state.messages.push({
    ...msg,
    recordedAt: Date.now(),
  });
  // Keep last 2000 messages in memory
  if (state.messages.length > 2000) {
    state.messages = state.messages.slice(-2000);
  }

  if (msg.direction === 'inbound') {
    upsertContact({
      id: msg.senderId,
      lastInboundAt: msg.timestamp || Date.now(),
      lastInboundText: msg.text || '',
      awaitingReply: true,
      firstName: msg.firstName || undefined,
      username: msg.username || undefined,
    });
  } else if (msg.direction === 'outbound') {
    upsertContact({
      id: msg.recipientId,
      lastOutboundAt: msg.timestamp || Date.now(),
      awaitingReply: false,
    });
  }

  persist();
}

function listUnreplied({ limit = 50 } = {}) {
  ensureLoaded();
  return Object.values(state.contacts)
    .filter((c) => c.awaitingReply)
    .sort((a, b) => (b.lastInboundAt || 0) - (a.lastInboundAt || 0))
    .slice(0, limit);
}

function listContactsEligibleForFollowUp({ withinHours = 24, limit = 100 } = {}) {
  ensureLoaded();
  const cutoff = Date.now() - withinHours * 60 * 60 * 1000;
  return Object.values(state.contacts)
    .filter((c) => c.lastInboundAt && c.lastInboundAt >= cutoff)
    .sort((a, b) => (b.lastInboundAt || 0) - (a.lastInboundAt || 0))
    .slice(0, limit);
}

function saveDraft(draft) {
  ensureLoaded();
  const item = {
    id: `draft_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    status: 'pending_approval',
    createdAt: Date.now(),
    ...draft,
  };
  state.drafts.push(item);
  persist();
  return item;
}

function listPendingDrafts() {
  ensureLoaded();
  return state.drafts.filter((d) => d.status === 'pending_approval');
}

function updateDraft(id, patch) {
  ensureLoaded();
  const draft = state.drafts.find((d) => d.id === id);
  if (!draft) return null;
  Object.assign(draft, patch, { updatedAt: Date.now() });
  persist();
  return draft;
}

function getDraft(id) {
  ensureLoaded();
  return state.drafts.find((d) => d.id === id) || null;
}

function getStats() {
  ensureLoaded();
  return {
    contacts: Object.keys(state.contacts).length,
    unreplied: listUnreplied({ limit: 10000 }).length,
    messages: state.messages.length,
    pendingDrafts: listPendingDrafts().length,
  };
}

module.exports = {
  upsertContact,
  recordMessage,
  listUnreplied,
  listContactsEligibleForFollowUp,
  saveDraft,
  listPendingDrafts,
  updateDraft,
  getDraft,
  getStats,
};
