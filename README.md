# Rogue Bachata Smart Messaging Assistant

Instagram DM assistant for Rogue Bachata — FAQ replies, unreplied inbox, offer drafts, Telegram approval, midday plan.

## Important Instagram rule (non-negotiable)

Meta **does not allow** cold DMs to followers who never messaged you.
This app only messages people who already started a conversation (24h window, or human-approved follow-ups within policy).

What you *can* do:
- See who messaged and still needs a reply
- Draft FAQ / offer / emergency messages with first name when available
- Approve in Telegram / Cursor, then send with rate limits
- Get a midday plan on Telegram every day at 12:00 UTC

## Live URLs

- Health: `https://smartmessagingassistant.vercel.app/health`
- Meta webhook: `https://smartmessagingassistant.vercel.app/webhook`
- Who unreplied: `GET /assistant/unreplied`
- Draft messages: `POST /assistant/draft`
- Approve & send: `POST /assistant/approve`
- Midday cron: `GET /api/cron/midday`

## Secrets (Vercel only — never GitHub)

| Variable | Purpose |
|---|---|
| `META_VERIFY_TOKEN` | Webhook verify |
| `META_APP_SECRET` | Signature check |
| `META_PAGE_ACCESS_TOKEN` | Send / read conversations |
| `INSTAGRAM_BUSINESS_ACCOUNT_ID` | Your IG pro account id |
| `ASSISTANT_API_KEY` | Cursor/Claude command auth |
| `TELEGRAM_BOT_TOKEN` | Bot from @BotFather |
| `TELEGRAM_CHAT_ID` | Your approval group |
| `CRON_SECRET` | Protect midday job |

## Cursor / Claude examples

After secrets are set, ask:

- “Who have we not responded to?”
- “Draft replies for unreplied people using FAQs”
- “Draft Wednesday offer messages for people who wrote us in the last 24 hours”
- “Send an emergency notice to recent contacts: [text]”
- “Approve and send the pending drafts”

## Telegram setup (simple)

1. Message `@BotFather` → create a bot → copy token → `TELEGRAM_BOT_TOKEN`
2. Create a private Telegram group, add the bot
3. Get the group chat id → `TELEGRAM_CHAT_ID`
4. Redeploy Vercel

Midday cron drafts a plan and sends it to that group. Nothing sends to Instagram until you approve.

## Knowledge source

FAQs/offers live in `knowledge/rogue-bachata.json` (imported from `test-rogue-plan` / roguebachata.com).
