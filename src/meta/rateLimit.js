/**
 * Simple rate limiter for outbound Instagram sends.
 * Default: ~200/hour => min ~18s gap; we use configured minSecondsBetweenSends.
 */

const { loadKnowledge } = require('../knowledge/faq');

const sendTimestamps = [];

function prune(now, windowMs) {
  while (sendTimestamps.length && now - sendTimestamps[0] > windowMs) {
    sendTimestamps.shift();
  }
}

function canSendNow() {
  const { maxAutoRepliesPerHour, minSecondsBetweenSends } = loadKnowledge().limits;
  const now = Date.now();
  prune(now, 60 * 60 * 1000);

  if (sendTimestamps.length >= maxAutoRepliesPerHour) {
    return {
      ok: false,
      reason: `Hourly cap reached (${maxAutoRepliesPerHour}/hour).`,
      retryAfterMs: 60 * 60 * 1000 - (now - sendTimestamps[0]),
    };
  }

  const last = sendTimestamps[sendTimestamps.length - 1];
  if (last && now - last < minSecondsBetweenSends * 1000) {
    return {
      ok: false,
      reason: `Pacing: wait ${minSecondsBetweenSends}s between sends.`,
      retryAfterMs: minSecondsBetweenSends * 1000 - (now - last),
    };
  }

  return { ok: true };
}

function markSent() {
  sendTimestamps.push(Date.now());
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Send many messages with pacing. Stops early if capped.
 * @param {Array<{ recipientId: string, text: string, useHumanAgentTag?: boolean }>} items
 * @param {(item) => Promise<any>} sendFn
 */
async function sendBatchPaced(items, sendFn) {
  const { maxBatchSend } = loadKnowledge().limits;
  const batch = items.slice(0, maxBatchSend);
  const results = [];

  for (const item of batch) {
    let gate = canSendNow();
    while (!gate.ok && gate.retryAfterMs && gate.retryAfterMs < 60_000) {
      await sleep(gate.retryAfterMs + 50);
      gate = canSendNow();
    }
    if (!gate.ok) {
      results.push({ ...item, status: 'queued_for_later', reason: gate.reason });
      continue;
    }

    try {
      const response = await sendFn(item);
      markSent();
      results.push({ ...item, status: 'sent', response });
    } catch (err) {
      results.push({
        ...item,
        status: 'error',
        reason: err.message,
        payload: err.payload,
      });
    }
  }

  return results;
}

module.exports = {
  canSendNow,
  markSent,
  sendBatchPaced,
  sleep,
};
