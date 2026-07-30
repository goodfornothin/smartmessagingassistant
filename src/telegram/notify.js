/**
 * Telegram notify + approval helpers.
 * Create a bot with @BotFather, add it to your group, set:
 *   TELEGRAM_BOT_TOKEN
 *   TELEGRAM_CHAT_ID   (group id, often starts with -)
 */

async function telegramEnabled() {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);
}

async function sendTelegramMessage(text, { parseMode } = {}) {
  if (!(await telegramEnabled())) {
    console.log('[telegram:skipped]', text.slice(0, 200));
    return { skipped: true };
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: text.slice(0, 4000),
      parse_mode: parseMode,
      disable_web_page_preview: true,
    }),
  });
  const data = await res.json();
  if (!data.ok) {
    console.error('[telegram] send failed:', data);
  }
  return data;
}

function formatDraftDigest({ title, drafts, stats }) {
  const lines = [
    `🕺 ${title}`,
    stats ? `Inbox: ${stats.unreplied} unreplied · ${stats.contacts} contacts · ${stats.pendingDrafts} pending drafts` : '',
    '',
  ].filter(Boolean);

  if (!drafts.length) {
    lines.push('Nothing to approve right now.');
    return lines.join('\n');
  }

  drafts.slice(0, 15).forEach((d, i) => {
    const who = d.firstName || d.username || d.recipientId;
    lines.push(`${i + 1}. [${d.type}] → ${who}`);
    lines.push(`   ${d.text}`);
    lines.push(`   draft: ${d.id}`);
    lines.push('');
  });

  if (drafts.length > 15) {
    lines.push(`…and ${drafts.length - 15} more drafts.`);
  }

  lines.push('Reply in Cursor/Claude: approve these drafts, or open the assistant approve API.');
  return lines.join('\n');
}

module.exports = {
  telegramEnabled,
  sendTelegramMessage,
  formatDraftDigest,
};
