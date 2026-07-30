function requireAssistantAuth(req, res) {
  const expected = process.env.ASSISTANT_API_KEY;
  if (!expected) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'ASSISTANT_API_KEY is not configured on the server' }));
    return false;
  }

  const header = req.headers.authorization || '';
  const keyHeader = req.headers['x-assistant-key'];
  const token = header.startsWith('Bearer ') ? header.slice(7) : keyHeader;

  if (!token || token !== expected) {
    res.statusCode = 401;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Unauthorized' }));
    return false;
  }
  return true;
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload, null, 2));
}

module.exports = {
  requireAssistantAuth,
  readJsonBody,
  sendJson,
};
