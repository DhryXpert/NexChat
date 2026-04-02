/**
 * NexChat — Proxy Server
 *
 * WHY THIS EXISTS:
 * Browsers enforce CORS — they block fetch() calls to external APIs
 * that don't explicitly allow browser requests. NVIDIA's API is
 * designed for server-side use and doesn't set CORS headers.
 *
 * This server:
 *  1. Serves your static files (index.html, css, js, assets)
 *  2. Proxies /api/* → https://integrate.api.nvidia.com/v1/*
 *     so the browser talks to localhost (same origin = no CORS issue)
 *
 * Usage:
 *   npm install   (first time only)
 *   npm start     (then open http://localhost:3000)
 */

const express = require('express');
const https = require('https');
const path = require('path');

const app = express();
const PORT = 3000;
const NVIDIA_HOST = 'integrate.api.nvidia.com';
const NVIDIA_BASE = '/v1';

// ── Serve static files from project root ──────────────────────────────────
app.use(express.static(path.join(__dirname)));

// ── Proxy: POST /api/chat/completions → NVIDIA ────────────────────────────
app.post('/api/chat/completions', (req, res) => {
  // Grab the Authorization header from the browser request
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ error: 'Missing Authorization header' });
  }

  // Collect the raw request body
  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', () => {
    const options = {
      hostname: NVIDIA_HOST,
      path: `${NVIDIA_BASE}/chat/completions`,
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const proxyReq = https.request(options, (proxyRes) => {
      // Forward status & headers back to browser
      res.writeHead(proxyRes.statusCode, {
        'Content-Type': proxyRes.headers['content-type'] || 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Transfer-Encoding': 'chunked',
      });

      // Stream response directly to browser
      proxyRes.on('data', chunk => res.write(chunk));
      proxyRes.on('end', () => res.end());
    });

    proxyReq.on('error', (err) => {
      console.error('[Proxy Error]', err.message);
      if (!res.headersSent) {
        res.status(502).json({ error: 'Proxy error: ' + err.message });
      }
    });

    proxyReq.write(body);
    proxyReq.end();
  });
});

// ── Start ─────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('');
  console.log('  ╔══════════════════════════════════════╗');
  console.log('  ║   NexChat is running!                ║');
  console.log(`  ║   → http://localhost:${PORT}           ║`);
  console.log('  ╚══════════════════════════════════════╝');
  console.log('');
  console.log('  Press Ctrl+C to stop.\n');
});
