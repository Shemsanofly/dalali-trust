'use strict';
const mongoose = require('mongoose');

/**
 * Investment — Fractional ownership ledger.
 * Maps users to properties with their share count and total invested.
 *
 * Currency: all amounts in PESA (integer cents). 1 TZS = 100 pesa.
 *
 * CRITICAL DESIGN RULE (Phase 2 directive):
 * When a user buys MORE shares of a property they already own,
 * use atomic upsert — do NOT create a second document:
 *
 *   Investment.findOneAndUpdate(
 *     { userId, propertyId },
 *     {
 *       $inc: { sharesOwned: shares, amountInvested: cost },
 *       $setOnInsert: { purchasedAt: new Date() }
 *     },
 *     { upsert: true, new: true }
 *   )
 *
 * The compound unique index { userId, propertyId } prevents accidental
 * duplicate records if the upsert races.
 */

const investmentSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },

        propertyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Property',
            required: true,
        },

        sharesOwned: {
            type: Number,
            required: true,
            min: 1,
            validate: {
                validator: Number.isInteger,
                message: '{VALUE} is not an integer.',
            },
        },

        amountInvested: {
            type: Number,
            required: true,
            min: 1,
            validate: {
                validator: Number.isInteger,
                message: '{VALUE} is not an integer. Store in pesa (cents).',
            },
        },

        dividendsEarned: {
            type: Number,
            default: 0,
            validate: {
                validator: Number.isInteger,
                message: '{VALUE} is not an integer. Store in pesa (cents).',
            },
        },

        purchasedAt: {
            type: Date,
            default: Date.now,
        },
    },
    { timestamps: true }
);

// ── Compound unique index ───────────────────────────────────────────────────
// One record per user-property pair. Repeat buys use atomic $inc upsert.
investmentSchema.index({ userId: 1, propertyId: 1 }, { unique: true });

// ── Query helpers ───────────────────────────────────────────────────────────
// Fast lookup: "all investments for user X"
investmentSchema.index({ userId: 1 });
// Fast lookup: "all investors in property Y"
investmentSchema.index({ propertyId: 1 });

module.exports = mongoose.model('Investment', investmentSchema);
