'use strict';
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const aiBroker = require('../controllers/aiBrokerController');

/**
 * POST /api/ai/chat
 * Body: { message, sessionId? }
 * Headers: Authorization: Bearer <token>
 *
 * If no sessionId is provided, a new one is generated.
 * Returns: { reply, toolCalls, sessionId }
 */
router.post('/chat', async (req, res) => {
    try {
        // Extract user from auth middleware (simplified — assumes token was validated)
        const userId = req.body.userId; // In production, extract from JWT
        const message = req.body.message;
        const sessionId = req.body.sessionId || uuidv4();
        const channel = req.body.channel || 'web';

        if (!message) {
            return res.status(400).json({ error: 'Message is required.' });
        }

        if (!userId) {
            return res.status(401).json({ error: 'userId is required. Please log in.' });
        }

        const result = await aiBroker.chat({ sessionId, userId, message, channel });

        res.json({
            sessionId,
            reply: result.reply,
            toolCalls: result.toolCalls,
        });
    } catch (err) {
        console.error('[AI Route] Chat error:', err.message);
        res.status(500).json({ error: 'AI Broker is temporarily unavailable.' });
    }
});

module.exports = router;
