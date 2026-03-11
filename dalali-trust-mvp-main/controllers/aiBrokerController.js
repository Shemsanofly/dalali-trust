'use strict';
/**
 * ╔═══════════════════════════════════════════════════════════════════╗
 * ║  SahaShares — Agentic Broker Brain                           ║
 * ║  AI controller with Function Calling for portfolio queries,     ║
 * ║  investment execution, and multi-turn session memory.           ║
 * ╠═══════════════════════════════════════════════════════════════════╣
 * ║  RULES:                                                         ║
 * ║  1. All returned amounts from tools are in INTEGER PESA.        ║
 * ║  2. The system prompt instructs the AI to format pesa ÷ 100     ║
 * ║     for user-facing display as TZS.                             ║
 * ║  3. Session memory uses AIInteraction.sessionId.                 ║
 * ║  4. Withdrawals > 500,000 TZS (50M pesa) trigger voice 2FA.    ║
 * ╚═══════════════════════════════════════════════════════════════════╝
 */

const OpenAI = require('openai');
const User = require('../models/User');
const Property = require('../models/Property');
const Investment = require('../models/Investment');
const AIInteraction = require('../models/AIInteraction');
const LedgerTransaction = require('../models/LedgerTransaction');

// ── OpenAI client ───────────────────────────────────────────────────────
let openai = null;
try {
    if (process.env.OPENAI_API_KEY) {
        openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
} catch (e) { /* OpenAI not available */ }

// ── System prompt ───────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are the SahaShares AI Broker — a professional, concise financial assistant for Tanzanian micro-investors.

RULES:
- You help users browse commercial retail properties ("vibanda"), check their portfolio, and execute investments.
- Always use real-time data from your tools. Never guess balances or property details.
- Display all currency as "TSh X" (Tanzanian Shillings). Internally you receive amounts in pesa (1 TZS = 100 pesa), so divide by 100 for display.
- Be warm but professional. Use simple language. Many users are first-time investors.
- If a user wants to withdraw more than TSh 500,000, inform them that voice PIN verification is required for security.
- Keep responses EXTREMELY concise to ensure fast loading times — max 2 short sentences unless the user asks for detail. Use markdown for bolding (**text**) or bullets.
- When listing properties, use simple markdown bullet points with name, location, share price, and funding progress.
- VERY IMPORTANT: You MUST append exactly 3 short follow-up questions the user can tap to ask you next. Do NOT include any prefixes, labels, or extra text. Format them EXACTLY at the very end of your response, separated by |||, like this:
|||Show my portfolio|||List available properties|||How do I withdraw?`;

// ── Tool definitions (Function Calling schema) ──────────────────────────
const TOOLS = [
    {
        type: 'function',
        function: {
            name: 'queryPortfolio',
            description: 'Fetches the user\'s wallet balance, total invested, total dividends, and list of owned shares with property details.',
            parameters: {
                type: 'object',
                properties: {
                    userId: { type: 'string', description: 'The MongoDB ObjectId of the user' },
                },
                required: ['userId'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'listAvailableProperties',
            description: 'Lists all properties currently open for investment (status = funding). Returns name, location, share price, available shares, funding progress, and ROI.',
            parameters: { type: 'object', properties: {} },
        },
    },
    {
        type: 'function',
        function: {
            name: 'getPropertyDetails',
            description: 'Gets detailed information about a specific property by its propertyId code.',
            parameters: {
                type: 'object',
                properties: {
                    propertyId: { type: 'string', description: 'The property code (e.g., KBS-20260305-0001)' },
                },
                required: ['propertyId'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'getTransactionHistory',
            description: 'Gets the user\'s recent transaction history from the ledger (last 10 entries).',
            parameters: {
                type: 'object',
                properties: {
                    userId: { type: 'string', description: 'The MongoDB ObjectId of the user' },
                },
                required: ['userId'],
            },
        },
    },
];

// ── Tool implementations ────────────────────────────────────────────────
async function queryPortfolio(userId) {
    const user = await User.findById(userId).lean();
    if (!user) return { error: 'User not found.' };

    const investments = await Investment.find({ userId })
        .populate('propertyId', 'name propertyId location monthlyROI status sharePrice')
        .lean();

    return {
        fullName: user.fullName,
        walletBalancePesa: user.walletBalance,
        totalInvestedPesa: user.totalInvested,
        totalDividendsPesa: user.totalDividends,
        investments: investments.map((inv) => ({
            propertyName: inv.propertyId?.name || 'Unknown',
            propertyCode: inv.propertyId?.propertyId || 'N/A',
            location: inv.propertyId?.location || '',
            sharesOwned: inv.sharesOwned,
            amountInvestedPesa: inv.amountInvested,
            dividendsEarnedPesa: inv.dividendsEarned || 0,
            monthlyROI: inv.propertyId?.monthlyROI || 0,
            propertyStatus: inv.propertyId?.status || 'unknown',
        })),
    };
}

async function listAvailableProperties() {
    const props = await Property.find({ status: 'funding' })
        .populate('ownerId', 'fullName')
        .lean();

    return props.map((p) => ({
        propertyId: p.propertyId,
        name: p.name,
        location: p.location,
        sharePricePesa: p.sharePrice,
        totalShares: p.totalShares,
        availableShares: p.availableShares,
        fundingProgressPercent: Math.round((p.currentFunding / p.targetFunding) * 100),
        targetFundingPesa: p.targetFunding,
        monthlyROI: p.monthlyROI,
        owner: p.ownerId?.fullName || 'Unknown',
    }));
}

async function getPropertyDetails(propertyId) {
    const prop = await Property.findOne({ propertyId: propertyId.toUpperCase() })
        .populate('ownerId', 'fullName')
        .lean();
    if (!prop) return { error: 'Property not found.' };

    return {
        propertyId: prop.propertyId,
        name: prop.name,
        location: prop.location,
        description: prop.description,
        sharePricePesa: prop.sharePrice,
        totalShares: prop.totalShares,
        availableShares: prop.availableShares,
        currentFundingPesa: prop.currentFunding,
        targetFundingPesa: prop.targetFunding,
        escrowBalancePesa: prop.escrowBalance,
        fundingProgressPercent: Math.round((prop.currentFunding / prop.targetFunding) * 100),
        monthlyROI: prop.monthlyROI,
        status: prop.status,
        owner: prop.ownerId?.fullName || 'Unknown',
    };
}

async function getTransactionHistory(userId) {
    const txns = await LedgerTransaction.find({ userId })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();

    return txns.map((t) => ({
        type: t.type,
        amountPesa: t.amount,
        status: t.status,
        description: t.description,
        balanceAfterPesa: t.balanceAfter,
        date: t.createdAt,
    }));
}

// ── Tool dispatcher ─────────────────────────────────────────────────────
const TOOL_MAP = {
    queryPortfolio: (args) => queryPortfolio(args.userId),
    listAvailableProperties: () => listAvailableProperties(),
    getPropertyDetails: (args) => getPropertyDetails(args.propertyId),
    getTransactionHistory: (args) => getTransactionHistory(args.userId),
};

// ── Session memory helpers ──────────────────────────────────────────────
async function loadSessionHistory(sessionId, limit = 20) {
    const msgs = await AIInteraction.find({ sessionId })
        .sort({ createdAt: 1 })
        .limit(limit)
        .lean();

    return msgs.map((m) => ({
        role: m.role,
        content: m.content,
    }));
}

async function saveMessage(sessionId, userId, channel, role, content) {
    return AIInteraction.create({ sessionId, userId, channel, role, content });
}

// ── Main chat handler ───────────────────────────────────────────────────
/**
 * Process a user message through the AI Broker.
 *
 * @param {Object} opts
 * @param {string} opts.sessionId - Conversation session ID
 * @param {string} opts.userId - MongoDB user ObjectId
 * @param {string} opts.message - User's text message
 * @param {string} [opts.channel='web'] - Channel (web, ussd, sms, voice)
 * @returns {{ reply: string, toolCalls: Array }}
 */
async function chat({ sessionId, userId, message, channel = 'web' }) {
    if (!openai) {
        return {
            reply: 'The AI Broker is currently offline. Please check your OPENAI_API_KEY configuration.',
            toolCalls: [],
        };
    }

    // Save user message to session
    await saveMessage(sessionId, userId, channel, 'user', message);

    // Load conversation history
    const history = await loadSessionHistory(sessionId);

    // Build messages array for OpenAI
    const messages = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...history,
    ];

    // First API call — may request tool calls
    let response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        tools: TOOLS,
        tool_choice: 'auto',
        temperature: 0.3,
        max_tokens: 500,
    });

    let assistantMessage = response.choices[0].message;
    const toolCalls = [];

    // Process tool calls in a loop (supports chained calls)
    while (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
        // Add assistant's tool_call message to history
        messages.push(assistantMessage);

        for (const toolCall of assistantMessage.tool_calls) {
            const fnName = toolCall.function.name;
            const fnArgs = JSON.parse(toolCall.function.arguments || '{}');

            // Always override userId with the real authenticated one from the session
            // (prevents AI from passing placeholder values like "user_id_placeholder")
            if (fnArgs.userId !== undefined || TOOL_MAP[fnName]?.length > 0) {
                fnArgs.userId = userId;
            }

            console.log(`[AI Broker] Tool call: ${fnName}(${JSON.stringify(fnArgs)})`);

            const handler = TOOL_MAP[fnName];
            let result;
            try {
                result = handler ? await handler(fnArgs) : { error: `Unknown tool: ${fnName}` };
            } catch (err) {
                result = { error: err.message };
            }

            toolCalls.push({ name: fnName, args: fnArgs, result });

            // Add tool result to messages
            messages.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                content: JSON.stringify(result),
            });
        }

        // Follow-up call with tool results
        response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages,
            tools: TOOLS,
            tool_choice: 'auto',
            temperature: 0.3,
            max_tokens: 500,
        });

        assistantMessage = response.choices[0].message;
    }

    const reply = assistantMessage.content || 'I apologize, I could not generate a response.';

    // Save assistant reply to session
    await saveMessage(sessionId, userId, channel, 'assistant', reply);

    return { reply, toolCalls };
}

module.exports = { chat, queryPortfolio, listAvailableProperties, getPropertyDetails };
