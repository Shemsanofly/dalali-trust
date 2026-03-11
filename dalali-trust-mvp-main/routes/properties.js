'use strict';
const express = require('express');
const router = express.Router();
const propertyService = require('../services/propertyService');
const Property = require('../models/Property');
const Investment = require('../models/Investment');
const authService = require('../services/authService');
const multer = require('multer');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// Middleware to verify Bearer token
function requireToken(req, res, next) {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Not authenticated.' });
    const decoded = authService.verifyToken(auth.split(' ')[1]);
    if (!decoded) return res.status(401).json({ error: 'Invalid or expired token.' });
    req.userId = decoded.id;
    next();
}

// ⚠️ IMPORTANT: Specific routes MUST come before /:id param route

// GET /properties/my-listings — get landlord properties
router.get('/my-listings', requireToken, async (req, res) => {
    try {
        console.log('[Properties] /my-listings called by:', req.userId);
        const props = await Property.find({ ownerId: req.userId }).sort({ createdAt: -1 });
        console.log(`[Properties] /my-listings Returning ${props.length} properties.`);
        res.json({ success: true, properties: props });
    } catch (err) {
        console.error('[Properties] My Listings error:', err.message);
        res.status(500).json({ error: 'Failed to fetch your properties.' });
    }
});

// POST /properties/:id/flag — flag a property as suspicious
router.post('/:id/flag', async (req, res) => {
    try {
        const prop = await Property.findOne({ propertyId: req.params.id.toUpperCase() });
        if (!prop) return res.status(404).json({ error: 'Property not found.' });
        const phone = req.body.phone || 'web-user';
        const reason = req.body.reason || 'Flagged from web';
        prop.flaggedBy.push({ phoneNumber: phone, reason });
        await prop.save();
        res.json({ success: true, message: 'Property flagged for review.' });
    } catch (err) {
        console.error('[Properties] Flag error:', err.message);
        res.status(500).json({ error: 'Could not flag property.' });
    }
});

// GET /properties/transactions/recent — live feed
router.get('/transactions/recent', async (req, res) => {
    try {
        const txns = await propertyService.getRecentTransactions(10);
        res.json(txns);
    } catch (err) {
        res.status(500).json({ error: 'Could not fetch transactions.' });
    }
});

// GET /properties — list flagged properties for admin queue
router.get('/', async (req, res) => {
    try {
        const flagged = await propertyService.getFlaggedProperties();
        res.json(flagged);
    } catch (err) {
        res.status(500).json({ error: 'Could not fetch properties.' });
    }
});

// GET /properties/:id/investors — get investors for a landlord's property
router.get('/:id/investors', requireToken, async (req, res) => {
    try {
        const prop = await Property.findOne({ propertyId: req.params.id.toUpperCase(), ownerId: req.userId });
        if (!prop) return res.status(404).json({ error: 'Property not found or unauthorized.' });

        const investments = await Investment.find({ propertyId: prop._id }).populate('userId', 'fullName phoneNumber');

        const investorMap = {};
        for (const inv of investments) {
            if (!inv.userId) continue;
            const uid = inv.userId._id.toString();
            if (!investorMap[uid]) {
                investorMap[uid] = {
                    name: inv.userId.fullName,
                    phone: inv.userId.phoneNumber,
                    shares: 0,
                    amountInvested: 0
                };
            }
            investorMap[uid].shares += inv.sharesOwned;
            investorMap[uid].amountInvested += inv.amountInvested;
        }

        res.json({ success: true, investors: Object.values(investorMap).sort((a, b) => b.shares - a.shares) });
    } catch (err) {
        console.error('[Properties] GET Investors error:', err.message);
        res.status(500).json({ error: 'Failed to fetch investors.' });
    }
});

// PUT /properties/:id — update property details and add images
router.put('/:id', requireToken, upload.array('newImages', 5), async (req, res) => {
    try {
        const prop = await Property.findOne({ propertyId: req.params.id.toUpperCase(), ownerId: req.userId });
        if (!prop) return res.status(404).json({ error: 'Property not found or unauthorized.' });

        const { name, description, mapUrl, amenities, contacts, videoUrl, tourUrl, category, titleDeedStatus, hasDispute } = req.body;

        if (name) prop.name = name;
        if (description) prop.description = description;
        if (mapUrl !== undefined) prop.mapUrl = mapUrl;
        if (videoUrl !== undefined) prop.videoUrl = videoUrl;
        if (tourUrl !== undefined) prop.tourUrl = tourUrl;
        if (category) prop.category = category;
        if (titleDeedStatus) prop.titleDeedStatus = titleDeedStatus;
        if (hasDispute !== undefined) prop.hasDispute = hasDispute === 'true' || hasDispute === true;

        if (amenities) {
            // Amenities might be sent as JSON string if multipart/form-data
            try { prop.amenities = JSON.parse(amenities); }
            catch { prop.amenities = amenities; }
        }

        if (contacts) {
            try { prop.contacts = { ...prop.contacts, ...JSON.parse(contacts) }; }
            catch { prop.contacts = { ...prop.contacts, ...contacts }; }
        }

        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                const b64 = file.buffer.toString('base64');
                prop.images.push(`data:${file.mimetype};base64,${b64}`);
            }
            // Ensure imageUrl is at least set
            if (!prop.imageUrl && prop.images.length > 0) {
                prop.imageUrl = prop.images[0];
            }
        }

        await prop.save();
        res.json({ success: true, property: prop });
    } catch (err) {
        console.error('[Properties] PUT update error:', err.message);
        res.status(500).json({ error: 'Failed to update property details.' });
    }
});

// GET /properties/:id — single property lookup (MUST be last)
router.get('/:id', async (req, res) => {
    try {
        const property = await propertyService.findPropertyById(req.params.id.toUpperCase());
        if (!property) return res.status(404).json({ error: 'Property not found.' });
        res.json(property);
    } catch (err) {
        console.error('[Properties Route] GET /:id', err.message);
        res.status(500).json({ error: 'Lookup failed.' });
    }
});

module.exports = router;
