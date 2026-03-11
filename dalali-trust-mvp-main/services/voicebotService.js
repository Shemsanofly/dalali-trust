'use strict';
/**
 * voicebotService.js — SahaShares voice bot.
 * Handles AT Voice API callbacks for 2FA and portfolio queries.
 */

const Property = require('../models/Property');
const User = require('../models/User');
const Investment = require('../models/Investment');

/**
 * Generate TTS response for voice call.
 */
function buildVoiceResponse(text, isEnd = false) {
    if (isEnd) {
        return `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="en-US-Standard-A">${text}</Say></Response>`;
    }
    return `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="en-US-Standard-A">${text}</Say><GetDigits timeout="10" finishOnKey="#" callbackUrl="${process.env.BASE_URL}/voicebot"><Say>Please enter your response followed by the hash key.</Say></GetDigits></Response>`;
}

/**
 * Handle voice session.
 */
async function handleVoiceSession({ sessionId, callerNumber, dtmfDigits, isActive }) {
    if (!isActive || isActive === '0') {
        return buildVoiceResponse('Thank you for using SahaShares. Goodbye.', true);
    }

    const user = await User.findOne({ phoneNumber: callerNumber }).lean();
    if (!user) {
        return buildVoiceResponse('Sorry, we could not find your account. Please register on our website first. Goodbye.', true);
    }

    if (!dtmfDigits) {
        const balTZS = (user.walletBalance / 100).toLocaleString();
        return buildVoiceResponse(
            `Welcome to SahaShares, ${user.fullName}. Your wallet balance is ${balTZS} shillings. Press 1 to hear your portfolio, or 2 to hang up.`
        );
    }

    if (dtmfDigits === '1') {
        const investments = await Investment.find({ userId: user._id }).populate('propertyId', 'name').lean();
        if (!investments.length) {
            return buildVoiceResponse('You have no investments yet. Visit our website to get started. Goodbye.', true);
        }
        let msg = 'Your portfolio: ';
        investments.forEach((inv) => {
            msg += `${inv.sharesOwned} shares of ${inv.propertyId?.name || 'unknown property'}. `;
        });
        return buildVoiceResponse(msg + 'Goodbye.', true);
    }

    return buildVoiceResponse('Goodbye. Thank you.', true);
}

module.exports = { handleVoiceSession, buildVoiceResponse };
