'use strict';
const express = require('express');
const router = express.Router();
const authService = require('../services/authService');
const User = require('../models/User');
const Investment = require('../models/Investment');
const { sendSMS } = require('../services/smsService');
const { sendAirtimeDividend } = require('../services/airtimeService');
const LedgerTransaction = require('../models/LedgerTransaction');

/** Middleware: verify Bearer token, attach decoded payload to req.decoded */
function requireAuth(req, res, next) {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Not authenticated.' });
    const decoded = authService.verifyToken(auth.split(' ')[1]);
    if (!decoded) return res.status(401).json({ error: 'Invalid or expired token.' });
    req.decoded = decoded;
    next();
}

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
    try {
        const { fullName, phoneNumber, password } = req.body;
        if (!fullName || !phoneNumber || !password) {
            return res.status(400).json({ error: 'fullName, phoneNumber, and password are required.' });
        }
        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters.' });
        }
        const result = await authService.signup({ fullName, phoneNumber, password });
        res.json({ success: true, ...result });
    } catch (err) {
        console.error('[Auth] Signup:', err.message);
        res.status(400).json({ error: err.message });
    }
});

// POST /api/auth/verify-otp
router.post('/verify-otp', async (req, res) => {
    try {
        const { phoneNumber, otp } = req.body;
        if (!phoneNumber || !otp) return res.status(400).json({ error: 'phoneNumber and otp required.' });
        const result = await authService.verifyOTP({ phoneNumber, otp });

        // ✅ Welcome SMS
        sendSMS({
            to: result.user.phone,
            message: `🏡 Karibu SahaShares, ${result.user.fullName}! Akaunti yako imefunguliwa. Anza kuwekeza sasa: dial *384*123# au tembelea app yetu.`,
        }).catch(e => console.warn('[Auth] Welcome SMS failed:', e.message));

        // 🎁 Welcome Airtime Bonus (TSh 50 = 5000 pesa) — fire & forget, but log result
        const WELCOME_AIRTIME_PESA = 100000; // TSh 1,000 welcome bonus
        const airtimeResult = await sendAirtimeDividend(result.user.phone, WELCOME_AIRTIME_PESA)
            .catch(e => { console.warn('[Auth] Welcome airtime failed:', e.message); return { success: false }; });

        // Log airtime to LedgerTransaction so it shows on the dashboard
        try {
            const freshUser = await User.findById(result.user.id);
            if (freshUser) {
                await LedgerTransaction.create({
                    userId: freshUser._id,
                    amount: WELCOME_AIRTIME_PESA,
                    type: 'airtime',
                    status: airtimeResult.success ? 'completed' : 'failed',
                    balanceAfter: freshUser.walletBalance,
                    description: `🎉 Welcome bonus: TSh ${(WELCOME_AIRTIME_PESA / 100).toLocaleString()} airtime for joining SahaShares!`,
                });
                // Also bump totalDividends so Portfolio shows updated stat
                if (airtimeResult.success) {
                    await User.findByIdAndUpdate(freshUser._id, {
                        $inc: { totalDividends: WELCOME_AIRTIME_PESA }
                    });
                }
            }
        } catch (logErr) {
            console.warn('[Auth] Airtime log error:', logErr.message);
        }

        res.json({ success: true, ...result });
    } catch (err) {
        console.error('[Auth] Verify OTP:', err.message);
        res.status(400).json({ error: err.message });
    }
});

// POST /api/auth/resend-otp
router.post('/resend-otp', async (req, res) => {
    try {
        const { phoneNumber } = req.body;
        if (!phoneNumber) return res.status(400).json({ error: 'phoneNumber required.' });
        const result = await authService.resendOTP({ phoneNumber });
        res.json({ success: true, ...result });
    } catch (err) {
        console.error('[Auth] Resend OTP:', err.message);
        res.status(400).json({ error: err.message });
    }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { phoneNumber, password } = req.body;
        if (!phoneNumber || !password) return res.status(400).json({ error: 'phoneNumber and password required.' });
        const result = await authService.login({ phoneNumber, password });
        res.json({ success: true, ...result });
    } catch (err) {
        console.error('[Auth] Login:', err.message);
        res.status(401).json({ error: err.message });
    }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
    try {
        const { phoneNumber } = req.body;
        if (!phoneNumber) return res.status(400).json({ error: 'phoneNumber required.' });
        const result = await authService.forgotPassword({ phoneNumber });
        res.json({ success: true, ...result });
    } catch (err) {
        console.error('[Auth] Forgot:', err.message);
        res.status(400).json({ error: err.message });
    }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
    try {
        const { phoneNumber, otp, newPassword } = req.body;
        if (!phoneNumber || !otp || !newPassword) {
            return res.status(400).json({ error: 'phoneNumber, otp, and newPassword required.' });
        }
        const result = await authService.resetPassword({ phoneNumber, otp, newPassword });
        res.json({ success: true, ...result });
    } catch (err) {
        console.error('[Auth] Reset:', err.message);
        res.status(400).json({ error: err.message });
    }
});

// GET /api/auth/me — fresh user profile from DB
router.get('/me', requireAuth, async (req, res) => {
    try {
        const user = await User.findById(req.decoded.id).select('-passwordHash -otp -otpExpiresAt');
        if (!user) return res.status(404).json({ error: 'User not found.' });
        res.json({
            user: {
                id: user._id,
                fullName: user.fullName,
                phoneNumber: user.phoneNumber,   // ✅ was `phone` — caused SMS to go to undefined
                phone: user.phoneNumber,          // keep both for backward compatibility
                role: user.role,
                walletBalance: user.walletBalance,
                totalInvested: user.totalInvested,
                totalDividends: user.totalDividends,
                createdAt: user.createdAt,
            },
        });
    } catch (err) {
        console.error('[Auth] Me:', err.message);
        res.status(500).json({ error: 'Failed to fetch profile.' });
    }
});

// POST /api/auth/topup-control-number — generate a control number for USSD wallet top-up
router.post('/topup-control-number', requireAuth, async (req, res) => {
    try {
        const { amountTZS } = req.body;
        const amt = parseFloat(String(amountTZS).replace(/,/g, ''));
        if (!amt || amt < 100) return res.status(400).json({ error: 'Minimum top-up is TSh 100.' });
        if (amt > 5000000) return res.status(400).json({ error: 'Maximum is TSh 5,000,000.' });

        const amtPesa = Math.round(amt * 100);
        const PendingPayment = require('../models/PendingPayment');

        // Cancel any previous pending topup control numbers for this user
        await PendingPayment.updateMany(
            { userId: req.decoded.id, type: 'topup', status: 'pending' },
            { $set: { status: 'cancelled' } }
        );

        // Generate unique DT-XXXXXX control number
        function genCN() {
            const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
            let s = 'DT-';
            for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
            return s;
        }

        let saved;
        for (let attempt = 0; attempt < 5; attempt++) {
            const controlNumber = genCN();
            try {
                saved = await PendingPayment.create({
                    controlNumber,
                    type: 'topup',
                    userId: req.decoded.id,
                    amountPesa: amtPesa,
                    description: `Wallet top-up: TSh ${amt.toLocaleString()}`,
                    expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 min TTL
                });
                break;
            } catch (e) {
                if (e.code !== 11000) throw e;
            }
        }
        if (!saved) return res.status(500).json({ error: 'Could not generate control number.' });

        const user = await User.findById(req.decoded.id).select('phoneNumber fullName');
        // Send control number via SMS
        if (user?.phoneNumber) {
            sendSMS({
                to: user.phoneNumber,
                message: `SahaShares: Namba yako ya udhibiti ni ${saved.controlNumber}. Kiasi: TSh ${amt.toLocaleString()}. Piga *384*123# → Chaguo 6. Inaisha dakika 30.`,
            }).catch(e => console.warn('[TopupCN] SMS failed:', e.message));
        }

        res.json({
            success: true,
            controlNumber: saved.controlNumber,
            amountTZS: amt,
            expiresAt: saved.expiresAt,
            instructions: `Dial *384*123# → Choose language → Option 6 → Enter ${saved.controlNumber} → Enter any 4-digit PIN to confirm.`,
        });
    } catch (err) {
        console.error('[Auth] Topup-CN:', err.message);
        res.status(500).json({ error: 'Could not generate control number.' });
    }
});

// POST /api/auth/topup — add funds to wallet
// In sandbox: directly credits wallet (AT has no Checkout endpoint in sandbox).
// In production: swap this for AT Mobile Checkout STK Push.
router.post('/topup', requireAuth, async (req, res) => {
    try {
        const { amountTZS } = req.body;
        const amt = parseFloat(amountTZS);
        if (!amt || amt < 100) return res.status(400).json({ error: 'Minimum top-up is TSh 100.' });
        if (amt > 5000000) return res.status(400).json({ error: 'Maximum top-up is TSh 5,000,000 per transaction.' });

        const amtPesa = Math.round(amt * 100);
        const user = await User.findByIdAndUpdate(
            req.decoded.id,
            { $inc: { walletBalance: amtPesa } },
            { new: true }
        ).select('-passwordHash -otp -otpExpiresAt');

        if (!user) return res.status(404).json({ error: 'User not found.' });
        console.log(`[Topup] ${user.fullName} topped up TSh ${amt.toLocaleString()}`);

        // ✅ Confirmation SMS
        sendSMS({
            to: user.phoneNumber,
            message: `SahaShares: Wallet yako imejazwa TSh ${amt.toLocaleString()}. Salio jipya: TSh ${(user.walletBalance / 100).toLocaleString()}. Asante!`,
        }).catch(e => console.warn('[Topup] SMS failed:', e.message));

        res.json({
            success: true,
            message: `TSh ${amt.toLocaleString()} added to your wallet.`,
            walletBalance: user.walletBalance,
        });
    } catch (err) {
        console.error('[Auth] Topup:', err.message);
        res.status(500).json({ error: 'Top-up failed. Please try again.' });
    }
});

// POST /api/auth/withdraw
router.post('/withdraw', requireAuth, async (req, res) => {
    try {
        const { amountTZS, verificationKey } = req.body;
        const amt = parseFloat(amountTZS);
        if (!amt || amt < 100) return res.status(400).json({ error: 'Minimum withdrawal is TSh 100.' });

        const amtPesa = Math.round(amt * 100);

        // Security Check: Withdrawals > 500K require a Voice 2FA verificationKey
        if (amt > 500000 && !verificationKey) {
            return res.status(403).json({ error: 'Withdrawals over TSh 500,000 require Voice Verification.' });
        }

        const user = await User.findById(req.decoded.id);
        if (!user) return res.status(404).json({ error: 'User not found.' });
        if (user.walletBalance < amtPesa) return res.status(400).json({ error: 'Insufficient wallet balance.' });

        // IMPORTANT: We do NOT need to wait for B2C confirmation here, since B2C is async.
        // We atomically lock the funds to prevent double-withdrawals.
        const updatedUser = await User.findOneAndUpdate(
            { _id: user._id, walletBalance: { $gte: amtPesa } },
            { $inc: { walletBalance: -amtPesa } },
            { new: true }
        );

        if (!updatedUser) {
            return res.status(400).json({ error: 'Insufficient balance during withdrawal lock.' });
        }

        const LedgerTransaction = require('../models/LedgerTransaction');
        await LedgerTransaction.create({
            userId: user._id,
            amount: amtPesa,
            type: 'withdrawal',
            status: 'completed',
            balanceAfter: updatedUser.walletBalance,
            description: `M-Pesa withdrawal: TSh ${amt.toLocaleString()}`,
        });

        // Fire & Forget AT B2C Payout
        const paymentService = require('../services/paymentService');
        paymentService.recordB2CPayout({
            phoneNumber: user.phoneNumber,
            amountTZS: amt,
            reason: 'Wallet withdrawal'
        }).catch(e => console.error(`[B2C] Withdrawal payout failed for ${user.phoneNumber}:`, e.message));

        res.json({
            success: true,
            message: `Successfully initiated withdrawal of TSh ${amt.toLocaleString()}`,
            walletBalance: updatedUser.walletBalance
        });
    } catch (err) {
        console.error('[Auth] Withdraw error:', err.message);
        res.status(500).json({ error: 'Could not process withdrawal.' });
    }
});

// POST /api/auth/change-password
router.post('/change-password', requireAuth, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) return res.status(400).json({ error: 'currentPassword and newPassword required.' });
        if (newPassword.length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters.' });
        await authService.changePassword({ userId: req.decoded.id, currentPassword, newPassword });
        res.json({ success: true, message: 'Password updated successfully.' });
    } catch (err) {
        console.error('[Auth] Change password:', err.message);
        res.status(400).json({ error: err.message });
    }
});

// GET /api/auth/transactions — investment history
router.get('/transactions', requireAuth, async (req, res) => {
    try {
        const investments = await Investment.find({ userId: req.decoded.id })
            .sort({ createdAt: -1 })
            .limit(50)
            .populate('propertyId', 'name location');
        res.json({ success: true, investments });
    } catch (err) {
        console.error('[Auth] Transactions:', err.message);
        res.status(500).json({ error: 'Failed to fetch transactions.' });
    }
});

// GET /api/auth/ledger — full LedgerTransaction history for the logged-in user
router.get('/ledger', requireAuth, async (req, res) => {
    try {
        const transactions = await LedgerTransaction.find({ userId: req.decoded.id })
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();
        res.json({ success: true, transactions });
    } catch (err) {
        console.error('[Auth] Ledger:', err.message);
        res.status(500).json({ error: 'Failed to fetch ledger.' });
    }
});

module.exports = router;
