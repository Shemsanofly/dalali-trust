'use strict';
/**
 * airtimeService.js — SahaShares airtime dividend fallback.
 *
 * Uses a DIRECT HTTP POST to the AT REST API instead of the SDK,
 * because the africastalking SDK passes `maxNumRetry=None` which
 * the API rejects with a 400 (known SDK bug).
 */

const https = require('https');
const querystring = require('querystring');
const { sendSMS } = require('./smsService');

const AT_AIRTIME_URL = 'https://api.sandbox.africastalking.com/version1/airtime/send';
const isSandbox = (process.env.AT_USERNAME || '').toLowerCase() === 'sandbox';

/**
 * Send airtime as a micro-dividend via direct AT REST API call.
 * @param {string} phoneNumber - E.164 format
 * @param {number} amountPesa - amount in pesa (divide by 100 for TZS)
 */
async function sendAirtimeDividend(phoneNumber, amountPesa) {
    const apiKey = process.env.AT_API_KEY;
    const username = process.env.AT_USERNAME;

    if (!apiKey || !username) {
        console.warn('[Airtime] AT credentials not configured.');
        return { success: false, message: 'AT not configured' };
    }

    const amountTZS = amountPesa / 100;
    const recipients = JSON.stringify([{ phoneNumber, currencyCode: 'TZS', amount: `TZS ${amountTZS}` }]);

    const postData = querystring.stringify({
        username,
        recipients,
    });

    return new Promise((resolve) => {
        const options = {
            hostname: isSandbox ? 'api.sandbox.africastalking.com' : 'api.africastalking.com',
            path: '/version1/airtime/send',
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded',
                'apiKey': apiKey,
                'Content-Length': Buffer.byteLength(postData),
            },
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (res.statusCode === 201 || res.statusCode === 200) {
                        const responses = parsed.responses || [];
                        const firstResp = responses[0] || {};
                        if (firstResp.status === 'Success' || firstResp.errorMessage === 'None') {
                            console.log(`[Airtime] ✅ Sent TSh ${amountTZS} airtime to ${phoneNumber}`);

                            // Send SMS Notification
                            sendSMS({
                                to: phoneNumber,
                                message: `SahaShares: You have received TSh ${amountTZS.toLocaleString()} in Airtime! Thank you for being part of the future of Tanzanian real estate.`
                            }).catch(err => console.error('[Airtime] Failed to send SMS notification:', err.message));

                            return resolve({ success: true, result: parsed });
                        }
                    }
                    console.error('[Airtime] AT API error:', JSON.stringify(parsed));
                    resolve({ success: false, error: JSON.stringify(parsed) });
                } catch (e) {
                    console.error('[Airtime] Parse error:', data);
                    resolve({ success: false, error: data });
                }
            });
        });

        req.on('error', (err) => {
            console.error('[Airtime] Request error:', err.message);
            resolve({ success: false, error: err.message });
        });

        req.write(postData);
        req.end();
    });
}

module.exports = { sendAirtimeDividend };
