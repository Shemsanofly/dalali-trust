'use strict';
const express = require('express');
const router = express.Router();
const paymentService = require('../services/paymentService');

// POST /payments/callback — Africa's Talking C2B/Checkout webhook
// Must respond 200 FAST so AT stops retrying.
router.post('/callback', async (req, res) => {
    // Respond 200 immediately
    res.sendStatus(200);

    try {
        // AT Mobile Checkout payload contains: transactionId, status, value, source, etc.
        const { transactionId, status, value, source } = req.body;

        console.log(`[Payments] Webhook received. Txn: ${transactionId}, Status: ${status}, Value: ${value}`);

        if (transactionId && status === 'Success' && value) {
            // value comes as "TZS 500.00" - we need to extract the number
            const amountMatch = value.match(/[\d.]+/);
            const amountTZS = amountMatch ? parseFloat(amountMatch[0]) : 0;
            const phoneNumber = source || req.body.phoneNumber; // fallback in case of different payload types

            if (amountTZS > 0 && phoneNumber) {
                await paymentService.recordDeposit({
                    phoneNumber,
                    amountTZS,
                    providerRefId: transactionId,
                });
                console.log(`[Payments] Processed successful deposit of TSh ${amountTZS} for ${phoneNumber}`);
            }
        } else if (status === 'Failed') {
            console.log(`[Payments] Checkout failed or cancelled by user for Txn: ${transactionId}`);
        }
    } catch (err) {
        console.error('[Payments] Callback processing error:', err.message);
    }
});

module.exports = router;
