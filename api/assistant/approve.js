const {
  requireAssistantAuth,
  readJsonBody,
  sendJson,
} = require('../../src/http/assistantAuth');
const { sendApprovedDrafts } = require('../../src/assistant/service');
const { sendTelegramMessage } = require('../../src/telegram/notify');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method not allowed' });
  }
  if (!requireAssistantAuth(req, res)) return;

  try {
    const body = await readJsonBody(req);
    const result = await sendApprovedDrafts({
      draftIds: body.draftIds,
      approveAllPending: Boolean(body.approveAllPending),
    });

    const sent = result.results.filter((r) => r.status === 'sent').length;
    const errors = result.results.filter((r) => r.status === 'error').length;
    const deferred = result.results.filter((r) => r.status === 'queued_for_later').length;

    await sendTelegramMessage(
      `✅ Send run finished\nSent: ${sent}\nErrors: ${errors}\nDeferred (rate limit): ${deferred}`
    );

    sendJson(res, 200, { ok: true, ...result });
  } catch (err) {
    sendJson(res, 400, { error: err.message });
  }
};
