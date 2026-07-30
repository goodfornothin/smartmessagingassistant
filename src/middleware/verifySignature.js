const crypto = require('crypto');

/**
 * Validate Meta's X-Hub-Signature-256 header against the raw body.
 * @param {Buffer|string} rawBody
 * @param {string|undefined} signatureHeader
 * @param {string} appSecret
 * @returns {boolean}
 */
function isValidSignature(rawBody, signatureHeader, appSecret) {
  if (!appSecret) {
    return process.env.NODE_ENV !== 'production';
  }

  if (!signatureHeader || !signatureHeader.startsWith('sha256=')) {
    return false;
  }

  const expected = crypto
    .createHmac('sha256', appSecret)
    .update(rawBody)
    .digest('hex');

  const received = signatureHeader.slice('sha256='.length);
  const expectedBuf = Buffer.from(expected, 'utf8');
  const receivedBuf = Buffer.from(received, 'utf8');

  if (expectedBuf.length !== receivedBuf.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuf, receivedBuf);
}

module.exports = { isValidSignature };
