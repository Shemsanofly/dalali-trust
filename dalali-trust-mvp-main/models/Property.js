'use strict';
const mongoose = require('mongoose');

/**
 * Property — A real estate asset (commercial, residential, land, etc.)
 * available for fractional micro-investment.
 *
 * Currency: all amounts in PESA (integer cents). 1 TZS = 100 pesa.
 *
 * CRITICAL DESIGN RULES:
 *
 * 1. NO pre-save hooks for status transitions. The controller uses a
 *    MongoDB Aggregation Pipeline Update — ALL evaluation happens
 *    server-side inside MongoDB, never in Node.js memory:
 *
 *    Property.findOneAndUpdate(
 *      { _id: id, availableShares: { $gte: shares }, status: 'funding' },
 *      [
 *        { $set: {
 *            availableShares: { $subtract: ['$availableShares', shares] },
 *            currentFunding:  { $add: ['$currentFunding', costInPesa] },
 *            escrowBalance:   { $add: ['$escrowBalance', costInPesa] },
 *        }},
 *        { $set: {
 *            status: { $cond: [
 *              { $gte: ['$currentFunding', '$targetFunding'] },
 *              'active', '$status'
 *            ]}
 *        }}
 *      ],
 *      { new: true }
 *    )
 *
 * 2. targetFunding % totalShares MUST === 0 (integer modulo guard).
 *    sharePrice = targetFunding / totalShares — guaranteed clean integer.
 *
 * 3. availableShares can never go below 0. The atomic query filter
 *    { availableShares: { $gte: shares } } makes over-selling impossible.
 *
 * 4. DOUBLE-ENTRY ACCOUNTING: When a user invests, their walletBalance
 *    decreases and the property's escrowBalance increases by the same
 *    amount. Escrow is released to ownerId when status = 'active'.
 *
 * 5. SECONDARY MARKET GUARDRAIL: Any logic subtracting shares from
 *    Investment.js must use { sharesOwned: { $gte: sharesToSell } }.
 *
 * 6. AT BOUNDARY RULE: AT operates in TZS.
 *    Incoming C2B: amount × 100 → pesa before DB.
 *    Outgoing B2C: amount ÷ 100 → TZS before AT API.
 */

const propertySchema = new mongoose.Schema(
    {
        propertyId: {
            type: String,
            unique: true,
            required: true,
        },

        // The landlord/owner selling fractional shares
        ownerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },

        name: { type: String, required: true },
        location: { type: String, required: true },
        description: { type: String, default: '' },
        imageUrl: { type: String, default: '' },
        images: [{ type: String }],

        videoUrl: { type: String, default: '' },       // YouTube embed or mp4 URL
        tourUrl: { type: String, default: '' },         // 360° tour embed (Matterport, etc.)

        mapUrl: { type: String, default: '' },
        amenities: [{ type: String }],

        contacts: {
            phone: { type: String, default: '' },
            whatsapp: { type: String, default: '' },
            email: { type: String, default: '' },
            instagram: { type: String, default: '' }
        },

        // Property category
        category: {
            type: String,
            enum: ['commercial', 'residential', 'land', 'industrial', 'mixed'],
            default: 'commercial',
        },

        // Ownership & legal verification
        titleDeedStatus: {
            type: String,
            enum: ['clean', 'disputed', 'encumbered', 'unknown'],
            default: 'unknown',
        },
        hasDispute: { type: Boolean, default: false },
        ownerVerified: { type: Boolean, default: false },

        // ── Financial fields (all integer pesa) ─────────────────────────
        targetFunding: {
            type: Number,
            required: true,
            validate: {
                validator: Number.isInteger,
                message: '{VALUE} is not an integer. Store in pesa.',
            },
        },

        currentFunding: {
            type: Number,
            default: 0,
            validate: {
                validator: Number.isInteger,
                message: '{VALUE} is not an integer. Store in pesa.',
            },
        },

        // Double-entry: holds investor funds until property is fully funded.
        // Released to ownerId when status flips to 'active'.
        escrowBalance: {
            type: Number,
            default: 0,
            validate: {
                validator: Number.isInteger,
                message: '{VALUE} is not an integer. Store in pesa.',
            },
        },

        totalShares: {
            type: Number,
            required: true,
            min: 1,
            validate: {
                validator: Number.isInteger,
                message: '{VALUE} is not an integer.',
            },
        },

        availableShares: {
            type: Number,
            min: 0,
            validate: {
                validator: Number.isInteger,
                message: '{VALUE} is not an integer.',
            },
        },

        // Computed on creation: targetFunding / totalShares
        sharePrice: {
            type: Number,
            required: true,
            validate: {
                validator: Number.isInteger,
                message: '{VALUE} is not an integer. Store in pesa.',
            },
        },

        monthlyROI: {
            type: Number,
            default: 0,
        },

        status: {
            type: String,
            enum: ['funding', 'active', 'closed'],
            default: 'funding',
        },

        // Community fraud reports
        flaggedBy: [
            {
                phoneNumber: { type: String },
                reason: { type: String },
                flaggedAt: { type: Date, default: Date.now },
            },
        ],
    },
    { timestamps: true }
);

// ── Integer Modulo Guard ────────────────────────────────────────────────────
// Validates that targetFunding divides evenly by totalShares.
// Runs only on new documents (creation). sharePrice is auto-computed.
propertySchema.pre('validate', function (next) {
    if (this.isNew) {
        if (this.targetFunding % this.totalShares !== 0) {
            return next(
                new Error(
                    `targetFunding (${this.targetFunding}) must be evenly divisible by totalShares (${this.totalShares}). ` +
                    `Remainder: ${this.targetFunding % this.totalShares} pesa.`
                )
            );
        }
        // Auto-compute sharePrice and default availableShares
        this.sharePrice = this.targetFunding / this.totalShares;
        if (this.availableShares == null) {
            this.availableShares = this.totalShares;
        }
    }
    next();
});

// ── Indexes ─────────────────────────────────────────────────────────────────
propertySchema.index({ status: 1 });
propertySchema.index({ ownerId: 1 });

module.exports = mongoose.model('Property', propertySchema);
