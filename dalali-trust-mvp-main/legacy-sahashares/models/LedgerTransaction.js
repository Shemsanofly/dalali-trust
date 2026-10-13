'use strict';
const mongoose = require('mongoose');

/**
 * LedgerTransaction — Append-only immutable financial log.
 *
 * Design rules:
 * 1. NO updates, NO deletes. Every state change is a NEW document.
 * 2. `amount` is stored in PESA (integer cents). 1 TZS = 100 pesa.
 * 3. `providerRefId` is the AT transaction ID — sparse unique index
 *    guarantees idempotency. If AT fires a webhook twice, the second
 *    insert fails with E11000 (duplicate key) → no double-credit.
 * 4. `balanceAfter` = the user's wallet balance at the exact moment this
 *    txn was recorded. Enables O(1) audit: read one row, know the balance.
 *
 * Phase 2 directive — AT webhook must catch E11000:
 *   try { await LedgerTransaction.create({ ... }); }
 *   catch (err) {
 *     if (err.code === 11000) return res.status(200).json({ message: 'Already processed' });
 *     throw err;
 *   }
 */

const ledgerTransactionSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },

        // Always positive. Direction is inferred from `type`.
        amount: {
            type: Number,
            required: true,
            min: 1,
            validate: {
                validator: Number.isInteger,
                message: '{VALUE} is not an integer. Store amounts in pesa (cents).',
            },
        },

        type: {
            type: String,
            enum: ['deposit', 'withdrawal', 'dividend', 'investment', 'refund', 'airtime'],
            required: true,
        },

        status: {
            type: String,
            enum: ['pending', 'completed', 'failed'],
            default: 'pending',
        },

        // Africa's Talking transaction reference — idempotency key.
        // Sparse: only indexed when present (USSD/mobile money txns).
        providerRefId: {
            type: String,
            sparse: true,
            unique: true,
        },

        // Optional: links this txn to a specific property investment
        propertyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Property',
        },

        // O(1) auditability — the user's exact wallet balance after this txn.
        // If the DB crashes, read this single row to know the balance.
        balanceAfter: {
            type: Number,
            required: true,
            validate: {
                validator: Number.isInteger,
                message: '{VALUE} is not an integer. Store in pesa (cents).',
            },
        },

        description: {
            type: String,
            default: '',
        },
    },
    {
        timestamps: { createdAt: true, updatedAt: false }, // Immutable — no updatedAt
    }
);

// ── Indexes ─────────────────────────────────────────────────────────────────
// Fast queries: "show me all txns for user X of type Y"
ledgerTransactionSchema.index({ userId: 1, type: 1, createdAt: -1 });
// Fast queries: "all txns for property Z"
ledgerTransactionSchema.index({ propertyId: 1, createdAt: -1 });

// ── Immutability guard ──────────────────────────────────────────────────────
// Block any save() call on an existing document. New entries only.
ledgerTransactionSchema.pre('save', function (next) {
    if (!this.isNew) {
        return next(new Error('LedgerTransaction is immutable. Create a new entry instead of updating.'));
    }
    next();
});

module.exports = mongoose.model('LedgerTransaction', ledgerTransactionSchema);
