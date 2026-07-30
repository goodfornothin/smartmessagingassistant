const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { isValidSignature } = require('../src/middleware/verifySignature');
const { extractIncomingMessages } = require('../src/handlers/messages');

describe('isValidSignature', () => {
  it('accepts a valid sha256 signature', () => {
    const secret = 'test_app_secret';
    const body = Buffer.from('{"object":"instagram"}');
    const digest = crypto.createHmac('sha256', secret).update(body).digest('hex');
    assert.equal(isValidSignature(body, `sha256=${digest}`, secret), true);
  });

  it('rejects an invalid signature', () => {
    const body = Buffer.from('{"object":"instagram"}');
    assert.equal(isValidSignature(body, 'sha256=deadbeef', 'secret'), false);
  });

  it('rejects missing signature when app secret is set', () => {
    const body = Buffer.from('{}');
    assert.equal(isValidSignature(body, undefined, 'secret'), false);
  });
});

describe('extractIncomingMessages', () => {
  it('extracts Instagram text messages', () => {
    const body = {
      object: 'instagram',
      entry: [
        {
          id: 'ig_account_1',
          messaging: [
            {
              sender: { id: 'user_1' },
              recipient: { id: 'ig_account_1' },
              timestamp: 1710000000,
              message: { mid: 'm1', text: 'Hello' },
            },
          ],
        },
      ],
    };

    const messages = extractIncomingMessages(body);
    assert.equal(messages.length, 1);
    assert.equal(messages[0].platform, 'instagram');
    assert.equal(messages[0].senderId, 'user_1');
    assert.equal(messages[0].text, 'Hello');
  });

  it('skips echo messages', () => {
    const body = {
      object: 'instagram',
      entry: [
        {
          id: 'ig_account_1',
          messaging: [
            {
              sender: { id: 'ig_account_1' },
              recipient: { id: 'user_1' },
              timestamp: 1710000000,
              message: { mid: 'm2', text: 'Reply', is_echo: true },
            },
          ],
        },
      ],
    };

    assert.equal(extractIncomingMessages(body).length, 0);
  });
});
