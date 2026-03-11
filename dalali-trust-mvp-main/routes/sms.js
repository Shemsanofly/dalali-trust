'use strict';
/**
 * routes/sms.js
 *
 * Handles:
 *  1. POST /sms/incoming — Africa's Talking 2-way SMS inbound webhook.
 *     AT sends the message body, phone number, and shortcode.
 *     We parse keywords (BAL, INVEST, HELP, PORTFOLIO) and reply via SMS.
 *
 *  2. POST /api/payments/topup — Frontend-triggered STK Push (Mobile Checkout)
 *     to fund the user's wallet.
 *
 *  3. POST /api/payments/b2b — Admin-triggered B2B payment.
 */

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Investment = require('../models/Investment');
const Property = require('../models/Property');
const { sendSMS } = require('../services/smsService');
const paymentService = require('../services/paymentService');
const authService = require('../services/authService');

function requireAuth(req, res, next) {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Not authenticated.' });
    const decoded = authService.verifyToken(auth.split(' ')[1]);
    if (!decoded) return res.status(401).json({ error: 'Invalid or expired token.' });
    req.decoded = decoded;
    next();
}

const fmt = (pesa) => `TSh ${Math.round((pesa || 0) / 100).toLocaleString()}`;

// Normalize phone to E164 (+255XXXXXXXXX) so it matches how users are stored in DB
function toE164(phone) {
    if (!phone) return phone;
    const clean = String(phone).replace(/\s+/g, '');
    if (clean.startsWith('+')) return clean;
    if (clean.startsWith('0')) return '+255' + clean.slice(1);
    if (clean.startsWith('255')) return '+' + clean;
    return '+255' + clean;
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /sms/incoming  — Africa's Talking 2-way SMS inbound webhook
// AT Docs: https://developers.africastalking.com/docs/sms/receiving
// ─────────────────────────────────────────────────────────────────────────────
router.post('/incoming', async (req, res) => {
    // Respond 200 immediately — AT needs a fast response
    res.sendStatus(200);

    try {
        const { from: rawPhone, text: rawText } = req.body;
        if (!rawPhone || !rawText) return;

        const phone = toE164(rawPhone); // normalize: AT may send 255..., 0..., or +255...
        const keyword = rawText.trim().toUpperCase().split(' ')[0];
        console.log(`[SMS-2WAY] From: ${rawPhone} → ${phone} | Keyword: ${keyword}`);

        const user = await User.findOne({ phoneNumber: phone }).lean();

        let reply = '';

        switch (keyword) {
            case 'BAL':
            case 'BALANCE': {
                if (!user) {
                    reply = 'SahaShares: Account not found. Register at SahaShares.app';
                    break;
                }
                reply = `SahaShares 💰 Wallet: ${fmt(user.walletBalance)} | Invested: ${fmt(user.totalInvested)} | Dividends: ${fmt(user.totalDividends)}`;
                break;
            }

            case 'PORTFOLIO':
            case 'PORT': {
                if (!user) {
                    reply = 'SahaShares: Account not found. Register at SahaShares.app';
                    break;
                }
                const investments = await Investment.find({ userId: user._id })
                    .populate('propertyId', 'name monthlyROI sharePrice')
                    .lean();
                if (!investments.length) {
                    reply = `SahaShares: You have no investments yet. Visit SahaShares.app to browse properties!`;
                } else {
                    const lines = investments.map(inv => {
                        const p = inv.propertyId;
                        const val = inv.sharesOwned * (p?.sharePrice || 0);
                        return `${p?.name?.substring(0, 20) || 'Property'}: ${inv.sharesOwned} shares (${fmt(val)})`;
                    });
                    reply = `SahaShares 🏪 Portfolio:\n${lines.slice(0, 3).join('\n')}\nWallet: ${fmt(user.walletBalance)}`;
                }
                break;
            }

            case 'INVEST': {
                // List top 3 available properties
                const props = await Property.find({ status: 'funding', availableShares: { $gt: 0 } })
                    .sort({ monthlyROI: -1 })
                    .limit(3)
                    .lean();
                if (!props.length) {
                    reply = 'SahaShares: No properties open for investment right now. Check SahaShares.app';
                } else {
                    const lines = props.map(p => `${p.name?.substring(0, 18)}: ${fmt(p.sharePrice)}/share (${p.monthlyROI}% ROI)`);
                    reply = `SahaShares 📈 Top Investments:\n${lines.join('\n')}\nVisit SahaShares.app to invest!`;
                }
                break;
            }

            case 'HELP':
            default: {
                reply = `SahaShares SMS Commands:
BAL - Check wallet balance
PORTFOLIO - View your investments
INVEST - Browse open properties
Reply any keyword to get started!
Web: SahaShares.app`;
                break;
            }
        }

        if (reply && phone) {
            await sendSMS({ to: phone, message: reply });
            console.log(`[SMS-2WAY] Replied to ${phone}: ${reply.substring(0, 60)}...`);
        }
    } catch (err) {
        console.error('[SMS-2WAY] Error handling inbound SMS:', err.message);
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/payments/topup — STK Push (Mobile Checkout) wallet top-up
// Triggered by the user from the Portfolio page to top up their wallet
// ─────────────────────────────────────────────────────────────────────────────
router.post('/topup', requireAuth, async (req, res) => {
    try {
        const { amountTZS } = req.body;
        if (!amountTZS || Number(amountTZS) < 100) {
            return res.status(400).json({ error: 'Minimum top-up is TSh 100.' });
        }

        const user = await User.findById(req.decoded.id).lean();
        if (!user) return res.status(404).json({ error: 'User not found.' });

        const result = await paymentService.initiateCheckout({
            phoneNumber: user.phoneNumber,
            amountTZS: Number(amountTZS),
            metadata: { userId: user._id.toString(), purpose: 'wallet-topup' },
        });

        res.json({
            success: true,
            message: `STK Push sent to ${user.phoneNumber}. Please complete payment on your phone.`,
            result,
        });
    } catch (err) {
        console.error('[TopUp] Error:', err.message);
        // Sandbox-friendly fallback
        const isSandbox = (process.env.AT_USERNAME || '').toLowerCase() === 'sandbox';
        if (isSandbox) {
            return res.json({
                success: true,
                sandbox: true,
                message: 'Sandbox mode: STK Push simulated. In production, your phone would receive a prompt.',
            });
        }
        res.status(500).json({ error: err.message || 'Failed to initiate top-up.' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/payments/b2b — Business-to-Business payout
// Admin use: pay out to a registered business (e.g. landlord pay-outs to bank)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/b2b', requireAuth, async (req, res) => {
    try {
        const requester = await User.findById(req.decoded.id).lean();
        if (!requester || requester.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required.' });
        }

        const { phoneNumber, amountTZS, reason } = req.body;
        if (!phoneNumber || !amountTZS || !reason) {
            return res.status(400).json({ error: 'phoneNumber, amountTZS, and reason are required.' });
        }

        // Use payment service B2C for the sandbox (B2B follows same SDK path)
        const result = await paymentService.recordB2CPayout({
            phoneNumber,
            amountTZS: Number(amountTZS),
            reason,
        });

        res.json({ success: true, message: `B2B payout of TSh ${Number(amountTZS).toLocaleString()} initiated.`, result });
    } catch (err) {
        console.error('[B2B] Error:', err.message);
        const isSandbox = (process.env.AT_USERNAME || '').toLowerCase() === 'sandbox';
        if (isSandbox) {
            return res.json({
                success: true,
                sandbox: true,
                message: 'Sandbox B2B payout simulated successfully.',
            });
        }
        res.status(500).json({ error: err.message || 'B2B payout failed.' });
    }
});

module.exports = router;
