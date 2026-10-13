'use strict';
/**
 * authService.js
 * Handles OTP generation, phone verification via AT SMS, JWT tokens, and password ops.
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendSMS } = require('./smsService');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error('[FATAL] JWT_SECRET environment variable is not set. Please add it to your .env file.');
}
const JWT_EXPIRES = '7d';
const OTP_EXPIRY = 10 * 60 * 1000; // 10 minutes

function toE164(phone) {
    if (!phone) return phone;
    const clean = String(phone).replace(/\s+/g, '');
    if (clean.startsWith('+')) return clean;
    if (clean.startsWith('0')) return '+255' + clean.slice(1);
    if (clean.startsWith('255')) return '+' + clean;
    return '+255' + clean;
}

/** Generate a 6-digit numeric OTP */
function generateOTP() {
    return String(Math.floor(100000 + Math.random() * 900000));
}

/** Hash a password */
async function hashPassword(pwd) {
    return bcrypt.hash(pwd, 10);
}

/** Compare a password with its hash */
async function comparePassword(pwd, hash) {
    return bcrypt.compare(pwd, hash);
}

/** Sign a JWT with user payload */
function signToken(user) {
    return jwt.sign(
        { id: user._id || user.id, phone: user.phoneNumber, role: user.role, name: user.fullName },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES }
    );
}

/** Verify a JWT — returns decoded payload or null */
function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch {
        return null;
    }
}

/**
 * Register — creates unverified user, sends OTP via SMS.
 */
async function signup({ fullName, phoneNumber, password }) {
    const phone = toE164(phoneNumber);
    const existing = await User.findOne({ phoneNumber: phone });
    if (existing && existing.verified) throw new Error('Phone number already registered.');

    const passwordHash = await hashPassword(password);
    const otp = generateOTP();
    const otpExpiresAt = new Date(Date.now() + OTP_EXPIRY);

    let user;
    if (existing) {
        existing.fullName = fullName;
        existing.passwordHash = passwordHash;
        existing.otp = otp;
        existing.otpExpiresAt = otpExpiresAt;
        user = await existing.save();
    } else {
        user = await User.create({ fullName, phoneNumber: phone, passwordHash, otp, otpExpiresAt });
    }

    // Send OTP via Africa's Talking SMS
    try {
        await sendSMS({
            to: phone,
            message: `SahaShares: Your verification code is ${otp}. Valid for 10 minutes.`,
        });
    } catch (e) {
        console.warn('[Auth] OTP SMS failed:', e.message, '— OTP is:', otp);
    }

    return { userId: user._id, phone, otpSent: true };
}

/**
 * Resend OTP — generates a fresh OTP and re-sends via SMS.
 */
async function resendOTP({ phoneNumber }) {
    const phone = toE164(phoneNumber);
    const user = await User.findOne({ phoneNumber: phone });
    if (!user) throw new Error('User not found. Please sign up first.');
    if (user.verified) throw new Error('Phone already verified. Please log in.');

    const otp = generateOTP();
    user.otp = otp;
    user.otpExpiresAt = new Date(Date.now() + OTP_EXPIRY);
    await user.save();

    try {
        await sendSMS({
            to: phone,
            message: `SahaShares: Your new verification code is ${otp}. Valid for 10 minutes.`,
        });
    } catch (e) {
        console.warn('[Auth] Resend OTP SMS failed:', e.message, '— OTP is:', otp);
    }

    return { phone, otpSent: true };
}

/**
 * Verify OTP — marks user as verified and returns JWT.
 */
async function verifyOTP({ phoneNumber, otp }) {
    const phone = toE164(phoneNumber);
    const user = await User.findOne({ phoneNumber: phone });
    if (!user) throw new Error('User not found.');
    if (user.otp !== otp) throw new Error('Invalid OTP.');
    if (user.otpExpiresAt < new Date()) throw new Error('OTP expired. Please request a new one.');

    user.verified = true;
    user.otp = undefined;
    user.otpExpiresAt = undefined;
    await user.save();

    const token = signToken(user);
    return { token, user: { id: user._id, fullName: user.fullName, phone: user.phoneNumber, role: user.role } };
}

/**
 * Login with phone + password.
 */
async function login({ phoneNumber, password }) {
    const phone = toE164(phoneNumber);
    const user = await User.findOne({ phoneNumber: phone });
    if (!user) throw new Error('Account not found.');
    if (!user.verified) throw new Error('Phone not verified. Please sign up again.');

    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) throw new Error('Invalid password.');

    const token = signToken(user);
    return { token, user: { id: user._id, fullName: user.fullName, phone: user.phoneNumber, role: user.role } };
}

/**
 * Forgot password — sends OTP to reset.
 */
async function forgotPassword({ phoneNumber }) {
    const phone = toE164(phoneNumber);
    const user = await User.findOne({ phoneNumber: phone, verified: true });
    if (!user) throw new Error('No verified account found for this number.');

    const otp = generateOTP();
    user.otp = otp;
    user.otpExpiresAt = new Date(Date.now() + OTP_EXPIRY);
    await user.save();

    try {
        await sendSMS({
            to: phone,
            message: `SahaShares: Your password reset code is ${otp}. Valid for 10 minutes.`,
        });
    } catch (e) {
        console.warn('[Auth] Reset OTP SMS failed:', e.message, '— OTP is:', otp);
    }

    return { phone, otpSent: true };
}

/**
 * Reset password with OTP verification.
 */
async function resetPassword({ phoneNumber, otp, newPassword }) {
    const phone = toE164(phoneNumber);
    const user = await User.findOne({ phoneNumber: phone });
    if (!user) throw new Error('User not found.');
    if (user.otp !== otp) throw new Error('Invalid OTP.');
    if (user.otpExpiresAt < new Date()) throw new Error('OTP expired.');

    user.passwordHash = await hashPassword(newPassword);
    user.otp = undefined;
    user.otpExpiresAt = undefined;
    await user.save();

    const token = signToken(user);
    return { token, user: { id: user._id, fullName: user.fullName, phone: user.phoneNumber, role: user.role } };
}

/**
 * Change password — verifies current password then updates to new hash.
 */
async function changePassword({ userId, currentPassword, newPassword }) {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found.');
    const valid = await comparePassword(currentPassword, user.passwordHash);
    if (!valid) throw new Error('Current password is incorrect.');
    user.passwordHash = await hashPassword(newPassword);
    await user.save();
    return { success: true };
}

module.exports = { signup, resendOTP, verifyOTP, login, forgotPassword, resetPassword, changePassword, verifyToken, signToken };

