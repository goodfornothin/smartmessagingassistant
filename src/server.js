const { app } = require('./app');

const PORT = Number(process.env.PORT) || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Webhook server listening on http://0.0.0.0:${PORT}`);
  console.log(`Callback path: /webhook`);
  console.log(`Health check:  /health`);
});
