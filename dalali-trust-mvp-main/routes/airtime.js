'use strict';
const express = require('express');
const router = express.Router();
const airtimeService = require('../services/airtimeService');

function toE164(phone) {
    if (!phone) return phone;
    const clean = String(phone).replace(/\s+/g, '');
    if (clean.startsWith('+')) return clean;
    if (clean.startsWith('0')) return '+255' + clean.slice(1);
    if (clean.startsWith('255')) return '+' + clean;
    return '+255' + clean;
}

// POST /airtime/dividend — send micro-dividend as airtime
router.post('/dividend', async (req, res) => {
    try {
        const { phoneNumber, amountPesa } = req.body;
        if (!phoneNumber || !amountPesa) {
            return res.status(400).json({ error: 'phoneNumber and amountPesa required.' });
        }
        const result = await airtimeService.sendAirtimeDividend(toE164(phoneNumber), amountPesa);
        res.json(result);
    } catch (err) {
        console.error('[Airtime]', err.message);
        res.status(500).json({ error: 'Airtime send failed.' });
    }
});

module.exports = router;
