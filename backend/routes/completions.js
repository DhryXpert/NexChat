const express = require('express');
const https = require('https');
const router = express.Router();

const NVIDIA_HOST = 'integrate.api.nvidia.com';
const NVIDIA_PATH = '/v1/chat/completions';

router.post('/completions', (req, res) => {
  const apiKey = process.env.NVIDIA_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ 
      error: 'NVIDIA_API_KEY not configured on server' 
    });
  }

  const payload = {
    model: req.body.model || 'google/gemma-2-2b-it',
    messages: req.body.messages || [],
    temperature: req.body.temperature ?? 0.2,
    top_p: req.body.top_p ?? 0.7,
    max_tokens: req.body.max_tokens ?? 1024,
    stream: true,
  };

  const bodyStr = JSON.stringify(payload);

  const options = {
    hostname: NVIDIA_HOST,
    path: NVIDIA_PATH,
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
      'Content-Length': Buffer.byteLength(bodyStr),
    },
  };

  const proxyReq = https.request(options, (proxyRes) => {
    // Set SSE headers
    res.writeHead(proxyRes.statusCode, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable buffering on Render/Nginx
    });

    // Stream response chunks directly to the client
    proxyRes.on('data', (chunk) => res.write(chunk));
    proxyRes.on('end', () => res.end());
    proxyRes.on('error', (err) => {
      console.error('[Proxy] Response stream error:', err.message);
      res.end();
    });
  });

  proxyReq.on('error', (err) => {
    console.error('[Proxy] Request error:', err.message);
    if (!res.headersSent) {
      res.status(502).json({ error: 'Proxy error: ' + err.message });
    }
  });
  req.on('close', () => {
    proxyReq.destroy();
  });

  proxyReq.write(bodyStr);
  proxyReq.end();
});

module.exports = router;
