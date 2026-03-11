'use strict';
const AfricasTalking = require('africastalking');

const _at = AfricasTalking({
    apiKey: process.env.AT_API_KEY || 'sandbox-dummy',
    username: process.env.AT_USERNAME || 'sandbox',
});

module.exports = {
    sms: _at.SMS,
    payments: _at.PAYMENTS,
    airtime: _at.AIRTIME,
    voice: _at.VOICE,
};
