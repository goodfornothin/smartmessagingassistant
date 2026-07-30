const { sendJson } = require('../../src/http/assistantAuth');
const {
  getUnreplied,
  draftUnrepliedReplies,
  draftOfferMessages,
} = require('../../src/assistant/service');
const store = require('../../src/store/inbox');
const { sendTelegramMessage, formatDraftDigest } = require('../../src/telegram/notify');

/**
 * Vercel Cron: every day at 12:00 UTC (adjust in vercel.json).
 * Secured with CRON_SECRET (Vercel sends Authorization: Bearer <CRON_SECRET>).
 */
module.exports = async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method not allowed' });
  }

  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.authorization || '';
    if (auth !== `Bearer ${cronSecret}`) {
      return sendJson(res, 401, { error: 'Unauthorized cron' });
    }
  }

  try {
    const unreplied = await getUnreplied({ limit: 25 });
    const replyDrafts = draftUnrepliedReplies({ limit: 20 });

    // Soft offer drafts only for people who messaged in last 24h and are not awaiting reply
    // (re-engage warm contacts). Default offer: Wednesdays.
    let offerDrafts = { drafts: [], count: 0 };
    try {
      offerDrafts = draftOfferMessages({ offerId: 'wednesdays', withinHours: 24 });
    } catch (err) {
      console.warn('[cron] offer draft skipped:', err.message);
    }

    const allDrafts = [...replyDrafts.drafts, ...offerDrafts.drafts];
    const digest = formatDraftDigest({
      title: 'Midday Rogue Bachata plan (needs your approval)',
      drafts: allDrafts,
      stats: store.getStats(),
    });

    await sendTelegramMessage(digest);

    sendJson(res, 200, {
      ok: true,
      unrepliedCount: unreplied.items?.length || 0,
      unrepliedSource: unreplied.source,
      draftedReplies: replyDrafts.count,
      draftedOffers: offerDrafts.count,
      message: 'Plan sent to Telegram for approval. Nothing was auto-sent.',
    });
  } catch (err) {
    sendJson(res, 500, { error: err.message });
  }
};
