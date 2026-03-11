'use strict';
/**
 * voiceService.js
 * Handles outbound masked calls and voice webhook responses.
 */

const { voice } = require('../config/africastalking');

/**
 * Bridge a masked call between buyer and landlord.
 * Neither party's real number is revealed to the other.
 */
async function makeMaskedCall({ callerNumber, landlordNumber }) {
  const callFrom = process.env.AT_VOICE_NUMBER;
  if (!callFrom) throw new Error('AT_VOICE_NUMBER not configured');

  // AT bridges the call — callerNumber and landlordNumber are both called simultaneously
  const result = await voice.call({
    callFrom,
    callTo: [callerNumber, landlordNumber],
  });
  console.log('[Voice] Masked call initiated:', JSON.stringify(result));
  return result;
}

/**
 * Build the voicebot greeting XML with Record action.
 */
function buildVoicebotAnswerXML(baseUrl) {
  const callbackUrl = `${baseUrl}/voicebot/recording`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="woman">Karibu SahaShares. Tafadhali sema jina la mtaa unaotafuta kodi, aina ya chumba, na kima cha juu cha kodi baada ya sauti ya beep.</Say>
  <Record maxLength="15" playBeep="true" callbackUrl="${callbackUrl}" trim="true"/>
</Response>`;
}

/**
 * Build XML to play a TTS audio file.
 */
function buildPlayXML(audioUrl) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Play url="${audioUrl}"/>
</Response>`;
}

/**
 * Build XML to speak text when TTS is not available.
 */
function buildSayXML(text) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="woman">${text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</Say>
</Response>`;
}

module.exports = { makeMaskedCall, buildVoicebotAnswerXML, buildPlayXML, buildSayXML };
