'use strict';
require('dotenv').config();

// ── Env guard ───────────────────────────────────────────────────────────────
const REQUIRED_ENV = ['AT_API_KEY', 'AT_USERNAME'];
const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missing.length) {
  console.warn(`[WARN] Missing env vars: ${missing.join(', ')} — some features unavailable.`);
}

const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const db = require('./config/db');

const app = express();

// ── Middleware ───────────────────────────────────────────────────────────────
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ── API Routes ──────────────────────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/invest', require('./routes/invest'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/payments', require('./routes/sms')); // topup + b2b
app.use('/api/voice', require('./routes/voice'));
app.use('/api/voicebot', require('./routes/voicebot'));
app.use('/api/airtime', require('./routes/airtime'));
app.use('/api/kyc', require('./routes/kyc'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/properties', require('./routes/properties'));
app.use('/api/analytics', require('./routes/analytics'));

// ── AT Webhook Routes (root paths for Africa's Talking callbacks) ───────────
app.use('/ussd', require('./routes/ussd'));
app.use('/sms', require('./routes/sms'));      // 2-way SMS inbound
app.use('/payments', require('./routes/payments'));
app.use('/voice', require('./routes/voice'));
app.use('/voicebot', require('./routes/voicebot'));

// ── Serve React build in production ─────────────────────────────────────────
const clientDist = path.join(__dirname, 'client', 'dist');
app.use(express.static(clientDist));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/ussd') ||
    req.path.startsWith('/sms') || req.path.startsWith('/payments') || req.path.startsWith('/voice')) {
    return next();
  }
  res.sendFile(path.join(clientDist, 'index.html'), (err) => {
    if (err) next();
  });
});

// ── Global error handler ────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('[Unhandled Error]', err.message, err.stack);
  res.status(500).json({ error: 'An unexpected error occurred.' });
});

// ── Start server ────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
db.connect().then(() => {
  app.listen(PORT, () => {
    console.log(`\n🏪  SahaShares running on http://localhost:${PORT}`);
    console.log(`📡  ngrok BASE_URL: ${process.env.BASE_URL || '(not set)'}`);
    console.log(`📲  AT username: ${process.env.AT_USERNAME}`);
    console.log(`⚛️   React dev: http://localhost:5173 (run: cd client && npm run dev)\n`);
  });
}).catch((err) => {
  console.error('[FATAL] Could not connect to database:', err.message);
  process.exit(1);
});
