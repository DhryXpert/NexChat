/**
 * NexChat — Netlify Proxy Function
 * Uses only Node built-in `https` — no Node version requirements.
 */

const https = require('https');

// Wrap https.request in a clean Promise
function httpsPost(hostname, path, headers, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      { hostname, path, method: 'POST', headers },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () =>
          resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString('utf8') })
        );
        res.on('error', reject);
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const auth = event.headers['authorization'] || event.headers['Authorization'] || '';
  if (!auth) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Missing Authorization' }) };
  }

  let raw = event.body || '{}';
  if (event.isBase64Encoded) raw = Buffer.from(raw, 'base64').toString('utf8');

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Bad JSON: ' + e.message }) };
  }

  payload.stream = false;
  const bodyStr = JSON.stringify(payload);

  try {
    const result = await httpsPost(
      'integrate.api.nvidia.com',
      '/v1/chat/completions',
      {
        'Authorization': auth,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr),
      },
      bodyStr
    );

    return {
      statusCode: result.status,
      headers: { 'Content-Type': 'application/json' },
      body: result.body,
    };
  } catch (err) {
    return {
      statusCode: 502,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Network error: ' + err.message }),
    };
  }
};
