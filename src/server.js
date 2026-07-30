require('dotenv').config();

const http = require('http');
const { URL } = require('url');

const rootHandler = require('../api/index');
const healthHandler = require('../api/health');
const webhookHandler = require('../api/webhook');
const unrepliedHandler = require('../api/assistant/unreplied');
const draftHandler = require('../api/assistant/draft');
const approveHandler = require('../api/assistant/approve');
const middayHandler = require('../api/cron/midday');

const PORT = Number(process.env.PORT) || 3000;

const routes = [
  ['/health', healthHandler],
  ['/api/health', healthHandler],
  ['/webhook', webhookHandler],
  ['/api/webhook', webhookHandler],
  ['/assistant/unreplied', unrepliedHandler],
  ['/api/assistant/unreplied', unrepliedHandler],
  ['/assistant/draft', draftHandler],
  ['/api/assistant/draft', draftHandler],
  ['/assistant/approve', approveHandler],
  ['/api/assistant/approve', approveHandler],
  ['/cron/midday', middayHandler],
  ['/api/cron/midday', middayHandler],
  ['/', rootHandler],
  ['/api', rootHandler],
];

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const path = url.pathname;
    const match = routes.find(([routePath]) => routePath === path);
    if (!match) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Not found' }));
      return;
    }
    req.url = `${path}${url.search}`;
    await match[1](req, res);
  } catch (err) {
    console.error('[error]', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Internal server error' }));
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Rogue assistant listening on http://0.0.0.0:${PORT}`);
});
