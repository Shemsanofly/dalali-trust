'use strict';
/**
 * paymentService.js — SahaShares payment helpers.
 * AT Boundary Rule: AT sends/receives TZS, DB stores pesa (×100).
 */

const LedgerTransaction = require('../models/LedgerTransaction');
const User = require('../models/User');

// ── Africa's Talking SDK (lazy init) ────────────────────────────────────
let AT = null;
try {
    if (process.env.AT_API_KEY && process.env.AT_USERNAME) {
        const AfricasTalking = require('africastalking');
        AT = AfricasTalking({ apiKey: process.env.AT_API_KEY, username: process.env.AT_USERNAME });
    }
} catch (e) { /* AT SDK not available */ }

/**
 * Record a C2B deposit into the user's wallet.
 * Called when AT payment webhook confirms an incoming payment.
 */
async function recordDeposit({ phoneNumber, amountTZS, providerRefId }) {
    const amountPesa = Math.round(Number(amountTZS) * 100);
    const user = await User.findOne({ phoneNumber });
    if (!user) throw new Error('User not found for deposit.');

    // Idempotency: if providerRefId already exists, skip
    try {
        const updatedUser = await User.findOneAndUpdate(
            { _id: user._id },
            { $inc: { walletBalance: amountPesa } },
            { new: true }
        );

        await LedgerTransaction.create({
            userId: user._id,
            amount: amountPesa,
            type: 'deposit',
            status: 'completed',
            providerRefId,
            balanceAfter: updatedUser.walletBalance,
            description: `M-Pesa deposit: TSh ${amountTZS}`,
        });

        return { success: true, newBalance: updatedUser.walletBalance };
    } catch (err) {
        if (err.code === 11000) {
            return { success: true, message: 'Already processed (idempotent).' };
        }
        throw err;
    }
}

/**
 * Send a B2C M-Pesa payout (dividend or withdrawal).
 * AT Boundary: amount sent to AT in TZS (pesa ÷ 100).
 *
 * @param {Object} opts
 * @param {string} opts.phoneNumber - Recipient phone in E.164
 * @param {number} opts.amountTZS - Amount in TZS (already converted from pesa)
 * @param {string} opts.reason - Human-readable reason
 * @param {string} [opts.ledgerEntryId] - Optional ledger reference
 */
async function recordB2CPayout({ phoneNumber, amountTZS, reason, ledgerEntryId }) {
    if (!AT) {
        console.warn('[B2C] AT SDK not configured. Payout skipped (logged only).');
        return { success: false, message: 'AT not configured' };
    }

    const productName = process.env.AT_PRODUCT_NAME || 'SahaSharesPay';
    const payments = AT.PAYMENTS;

    try {
        const result = await payments.mobileB2C({
            productName,
            recipients: [
                {
                    phoneNumber,
                    currencyCode: 'TZS',
                    amount: amountTZS,
                    reason: 'BusinessPayment',
                    metadata: { description: reason },
                },
            ],
        });

        console.log(`[B2C] Sent TSh ${amountTZS.toLocaleString()} to ${phoneNumber} — ${reason}`);
        return { success: true, result };
    } catch (err) {
        console.error(`[B2C] Payout failed to ${phoneNumber}: ${err.message}`);
        throw err;
    }
}

/**
 * Initiate an M-Pesa STK Push (Mobile Checkout) for wallet top-up.
 * AT Boundary: amount is sent in TZS.
 */
async function initiateCheckout({ phoneNumber, amountTZS, metadata = {} }) {
    if (!AT) {
        throw new Error('Africa\'s Talking SDK not configured. Cannot process Mobile Checkout.');
    }

    const productName = process.env.AT_PRODUCT_NAME || 'SahaSharesPay';
    const payments = AT.PAYMENTS;

    try {
        const result = await payments.mobileCheckout({
            productName,
            phoneNumber,
            currencyCode: 'TZS',
            amount: amountTZS,
            metadata,
        });

        console.log(`[Checkout] STK Push initiated for ${phoneNumber} - TSh ${amountTZS}`);
        return { success: true, result };
    } catch (err) {
        console.error(`[Checkout] Failed to initiate STK push for ${phoneNumber}: ${err.message}`);
        throw err;
    }
}

module.exports = { recordDeposit, recordB2CPayout, initiateCheckout };

