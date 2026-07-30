const express = require('express');
const { isValidSignature } = require('../middleware/verifySignature');
const { handleWebhookPayload } = require('../handlers/messages');

/**
 * @param {{ verifyToken?: string, appSecret?: string }} options
 */
function createWebhookRouter(options = {}) {
  const router = express.Router();
  const { verifyToken, appSecret } = options;

  /**
   * Meta webhook verification (GET).
   * Query params: hub.mode, hub.verify_token, hub.challenge
   */
  router.get('/', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token && verifyToken && token === verifyToken) {
      console.log('[webhook] Verification succeeded');
      return res.status(200).send(challenge);
    }

    console.warn('[webhook] Verification failed', {
      mode,
      tokenMatch: Boolean(verifyToken && token === verifyToken),
    });
    return res.sendStatus(403);
  });

  /**
   * Meta webhook event receiver (POST).
   * Always acknowledge quickly with 200 so Meta does not retry / disable the webhook.
   */
  router.post('/', async (req, res) => {
    const signature = req.get('X-Hub-Signature-256') || req.get('x-hub-signature-256');
    const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body || {}));

    if (!isValidSignature(rawBody, signature, appSecret)) {
      console.warn('[webhook] Invalid signature');
      return res.sendStatus(401);
    }

    // Respond immediately; process asynchronously
    res.status(200).send('EVENT_RECEIVED');

    try {
      await handleWebhookPayload(req.body);
    } catch (err) {
      console.error('[webhook] Failed to process payload:', err);
    }
  });

  return router;
}

module.exports = { createWebhookRouter };
