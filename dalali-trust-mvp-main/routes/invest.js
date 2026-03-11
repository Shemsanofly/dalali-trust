'use strict';
const express = require('express');
const router = express.Router();
const Property = require('../models/Property');
const User = require('../models/User');
const Investment = require('../models/Investment');
const LedgerTransaction = require('../models/LedgerTransaction');
const { sendSMS } = require('../services/smsService');
const { sendAirtimeDividend } = require('../services/airtimeService');

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/invest/properties — List all properties (public)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/properties', async (req, res) => {
    try {
        const properties = await Property.find()
            .select('-__v') // Return everything except the version key (including images)
            .populate('ownerId', 'fullName phoneNumber')
            .sort({ createdAt: -1 })
            .lean();
        res.json(properties);
    } catch (err) {
        console.error('[Invest] List properties:', err.message);
        res.status(500).json({ error: 'Could not fetch properties.' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/invest/my-investments — The authenticated user's actual share holdings
// ─────────────────────────────────────────────────────────────────────────────
const authService = require('../services/authService');
function requireAuth(req, res, next) {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Not authenticated.' });
    const decoded = authService.verifyToken(auth.split(' ')[1]);
    if (!decoded) return res.status(401).json({ error: 'Invalid or expired token.' });
    req.decoded = decoded;
    next();
}

router.get('/my-investments', requireAuth, async (req, res) => {
    try {
        const investments = await Investment.find({ userId: req.decoded.id })
            .populate({
                path: 'propertyId',
                select: 'name location propertyId sharePrice monthlyROI status currentFunding targetFunding availableShares totalShares imageUrl images',
            })
            .sort({ createdAt: -1 })
            .lean();

        // Filter out any with missing/deleted property
        const valid = investments.filter(inv => inv.propertyId);

        res.json(valid);
    } catch (err) {
        console.error('[Invest] My investments:', err.message);
        res.status(500).json({ error: 'Could not fetch your investments.' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/invest/properties/:id — Single property detail (public)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/properties/:id', async (req, res) => {
    try {
        const property = await Property.findOne({
            propertyId: req.params.id.toUpperCase(),
        })
            .populate('ownerId', 'fullName phoneNumber')
            .lean();
        if (!property) return res.status(404).json({ error: 'Property not found.' });
        res.json(property);
    } catch (err) {
        console.error('[Invest] Get property:', err.message);
        res.status(500).json({ error: 'Lookup failed.' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/invest/deposit — C2B Investment Deposit (AT Webhook)
//
// This is the race-condition-proof investment controller.
// Called by Africa's Talking when an M-Pesa/Tigo Pesa payment completes.
//
// AT BOUNDARY RULE: AT sends amounts in TZS. We multiply by 100 → pesa.
//
// Flow:
//   1. Idempotency check (providerRefId unique → E11000 catch)
//   2. Atomic wallet debit (query filter: walletBalance >= cost)
//   3. Atomic property credit (aggregation pipeline — status flip inside MongoDB)
//   4. Atomic investment upsert ($inc for repeat buys)
//   5. Finalize ledger entry with balanceAfter
// ─────────────────────────────────────────────────────────────────────────────
router.post('/deposit', async (req, res) => {
    try {
        // ── Parse AT webhook payload ────────────────────────────────────
        const {
            transactionId,       // AT provider reference ID
            phoneNumber,         // Investor phone
            amount: amountTZS,   // AT sends in TZS
            propertyId,          // Which kibanda to invest in
            shares: sharesToBuy, // Number of shares requested
        } = req.body;

        // Validate inputs
        if (!transactionId || !phoneNumber || !amountTZS || !propertyId || !sharesToBuy) {
            return res.status(400).json({ error: 'Missing required fields.' });
        }

        // AT BOUNDARY: TZS → pesa (×100)
        const costInPesa = Math.round(Number(amountTZS) * 100);
        const sharesInt = Math.round(Number(sharesToBuy));

        if (!Number.isInteger(costInPesa) || costInPesa < 1) {
            return res.status(400).json({ error: 'Invalid amount.' });
        }
        if (!Number.isInteger(sharesInt) || sharesInt < 1) {
            return res.status(400).json({ error: 'Invalid share count.' });
        }

        // ── Step 1: Idempotency — Insert ledger entry ──────────────────
        // If AT fires the same webhook twice, the second insert fails
        // with E11000 (duplicate providerRefId) → we catch it and return 200.
        const investor = await User.findOne({ phoneNumber }).lean();
        if (!investor) {
            return res.status(404).json({ error: 'Investor not found.' });
        }

        let ledgerEntry;
        try {
            ledgerEntry = await LedgerTransaction.create({
                userId: investor._id,
                amount: costInPesa,
                type: 'investment',
                status: 'pending',
                providerRefId: transactionId,
                propertyId: null, // Will link after property lookup
                balanceAfter: investor.walletBalance, // Snapshot before debit
                description: `Investment: ${sharesInt} shares of ${propertyId}`,
            });
        } catch (err) {
            if (err.code === 11000) {
                // Duplicate providerRefId — AT fired twice. Safe to ignore.
                console.warn(`[Invest] Duplicate webhook ignored: ${transactionId}`);
                return res.status(200).json({ message: 'Already processed.' });
            }
            throw err;
        }

        // ── Step 2: Atomic wallet debit ────────────────────────────────
        // Query filter ensures walletBalance >= cost. If insufficient,
        // findOneAndUpdate returns null → no partial state.
        const updatedUser = await User.findOneAndUpdate(
            { _id: investor._id, walletBalance: { $gte: costInPesa } },
            { $inc: { walletBalance: -costInPesa, totalInvested: costInPesa } },
            { new: true }
        );

        if (!updatedUser) {
            // Insufficient balance — mark ledger as failed
            await LedgerTransaction.create({
                userId: investor._id,
                amount: costInPesa,
                type: 'investment',
                status: 'failed',
                balanceAfter: investor.walletBalance,
                description: `FAILED: Insufficient balance for ${sharesInt} shares of ${propertyId}`,
            });
            return res.status(400).json({ error: 'Insufficient wallet balance.' });
        }

        // ── Step 3: Atomic property credit — Aggregation Pipeline ──────
        // ALL evaluation happens inside MongoDB. No Node.js memory race.
        // - Deducts availableShares
        // - Increments currentFunding + escrowBalance
        // - Flips status funding → active when currentFunding >= targetFunding
        const updatedProperty = await Property.findOneAndUpdate(
            {
                propertyId: propertyId.toUpperCase(),
                availableShares: { $gte: sharesInt },
                status: 'funding',
            },
            [
                {
                    $set: {
                        availableShares: { $subtract: ['$availableShares', sharesInt] },
                        currentFunding: { $add: ['$currentFunding', costInPesa] },
                        escrowBalance: { $add: ['$escrowBalance', costInPesa] },
                    },
                },
                {
                    $set: {
                        status: {
                            $cond: [
                                { $gte: ['$currentFunding', '$targetFunding'] },
                                'active',
                                '$status',
                            ],
                        },
                    },
                },
            ],
            { new: true }
        );

        if (!updatedProperty) {
            // Property not found, sold out, or already active.
            // ROLLBACK: Refund the wallet debit.
            await User.findOneAndUpdate(
                { _id: investor._id },
                { $inc: { walletBalance: costInPesa, totalInvested: -costInPesa } }
            );

            // Log the failed attempt
            await LedgerTransaction.create({
                userId: investor._id,
                amount: costInPesa,
                type: 'refund',
                status: 'completed',
                balanceAfter: updatedUser.walletBalance + costInPesa,
                description: `REFUND: Property ${propertyId} unavailable or sold out`,
            });

            return res.status(400).json({
                error: 'Property unavailable, sold out, or already fully funded.',
            });
        }

        // ── Step 4: Atomic investment upsert ───────────────────────────
        // If user already owns shares in this property, $inc the existing
        // record. If first purchase, $setOnInsert creates the record.
        await Investment.findOneAndUpdate(
            { userId: investor._id, propertyId: updatedProperty._id },
            {
                $inc: { sharesOwned: sharesInt, amountInvested: costInPesa },
                $setOnInsert: { purchasedAt: new Date() },
            },
            { upsert: true, new: true }
        );

        // ── Step 5: Finalize ledger ────────────────────────────────────
        // Update the pending ledger entry with final balanceAfter and status.
        ledgerEntry.status = 'completed';
        ledgerEntry.balanceAfter = updatedUser.walletBalance;
        ledgerEntry.propertyId = updatedProperty._id;
        // We break the "no update" rule here for the PENDING → COMPLETED
        // transition of the same transaction. This is the only allowed mutation.
        await LedgerTransaction.collection.updateOne(
            { _id: ledgerEntry._id },
            {
                $set: {
                    status: 'completed',
                    balanceAfter: updatedUser.walletBalance,
                    propertyId: updatedProperty._id,
                },
            }
        );

        // ── Step 6: Send SMS notification + micro-airtime bonus to investor ──
        const newBalTZS = (updatedUser.walletBalance / 100).toLocaleString();
        const costTZS = (costInPesa / 100).toLocaleString();
        const smsTxt = `SahaShares: Umefanikiwa kununua hisa ${sharesInt} za "${updatedProperty.name}". Jumla: TSh ${costTZS}. Salio la Wallet: TSh ${newBalTZS}. Asante!`;
        sendSMS({ to: investor.phoneNumber, message: smsTxt }).catch(err =>
            console.error('[Invest] SMS notification error:', err.message)
        );

        // Micro-airtime bonus: 1% of investment value as a thank-you dividend (min TSh 100)
        const airtimePesa = Math.max(Math.round(costInPesa * 0.01), 10000); // at least TSh 100
        sendAirtimeDividend(investor.phoneNumber, airtimePesa).catch(err =>
            console.error('[Invest] Airtime bonus error:', err.message)
        );

        // ── Response ───────────────────────────────────────────────────
        res.status(200).json({
            success: true,
            message: `Invested ${sharesInt} shares in ${updatedProperty.name}`,
            transactionId,
            sharesOwned: sharesInt,
            walletBalance: updatedUser.walletBalance,   // post-debit balance in pesa
            propertyStatus: updatedProperty.status,
            propertyFunding: `${updatedProperty.currentFunding}/${updatedProperty.targetFunding} pesa`,
        });
    } catch (err) {
        console.error('[Invest] Deposit error:', err.message, err.stack);
        res.status(500).json({ error: 'Investment processing failed.' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/invest/generate-control-number — Generate a unique control number
// for USSD payment. The user completes payment via USSD Option 6.
// ─────────────────────────────────────────────────────────────────────────────
const PendingPayment = require('../models/PendingPayment');
const { v4: uuidv4 } = require('uuid');

function genControlNumber() {
    // DT-XXXXXXXX  (8 random alphanumeric uppercase chars)
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no O/0/I/1 to avoid confusion
    let code = 'DT-';
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
}

router.post('/generate-control-number', requireAuth, async (req, res) => {
    try {
        const { propertyId, shares: sharesRaw } = req.body;
        const sharesInt = Math.round(Number(sharesRaw));

        if (!propertyId || !sharesInt || sharesInt < 1) {
            return res.status(400).json({ error: 'propertyId and shares are required.' });
        }

        const property = await Property.findOne({
            propertyId: propertyId.toUpperCase(),
            status: 'funding',
            availableShares: { $gte: sharesInt },
        }).lean();
        if (!property) {
            return res.status(404).json({ error: 'Property not available or not enough shares.' });
        }

        const amountPesa = property.sharePrice * sharesInt;

        // Cancel any previous pending control numbers for this user+property
        await PendingPayment.updateMany(
            { userId: req.decoded.id, propertyId: property._id, status: 'pending' },
            { $set: { status: 'cancelled' } }
        );

        // Generate unique control number (retry on collision)
        let controlNumber, saved;
        for (let attempt = 0; attempt < 5; attempt++) {
            controlNumber = genControlNumber();
            try {
                saved = await PendingPayment.create({
                    controlNumber,
                    type: 'investment',
                    userId: req.decoded.id,
                    propertyId: property._id,
                    sharesCount: sharesInt,
                    amountPesa,
                    description: `${sharesInt} hisa za "${property.name}"`,
                    expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
                });
                break;
            } catch (e) {
                if (e.code !== 11000) throw e; // Only retry on duplicate key
            }
        }
        if (!saved) {
            return res.status(500).json({ error: 'Could not generate control number. Please try again.' });
        }

        res.status(201).json({
            success: true,
            controlNumber,
            amountTZS: amountPesa / 100,
            sharesCount: sharesInt,
            propertyName: property.name,
            expiresAt: saved.expiresAt,
            paymentMethods: [
                { name: 'M-Pesa', ussdCode: '*150*00#' },
                { name: 'HaloPesa', ussdCode: '*150*88#' },
                { name: 'Airtel Money', ussdCode: '*150*60#' },
            ],
            instructions: `Dial any of the USSD codes above, select "Pay Bill / Lipa", then choose SahaShares and enter your control number: ${controlNumber}. Or dial *384*123# → Option 6.`,
        });
    } catch (err) {
        console.error('[Invest] Generate CN error:', err.message);
        res.status(500).json({ error: 'Could not generate control number.' });
    }
});

module.exports = router;
