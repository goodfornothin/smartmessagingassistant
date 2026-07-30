const { requireAssistantAuth, sendJson } = require('../../src/http/assistantAuth');
const { getUnreplied } = require('../../src/assistant/service');
const store = require('../../src/store/inbox');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return sendJson(res, 405, { error: 'Method not allowed' });
  }
  if (!requireAssistantAuth(req, res)) return;

  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const limit = Number(url.searchParams.get('limit') || 25);
    const unreplied = await getUnreplied({ limit });
    sendJson(res, 200, {
      ok: true,
      stats: store.getStats(),
      unreplied,
      howToUse:
        'Ask Cursor: draft replies for these unreplied people, then approve and send within Instagram limits.',
    });
  } catch (err) {
    sendJson(res, 500, { error: err.message });
  }
};
