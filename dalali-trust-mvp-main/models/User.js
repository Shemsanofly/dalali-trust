'use strict';
const mongoose = require('mongoose');

/**
 * User — Investor / Landlord / Admin profile.
 * Currency: walletBalance, totalInvested, totalDividends in PESA (integer).
 * walletBalance modified ONLY via atomic $inc in controllers.
 */

const userSchema = new mongoose.Schema(
    {
        fullName: { type: String, required: true },
        phoneNumber: { type: String, required: true, unique: true },
        nidaId: { type: String, sparse: true, unique: true },
        passwordHash: { type: String, required: true },
        role: {
            type: String,
            enum: ['user', 'admin', 'landlord'],
            default: 'user',
        },
        walletBalance: {
            type: Number,
            default: 0,
            validate: {
                validator: Number.isInteger,
                message: '{VALUE} is not an integer. Store in pesa.',
            },
        },
        totalInvested: {
            type: Number,
            default: 0,
            validate: {
                validator: Number.isInteger,
                message: '{VALUE} is not an integer. Store in pesa.',
            },
        },
        totalDividends: {
            type: Number,
            default: 0,
            validate: {
                validator: Number.isInteger,
                message: '{VALUE} is not an integer. Store in pesa.',
            },
        },
        verified: { type: Boolean, default: false },
        otp: { type: String },
        otpExpiresAt: { type: Date },
    },
    { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
