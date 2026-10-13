'use strict';
const mongoose = require('mongoose');

/**
 * PendingPayment — Control number record for USSD-initiated payments.
 *
 * Supports two payment types:
 *  - 'investment': User buys shares via website buy modal
 *  - 'topup': User tops up wallet via website top-up form
 *
 * Flow:
 *  1. User initiates payment on website → API generates DT-XXXXXX control number
 *  2. Server creates this record with a 30-min TTL, sends the number via SMS
 *  3. User dials USSD, selects Option 6, enters control number
 *  4. USSD service finds record, fetches details, shows amount
 *  5. User enters any 4-digit PIN → payment executes, wallet updates, record marked 'completed'
 */
const pendingPaymentSchema = new mongoose.Schema(
    {
        controlNumber: {
            type: String,
            required: true,
            unique: true,
            uppercase: true,
        },
        // 'investment' = buy shares, 'topup' = add wallet funds
        type: {
            type: String,
            enum: ['investment', 'topup'],
            default: 'investment',
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        // Only for investment type
        propertyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Property',
        },
        sharesCount: { type: Number, min: 1 },
        amountPesa: { type: Number, required: true, min: 1 },
        description: { type: String, default: '' }, // 'Top-up TSh 10,000' or '5 shares of Kariakoo'
        expiresAt: {
            type: Date,
            required: true,
            index: { expires: 0 }, // MongoDB TTL — auto-delete after expiresAt
        },
        status: {
            type: String,
            enum: ['pending', 'completed', 'expired', 'cancelled'],
            default: 'pending',
        },
    },
    { timestamps: true }
);

pendingPaymentSchema.index({ userId: 1, status: 1 });

module.exports = mongoose.model('PendingPayment', pendingPaymentSchema);
