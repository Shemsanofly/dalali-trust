'use strict';
require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const db = require('../config/db');

const app = express();

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ── DB connection (cached across warm invocations) ──────────────────────────
let dbConnected = false;
app.use(async (req, res, next) => {
    if (!dbConnected) {
        try {
            await db.connect();
            dbConnected = true;
        } catch (err) {
            console.error('[Vercel] DB connection failed:', err.message);
            return res.status(500).json({ error: 'Database connection failed' });
        }
    }
    next();
});

// ── API Routes (prefixed with /api) ─────────────────────────────────────────
app.use('/api/auth', require('../routes/auth'));
app.use('/api/kyc', require('../routes/kyc'));
app.use('/api/payments', require('../routes/payments'));
app.use('/api/voice', require('../routes/voice'));
app.use('/api/voicebot', require('../routes/voicebot'));
app.use('/api/airtime', require('../routes/airtime'));
app.use('/api/properties', require('../routes/properties'));

// ── AT Webhook Routes (root paths for Africa's Talking callbacks) ────────────
app.use('/ussd', require('../routes/ussd'));
app.use('/payments', require('../routes/payments'));
app.use('/voice', require('../routes/voice'));
app.use('/voicebot', require('../routes/voicebot'));

// ── Global error handler ────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
    console.error('[Unhandled Error]', err.message);
    res.status(500).json({ error: 'An unexpected error occurred.' });
});

// ── Export for Vercel Serverless Function ─────────────────────────────────────
module.exports = app;
