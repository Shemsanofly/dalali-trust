'use strict';
const express = require('express');
const router = express.Router();
const ussdService = require('../services/ussdService');

// Normalize phone from AT to E164 (+255...) so it matches what's stored in DB
function toE164(phone) {
    if (!phone) return phone;
    const clean = String(phone).replace(/\s+/g, '');
    if (clean.startsWith('+')) return clean;
    if (clean.startsWith('0')) return '+255' + clean.slice(1);
    if (clean.startsWith('255')) return '+' + clean;
    return '+255' + clean;
}

router.post('/', async (req, res) => {
    try {
        const { sessionId, serviceCode, phoneNumber: rawPhone, text } = req.body;
        const phoneNumber = toE164(rawPhone);
        const { prefix, body } = await ussdService.handleSession({ sessionId, serviceCode, phoneNumber, text });
        res.set('Content-Type', 'text/plain');
        res.send(`${prefix} ${body}`);
    } catch (err) {
        console.error('[USSD Route]', err.message);
        res.set('Content-Type', 'text/plain');
        res.send('END Samahani, kuna hitilafu. Tafadhali jaribu tena.');
    }
});

module.exports = router;
