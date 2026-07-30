require('dotenv').config();

const express = require('express');
const { createWebhookRouter } = require('./routes/webhook');

const PORT = Number(process.env.PORT) || 3000;
const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN;
const APP_SECRET = process.env.META_APP_SECRET;

if (!VERIFY_TOKEN) {
  console.warn(
    '[config] META_VERIFY_TOKEN is not set. Webhook verification will fail until it is configured.'
  );
}

if (!APP_SECRET) {
  console.warn(
    '[config] META_APP_SECRET is not set. Signature verification is disabled (dev only).'
  );
}

const app = express();

app.get('/health', (_req, res) => {
  res.status(200).json({ ok: true, service: 'smartmessagingassistant' });
});

// Capture raw body for X-Hub-Signature-256 while parsing JSON
app.use(
  '/webhook',
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
  createWebhookRouter({
    verifyToken: VERIFY_TOKEN,
    appSecret: APP_SECRET,
  })
);

app.use((err, _req, res, _next) => {
  console.error('[error]', err);
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON' });
  }
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Webhook server listening on http://0.0.0.0:${PORT}`);
  console.log(`Callback path: /webhook`);
  console.log(`Health check:  /health`);
});
