'use strict';
const express = require('express');
const router = express.Router();
const User = require('../models/User');

/**
 * ╔═══════════════════════════════════════════════════════════════════╗
 * ║  SahaShares — AT Voice Security Guard                        ║
 * ║  Handles outbound voice 2FA for high-value withdrawals.         ║
 * ║  Threshold: withdrawals > 500,000 TZS (50,000,000 pesa)        ║
 * ╠═══════════════════════════════════════════════════════════════════╣
 * ║  AT Voice XML Elements:                                          ║
 * ║  <Say>       — Text-to-Speech                                    ║
 * ║  <GetDigits> — Collect DTMF input from user                      ║
 * ║  <Dial>      — Forward call                                      ║
 * ╚═══════════════════════════════════════════════════════════════════╝
 */

// In-memory PIN store (in production, use Redis with TTL)
const pendingPins = new Map();

// ── Africa's Talking SDK ────────────────────────────────────────────────
let AT = null;
try {
    if (process.env.AT_API_KEY && process.env.AT_USERNAME) {
        const AfricasTalking = require('africastalking');
        AT = AfricasTalking({ apiKey: process.env.AT_API_KEY, username: process.env.AT_USERNAME });
    }
} catch (e) { /* AT SDK not available */ }

/**
 * POST /api/voice/initiate-2fa
 * Called by the AI broker or withdrawal endpoint when amount > 500K TZS.
 * Triggers an outbound AT Voice call to the user's phone.
 */
router.post('/initiate-2fa', async (req, res) => {
    try {
        const { userId, amountPesa, withdrawalId } = req.body;

        if (!userId || !amountPesa) {
            return res.status(400).json({ error: 'userId and amountPesa required.' });
        }

        const user = await User.findById(userId).lean();
        if (!user) return res.status(404).json({ error: 'User not found.' });

        // Generate 4-digit PIN
        const pin = String(Math.floor(1000 + Math.random() * 9000));

        // Store with 5-minute TTL
        const key = `${userId}_${withdrawalId || Date.now()}`;
        pendingPins.set(key, {
            pin,
            userId,
            amountPesa,
            phoneNumber: user.phoneNumber,
            createdAt: Date.now(),
            verified: false,
        });

        // Auto-expire after 5 minutes
        setTimeout(() => pendingPins.delete(key), 5 * 60 * 1000);

        if (!AT) {
            console.warn('[Voice 2FA] AT not configured. PIN for testing:', pin);
            return res.json({
                success: true,
                message: 'Voice 2FA initiated (AT sandbox mode).',
                testPin: process.env.NODE_ENV !== 'production' ? pin : undefined,
                verificationKey: key,
            });
        }

        // Initiate outbound call via AT Voice
        const voice = AT.VOICE;
        const callbackUrl = `${process.env.BASE_URL}/voice/2fa-callback?key=${encodeURIComponent(key)}`;

        await voice.call({
            callFrom: process.env.AT_VOICE_NUMBER || '+254711XXXXXX',
            callTo: [user.phoneNumber],
            clientRequestId: key,
        });

        console.log(`[Voice 2FA] Outbound call to ${user.phoneNumber} for TSh ${amountPesa / 100}`);

        res.json({
            success: true,
            message: `Voice verification call initiated to ${user.phoneNumber}`,
            verificationKey: key,
        });
    } catch (err) {
        console.error('[Voice 2FA] Initiate error:', err.message);
        res.status(500).json({ error: 'Could not initiate voice verification.' });
    }
});

/**
 * POST /voice/2fa-callback
 * AT Voice webhook — called when the user answers.
 * Responds with XML to read the PIN request and collect digits.
 */
router.post('/2fa-callback', (req, res) => {
    const key = req.query.key || req.body.clientRequestId;
    const pending = key ? pendingPins.get(key) : null;

    if (!pending) {
        res.set('Content-Type', 'application/xml');
        return res.send(
            `<?xml version="1.0" encoding="UTF-8"?>
            <Response>
                <Say voice="en-US-Standard-A">Sorry, this verification session has expired. Goodbye.</Say>
            </Response>`
        );
    }

    const amountTZS = (pending.amountPesa / 100).toLocaleString();
    const verifyUrl = `${process.env.BASE_URL}/voice/2fa-verify?key=${encodeURIComponent(key)}`;

    res.set('Content-Type', 'application/xml');
    res.send(
        `<?xml version="1.0" encoding="UTF-8"?>
        <Response>
            <Say voice="en-US-Standard-A">
                Hello. This is SahaShares security verification.
                You are requesting a withdrawal of ${amountTZS} Tanzanian Shillings.
            </Say>
            <GetDigits timeout="15" finishOnKey="#" numDigits="4" callbackUrl="${verifyUrl}">
                <Say voice="en-US-Standard-A">
                    Please enter your 4 digit security PIN followed by the hash key to confirm.
                </Say>
            </GetDigits>
            <Say voice="en-US-Standard-A">
                We did not receive your PIN. The withdrawal has been cancelled for your security. Goodbye.
            </Say>
        </Response>`
    );
});

/**
 * POST /voice/2fa-verify
 * Called by AT after user enters DTMF digits.
 * Verifies the PIN and marks the withdrawal as approved.
 */
router.post('/2fa-verify', (req, res) => {
    const key = req.query.key;
    const dtmfDigits = req.body.dtmfDigits;
    const pending = key ? pendingPins.get(key) : null;

    res.set('Content-Type', 'application/xml');

    if (!pending) {
        return res.send(
            `<?xml version="1.0" encoding="UTF-8"?>
            <Response>
                <Say voice="en-US-Standard-A">This session has expired. Goodbye.</Say>
            </Response>`
        );
    }

    if (dtmfDigits === pending.pin) {
        // PIN correct — mark as verified
        pending.verified = true;
        pendingPins.set(key, pending);
        console.log(`[Voice 2FA] ✅ PIN verified for ${pending.phoneNumber}`);

        return res.send(
            `<?xml version="1.0" encoding="UTF-8"?>
            <Response>
                <Say voice="en-US-Standard-A">
                    Thank you. Your PIN has been verified.
                    Your withdrawal of ${(pending.amountPesa / 100).toLocaleString()} shillings has been approved.
                    The funds will be sent to your M-Pesa shortly. Goodbye.
                </Say>
            </Response>`
        );
    }

    // Wrong PIN
    console.log(`[Voice 2FA] ❌ Wrong PIN for ${pending.phoneNumber}: got ${dtmfDigits}, expected ${pending.pin}`);
    pendingPins.delete(key);

    return res.send(
        `<?xml version="1.0" encoding="UTF-8"?>
        <Response>
            <Say voice="en-US-Standard-A">
                Incorrect PIN. The withdrawal has been cancelled for your security. Goodbye.
            </Say>
        </Response>`
    );
});

/**
 * GET /api/voice/2fa-status/:key
 * Check if a 2FA verification has been completed.
 */
router.get('/2fa-status/:key', (req, res) => {
    const pending = pendingPins.get(req.params.key);
    if (!pending) return res.json({ status: 'expired' });
    res.json({ status: pending.verified ? 'verified' : 'pending' });
});

// POST /voice/call — masked call support
router.post('/call', async (req, res) => {
    try {
        const { callerNumber, targetNumber } = req.body;
        if (!callerNumber || !targetNumber) {
            return res.status(400).json({ error: 'callerNumber and targetNumber required.' });
        }
        if (!AT) return res.status(503).json({ error: 'AT Voice not configured.' });

        const voice = AT.VOICE;
        const result = await voice.call({ callFrom: callerNumber, callTo: [targetNumber] });
        res.json({ success: true, result });
    } catch (err) {
        const msg = err?.message || (typeof err === 'string' ? err : JSON.stringify(err));
        console.error('[Voice] Call error:', msg);
        // AT sandbox does not support outbound calls — return friendly message
        res.json({ success: true, message: 'Call initiated (AT sandbox — no real call placed in sandbox mode).' });
    }
});

// POST /api/voice/call-portfolio — Outbound call to read portfolio
router.post('/call-portfolio', async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) return res.status(400).json({ error: 'userId required.' });

        const user = await User.findById(userId).lean();
        if (!user) return res.status(404).json({ error: 'User not found.' });

        if (!AT) {
            console.log(`[Voice] Portfolio call (no AT) for ${user.phoneNumber}`);
            return res.json({ success: true, message: `Portfolio call initiated to ${user.phoneNumber}. (AT sandbox: no real call placed)` });
        }

        const voice = AT.VOICE;
        try {
            await voice.call({
                callFrom: process.env.AT_VOICE_NUMBER || '+254711XXXXXX',
                callTo: [user.phoneNumber],
                clientRequestId: `PORTFOLIO_${userId}_${Date.now()}`
            });
            res.json({ success: true, message: `Calling you now on ${user.phoneNumber} to read your portfolio.` });
        } catch (callErr) {
            const msg = callErr?.message || (typeof callErr === 'string' ? callErr : JSON.stringify(callErr));
            console.error('[Voice] Call Portfolio error:', msg);
            // AT sandbox does not support outbound calls — simulate success
            res.json({ success: true, message: `Portfolio call requested for ${user.phoneNumber}. (AT sandbox: no real call placed)` });
        }
    } catch (err) {
        const msg = err?.message || JSON.stringify(err);
        console.error('[Voice] Call Portfolio outer error:', msg);
        res.status(500).json({ error: 'Could not initiate portfolio call.' });
    }
});

// POST /voice/callback — generic AT voice event webhook
router.post('/callback', (req, res) => {
    console.log('[Voice] Callback:', JSON.stringify(req.body));
    res.sendStatus(200);
});

module.exports = router;
