'use strict';
/**
 * smsService.js
 * Sends transactional SMS via Africa's Talking SDK.
 * NOTE: AT Sandbox does NOT support custom sender IDs.
 * Includes retry logic for intermittent TLS/SSL errors (Node.js v25+).
 */

const { sms } = require('../config/africastalking');

const isSandbox = (process.env.AT_USERNAME || '').toLowerCase() === 'sandbox';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

/** Helper: retry an async function up to N times with delay */
async function withRetry(fn, retries = MAX_RETRIES) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            return await fn();
        } catch (err) {
            const isRetryable = err.message?.includes('EPROTO') || err.message?.includes('ECONNRESET') || err.message?.includes('socket hang up');
            if (isRetryable && attempt < retries) {
                console.warn(`[SMS] Attempt ${attempt}/${retries} failed (${err.message}), retrying in ${RETRY_DELAY_MS}ms...`);
                await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
            } else {
                throw err;
            }
        }
    }
}

/**
 * Send a contact unlock SMS to a buyer.
 */
async function sendContactSMS({ toPhone, propertyId, landlordName, landlordPhone, txRef }) {
    const message = `SahaShares: Property ${propertyId} VERIFIED. Owner: ${landlordName}, Tel: ${landlordPhone}. Ref: ${txRef.slice(0, 8).toUpperCase()}.`;

    const payload = {
        to: [toPhone],
        message,
    };
    // Only set 'from' in production — sandbox rejects custom sender IDs
    if (!isSandbox && process.env.AT_SENDER_ID) {
        payload.from = process.env.AT_SENDER_ID;
    }

    try {
        const result = await withRetry(() => sms.send(payload));
        console.log('[SMS] Sent to', toPhone, JSON.stringify(result));
        return result;
    } catch (err) {
        console.error('[SMS] Failed to send to', toPhone, err.message);
        throw err;
    }
}

/**
 * Send a generic notification SMS (e.g. OTP).
 */
async function sendSMS({ to, message }) {
    const payload = {
        to: Array.isArray(to) ? to : [to],
        message,
    };
    // Only set 'from' in production — sandbox rejects custom sender IDs
    if (!isSandbox && process.env.AT_SENDER_ID) {
        payload.from = process.env.AT_SENDER_ID;
    }

    try {
        const result = await withRetry(() => sms.send(payload));
        console.log('[SMS] Sent notification to', to, JSON.stringify(result));
        return result;
    } catch (err) {
        console.error('[SMS] Notification failed:', err.message);
        throw err;
    }
}

module.exports = { sendContactSMS, sendSMS };

