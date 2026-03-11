'use strict';
const express = require('express');
const router = express.Router();
const voiceService = require('../services/voiceService');
const voicebotService = require('../services/voicebotService');

// GET|POST /voicebot/answer — AT calls this when someone dials the voice number
router.all('/answer', (req, res) => {
    try {
        const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
        const xml = voiceService.buildVoicebotAnswerXML(baseUrl);
        res.set('Content-Type', 'application/xml');
        res.send(xml);
    } catch (err) {
        console.error('[Voicebot] Answer error:', err.message);
        res.set('Content-Type', 'application/xml');
        res.send(voiceService.buildSayXML('Samahani, kuna hitilafu. Tafadhali jaribu tena.'));
    }
});

// POST /voicebot/recording — AT posts recording URL + metadata here
router.post('/recording', async (req, res) => {
    try {
        const { recordingUrl, sessionId, callerNumber } = req.body;
        const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;

        const { swahiliText, audioUrl } = await voicebotService.handleRecording(
            { recordingUrl, sessionId, callerNumber },
            baseUrl,
        );

        res.set('Content-Type', 'application/xml');
        if (audioUrl) {
            res.send(voiceService.buildPlayXML(audioUrl));
        } else {
            res.send(voiceService.buildSayXML(swahiliText));
        }
    } catch (err) {
        console.error('[Voicebot] Recording error:', err.message);
        res.set('Content-Type', 'application/xml');
        res.send(voiceService.buildSayXML('Samahani, kumekuwa na hitilafu. Tafadhali jaribu tena.'));
    }
});

module.exports = router;
