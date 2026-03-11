'use strict';
const mongoose = require('mongoose');

/**
 * AIInteraction — Chat/voice event log with session memory.
 * sessionId groups multi-turn conversations so the AI Broker
 * can retrieve full conversation history for context.
 */

const aiInteractionSchema = new mongoose.Schema(
    {
        sessionId: {
            type: String,
            required: true,
            index: true,
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        channel: {
            type: String,
            enum: ['web', 'ussd', 'sms', 'voice'],
            required: true,
        },
        role: {
            type: String,
            enum: ['user', 'assistant', 'system', 'function'],
            required: true,
        },
        content: { type: String, default: '' },
        metadata: { type: mongoose.Schema.Types.Mixed },
    },
    { timestamps: true }
);

aiInteractionSchema.index({ sessionId: 1, createdAt: 1 });
aiInteractionSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('AIInteraction', aiInteractionSchema);
