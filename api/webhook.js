const { getConfig } = require('../src/lib/config');
const { isValidSignature } = require('../src/middleware/verifySignature');
const { extractIncomingMessages } = require('../src/handlers/messages');
const { handleInboundMessage } = require('../src/assistant/service');
const { sendTelegramMessage } = require('../src/telegram/notify');

module.exports.config = {
  api: {
    bodyParser: false,
  },
};

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

module.exports = async function handler(req, res) {
  const { verifyToken, appSecret } = getConfig();

  if (req.method === 'GET') {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    if (mode === 'subscribe' && token && verifyToken && token === verifyToken) {
      console.log('[webhook] Verification succeeded');
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/plain');
      res.end(challenge || '');
      return;
    }

    res.statusCode = 403;
    res.end('Forbidden');
    return;
  }

  if (req.method === 'POST') {
    let rawBody;
    try {
      rawBody = await readRawBody(req);
    } catch (err) {
      res.statusCode = 400;
      res.end('Bad Request');
      return;
    }

    const signature =
      req.headers['x-hub-signature-256'] || req.headers['X-Hub-Signature-256'];

    if (!isValidSignature(rawBody, signature, appSecret)) {
      res.statusCode = 401;
      res.end('Unauthorized');
      return;
    }

    let body = {};
    if (rawBody.length > 0) {
      try {
        body = JSON.parse(rawBody.toString('utf8'));
      } catch (_err) {
        res.statusCode = 400;
        res.end('Invalid JSON');
        return;
      }
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/plain');
    res.end('EVENT_RECEIVED');

    try {
      const messages = extractIncomingMessages(body);
      for (const msg of messages) {
        const result = await handleInboundMessage(msg);
        const faqLine = result.faqSuggestion
          ? `\nSuggested FAQ reply (${result.faqSuggestion.faqId}): ${result.faqSuggestion.draftReply}`
          : '\nNo FAQ match — needs a human draft.';

        await sendTelegramMessage(
          `📩 New Instagram DM from ${msg.senderId}\n"${msg.text || '(no text)'}"${faqLine}`
        );
      }
    } catch (err) {
      console.error('[webhook] Failed to process payload:', err);
    }
    return;
  }

  res.statusCode = 405;
  res.setHeader('Allow', 'GET, POST');
  res.end('Method Not Allowed');
};
