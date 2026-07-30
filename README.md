# Smart Messaging Assistant — Meta Webhook

Instagram / Facebook Messenger webhook for Meta Developer apps.

## Secrets: where they go

| Secret | Put it here | Never put it here |
|---|---|---|
| `META_VERIFY_TOKEN` | **Vercel → Settings → Environment Variables** | GitHub, chat, committed `.env` |
| `META_APP_SECRET` | **Vercel Environment Variables** | GitHub / committed files |
| Access tokens (later) | **Vercel Environment Variables** | GitHub / committed files |

## Fix 404 on Production

Vercel Production must deploy a branch that contains this code (not empty `main`).

1. Merge PR into `main`, **or** in Vercel → Settings → Git → Production Branch set to `cursor/instagram-webhook-bb04`
2. Redeploy Production
3. Open `https://YOUR_DOMAIN/health` — must return JSON, not 404

## Callback URL

```
https://YOUR_DOMAIN/webhook
```

## Local run

```bash
cp .env.example .env
npm install
npm start
```
