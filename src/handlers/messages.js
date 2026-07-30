/**
 * Normalize Instagram / Facebook Messenger webhook payloads into a common shape.
 * Instagram messaging uses the same envelope as Messenger (object: "instagram" or "page").
 */

/**
 * @typedef {object} IncomingMessage
 * @property {string} platform
 * @property {string} pageOrAccountId
 * @property {string} senderId
 * @property {string} [recipientId]
 * @property {number} [timestamp]
 * @property {string} [messageId]
 * @property {string} [text]
 * @property {boolean} [isEcho]
 * @property {object} raw
 */

/**
 * @param {object} body
 * @returns {IncomingMessage[]}
 */
function extractIncomingMessages(body) {
  if (!body || !Array.isArray(body.entry)) {
    return [];
  }

  const platform =
    body.object === 'instagram'
      ? 'instagram'
      : body.object === 'page'
        ? 'facebook'
        : body.object || 'unknown';

  /** @type {IncomingMessage[]} */
  const messages = [];

  for (const entry of body.entry) {
    const pageOrAccountId = entry.id;
    const messagingEvents = entry.messaging || [];

    for (const event of messagingEvents) {
      // Skip delivery/read receipts and echo messages for now
      if (!event.message || event.message.is_echo) {
        continue;
      }

      messages.push({
        platform,
        pageOrAccountId,
        senderId: event.sender?.id,
        recipientId: event.recipient?.id,
        timestamp: event.timestamp,
        messageId: event.message?.mid,
        text: event.message?.text,
        isEcho: false,
        raw: event,
      });
    }
  }

  return messages;
}

/**
 * Handle a verified webhook POST payload.
 * Extend this to persist messages, trigger AI replies, etc.
 * @param {object} body
 */
async function handleWebhookPayload(body) {
  const messages = extractIncomingMessages(body);

  if (messages.length === 0) {
    console.log('[webhook] Event received (no user text messages):', {
      object: body.object,
      entryCount: body.entry?.length ?? 0,
    });
    return { handled: 0 };
  }

  for (const msg of messages) {
    console.log('[webhook] Incoming message:', {
      platform: msg.platform,
      from: msg.senderId,
      to: msg.recipientId,
      text: msg.text,
      messageId: msg.messageId,
    });
  }

  return { handled: messages.length };
}

module.exports = {
  extractIncomingMessages,
  handleWebhookPayload,
};
