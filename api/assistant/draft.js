const {
  requireAssistantAuth,
  readJsonBody,
  sendJson,
} = require('../../src/http/assistantAuth');
const {
  draftOfferMessages,
  draftUnrepliedReplies,
  draftEmergency,
  listOffers,
} = require('../../src/assistant/service');
const { sendTelegramMessage, formatDraftDigest } = require('../../src/telegram/notify');
const store = require('../../src/store/inbox');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method not allowed' });
  }
  if (!requireAssistantAuth(req, res)) return;

  try {
    const body = await readJsonBody(req);
    const action = body.action || 'unreplied';

    let result;
    if (action === 'unreplied') {
      result = draftUnrepliedReplies({ limit: body.limit || 20 });
    } else if (action === 'offer') {
      result = draftOfferMessages({
        offerId: body.offerId,
        contactIds: body.contactIds,
        withinHours: body.withinHours || 24,
      });
    } else if (action === 'emergency') {
      result = draftEmergency({
        body: body.body,
        withinHours: body.withinHours || 24 * 7,
      });
    } else if (action === 'list_offers') {
      return sendJson(res, 200, { ok: true, offers: listOffers() });
    } else {
      return sendJson(res, 400, {
        error: 'Unknown action. Use unreplied | offer | emergency | list_offers',
      });
    }

    const digest = formatDraftDigest({
      title: `Drafts ready for approval (${action})`,
      drafts: result.drafts || [],
      stats: store.getStats(),
    });
    await sendTelegramMessage(digest);

    sendJson(res, 200, { ok: true, ...result });
  } catch (err) {
    sendJson(res, 400, { error: err.message });
  }
};
