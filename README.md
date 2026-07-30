# Smart Messaging Assistant — Meta Webhook

Instagram / Facebook Messenger webhook for Meta Developer apps.

## Secrets: where they go

| Secret | Put it here | Never put it here |
|---|---|---|
| `META_VERIFY_TOKEN` | **Vercel → Project → Settings → Environment Variables** | GitHub, chat, screenshots, committed `.env` |
| `META_APP_SECRET` | **Vercel Environment Variables** | GitHub / committed files |
| `META_PAGE_ACCESS_TOKEN` (later) | **Vercel Environment Variables** | GitHub / committed files |

- `.env` is for **local only** and is gitignored.
- `.env.example` has placeholder names only — safe to commit.
- GitHub secrets are **not** needed for this webhook unless you add CI that deploys with them.

## Deploy on Vercel (exact path)

1. Push this branch / merge to `main`.
2. Go to [vercel.com](https://vercel.com) → **Add New… → Project** → import `smartmessagingassistant`.
3. Framework Preset: **Other**. Leave build/output defaults.
4. **Before** first deploy, open **Environment Variables** and add:

   - `META_VERIFY_TOKEN` = a long random string you invent (same value you will paste into Meta)
   - `META_APP_SECRET` = from Meta Developer → App settings → Basic → App Secret

   Apply to **Production** (and Preview if you want).

5. Deploy. Your URLs will look like:
   - App: `https://YOUR_PROJECT.vercel.app`
   - **Callback URL:** `https://YOUR_PROJECT.vercel.app/webhook`
   - Health: `https://YOUR_PROJECT.vercel.app/health`

## Wire Meta webhooks

1. [developers.facebook.com](https://developers.facebook.com) → your app.
2. Add **Webhooks** (or open Instagram / Messenger product → Webhooks).
3. Callback URL: `https://YOUR_PROJECT.vercel.app/webhook`
4. Verify token: **exactly** the same as `META_VERIFY_TOKEN` in Vercel.
5. Verify and save.
6. Subscribe to field **`messages`** (and others only if you need them).
7. Make sure your Instagram professional account / Facebook Page is connected to the app.

## Local run

```bash
cp .env.example .env
# set META_VERIFY_TOKEN and META_APP_SECRET
npm install
npm start
```
