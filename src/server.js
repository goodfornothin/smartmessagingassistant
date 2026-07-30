require('dotenv').config();

const http = require('http');
const { URL } = require('url');

const rootHandler = require('../api/index');
const healthHandler = require('../api/health');
const webhookHandler = require('../api/webhook');

const PORT = Number(process.env.PORT) || 3000;

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const path = url.pathname;

    if (path === '/health' || path === '/api/health') {
      return healthHandler(req, res);
    }

    if (path === '/webhook' || path === '/api/webhook') {
      // Preserve query string for Meta verification
      req.url = `${path}${url.search}`;
      return webhookHandler(req, res);
    }

    if (path === '/' || path === '/api') {
      return rootHandler(req, res);
    }

    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Not found' }));
  } catch (err) {
    console.error('[error]', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Internal server error' }));
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Webhook server listening on http://0.0.0.0:${PORT}`);
  console.log(`Callback path: /webhook`);
  console.log(`Health check:  /health`);
});
