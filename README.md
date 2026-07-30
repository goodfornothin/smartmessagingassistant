# Smart Messaging Assistant — Meta Webhook

Instagram / Facebook Messenger webhook for Meta Developer apps.

## Callback URL

After the server is publicly reachable over HTTPS:

```
https://YOUR_PUBLIC_HOST/webhook
```

Use that value in Meta Developer → App → Webhooks → Callback URL.

## Required Meta configuration

Set these in `.env` (copy from `.env.example`):

| Variable | Where to get it |
|---|---|
| `META_VERIFY_TOKEN` | Any secret string you choose — must match the Verify Token field in Meta webhooks |
| `META_APP_SECRET` | Meta Developer → App settings → Basic → App Secret |
| `META_PAGE_ACCESS_TOKEN` | (Optional for receive-only) token for sending replies later |

In the Meta app, subscribe the Instagram (or Page) webhook to at least:

- `messages`
- `messaging_postbacks` (optional)
- `message_reactions` (optional)

## Local run

```bash
cp .env.example .env
# edit META_VERIFY_TOKEN and META_APP_SECRET
npm install
npm start
```

Health check: `GET /health`  
Webhook: `GET|POST /webhook`

## Verify handshake

Meta sends:

`GET /webhook?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=123`

This server returns `123` with HTTP 200 when the token matches.
