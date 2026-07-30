const { getConfig } = require('../src/lib/config');
const { isValidSignature } = require('../src/middleware/verifySignature');
const { handleWebhookPayload } = require('../src/handlers/messages');

// Keep raw body available for Meta X-Hub-Signature-256 checks
module.exports.config = {
  api: {
    bodyParser: false,
  },
};

/**
 * @param {import('http').IncomingMessage} req
 * @returns {Promise<Buffer>}
 */
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

    console.warn('[webhook] Verification failed', {
      mode,
      tokenMatch: Boolean(verifyToken && token === verifyToken),
    });
    res.statusCode = 403;
    res.end('Forbidden');
    return;
  }

  if (req.method === 'POST') {
    let rawBody;
    try {
      rawBody = await readRawBody(req);
    } catch (err) {
      console.error('[webhook] Failed to read body:', err);
      res.statusCode = 400;
      res.end('Bad Request');
      return;
    }

    const signature =
      req.headers['x-hub-signature-256'] || req.headers['X-Hub-Signature-256'];

    if (!isValidSignature(rawBody, signature, appSecret)) {
      console.warn('[webhook] Invalid signature');
      res.statusCode = 401;
      res.end('Unauthorized');
      return;
    }

    let body = {};
    if (rawBody.length > 0) {
      try {
        body = JSON.parse(rawBody.toString('utf8'));
      } catch (err) {
        console.error('[webhook] Invalid JSON:', err);
        res.statusCode = 400;
        res.end('Invalid JSON');
        return;
      }
    }

    // Acknowledge immediately so Meta does not retry
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/plain');
    res.end('EVENT_RECEIVED');

    try {
      await handleWebhookPayload(body);
    } catch (err) {
      console.error('[webhook] Failed to process payload:', err);
    }
    return;
  }

  res.statusCode = 405;
  res.setHeader('Allow', 'GET, POST');
  res.end('Method Not Allowed');
};
