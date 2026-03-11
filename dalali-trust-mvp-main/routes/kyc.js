'use strict';
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const Property = require('../models/Property');
const User = require('../models/User');
const authService = require('../services/authService');
const { sendSMS } = require('../services/smsService');

// Middleware to verify Bearer token
function requireToken(req, res, next) {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Not authenticated.' });
    const decoded = authService.verifyToken(auth.split(' ')[1]);
    if (!decoded) return res.status(401).json({ error: 'Invalid or expired token.' });
    req.userId = decoded.id;
    next();
}

// Use memory storage for the uploaded images so we can pass them to an AI vision API if needed,
// but for the MVP simulation, we just acknowledge the files were uploaded.
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit per file
});

/**
 * POST /api/kyc/extract
 * Simulated AI Extraction of text from documents.
 */
router.post('/extract', requireToken, upload.fields([{ name: 'nidaImage', maxCount: 1 }, { name: 'deedImage', maxCount: 1 }]), async (req, res) => {
    try {
        const { nidaImage, deedImage } = req.files || {};
        if (!nidaImage || !deedImage) {
            return res.status(400).json({ error: 'Both NIDA ID and Title Deed documents are required.' });
        }

        // Simulating AI extraction time
        await new Promise(resolve => setTimeout(resolve, 2500));

        res.json({
            success: true,
            extracted: {
                fullName: "JUMA RASHIDI MWANGI",
                nidaNumber: `19${Math.floor(10000 + Math.random() * 90000)}-${Math.floor(10000 + Math.random() * 90000)}`,
                location: "Kariakoo, Dar es Salaam",
                address: "Plot 42, Block C",
            }
        });
    } catch (err) {
        console.error('[KYC Extract Error]', err);
        res.status(500).json({ error: 'Internal server error during extraction.' });
    }
});

/**
 * POST /api/kyc/verify
 * Simulated AI Verification of NIDA and Title Deed documents.
 * In a production environment, this would call a Vision API (like Google Cloud Vision or OpenAI Vision)
 * to extract text and match the names. For this hackathon, we simulate the success/failure state.
 */
router.post('/verify', requireToken, upload.fields([{ name: 'nidaImage', maxCount: 1 }, { name: 'deedImage', maxCount: 1 }, { name: 'propertyImage', maxCount: 1 }]), async (req, res) => {
    try {
        const { nidaImage, deedImage, propertyImage } = req.files || {};
        const { fullName = '', phoneNumber = '', propertyName = '', location = '', address = '', rentMonthly = '0', roomType = 'bedsitter' } = req.body;

        if (!nidaImage || !deedImage || !propertyImage) {
            return res.status(400).json({ error: 'NIDA ID, Title Deed, and a Physical Property Photo are required.' });
        }

        if (!fullName || !phoneNumber || !location || !rentMonthly) {
            return res.status(400).json({ error: 'Please provide all property details.' });
        }

        // Simulating AI processing time
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Simulated AI extraction and matching logic
        // 90% chance of matching to simulate a positive user experience for the demo/MVP
        const isMatch = Math.random() > 0.1;

        if (!isMatch) {
            return res.json({
                success: false,
                match: false,
                confidence: Math.floor(Math.random() * (45 - 20) + 20), // 20-45%
                nidaName: fullName, // What it saw on NIDA
                deedName: "UNMATCHED NAME MASKED", // What it saw on Deed
                error: 'Document names do not match. Manual verification required.',
            });
        }

        const propertyId = `PROP-${uuidv4().substring(0, 8).toUpperCase()}`;
        // sharePrice in pesa: at least TSh 50,000 (5,000,000 pesa), or ~85× monthly rent
        const sharePricePesa = Math.floor(Math.max(5000000, parseInt(rentMonthly) * 85));
        const totalShares = 100;
        const targetFundingPesa = sharePricePesa * totalShares; // pre-validate hook will auto-compute sharePrice

        let uploadedImageUrl = 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=80';
        if (propertyImage && propertyImage[0]) {
            const b64 = propertyImage[0].buffer.toString('base64');
            const mime = propertyImage[0].mimetype;
            uploadedImageUrl = `data:${mime};base64,${b64}`;
        }

        // If matched, create the verified property in the database
        const newProperty = new Property({
            propertyId,
            name: propertyName || `${location.split(',')[0]} ${roomType.toUpperCase()} Investment`,
            description: `A newly added ${roomType} space located at ${address}, ${location}. Verified by SahaShares KYC.`,
            location,
            ownerId: req.userId,
            status: 'funding',
            targetFunding: targetFundingPesa,  // = sharePricePesa × totalShares (correct)
            currentFunding: 0,
            // sharePrice is auto-computed by pre-validate hook as targetFunding / totalShares
            totalShares,
            availableShares: totalShares,
            monthlyROI: Math.floor(Math.random() * (14 - 6) + 6), // 6-14% ROI
            imageUrl: uploadedImageUrl,
            images: [uploadedImageUrl],
            contacts: {
                phone: phoneNumber,
            }
        });

        await newProperty.save();

        // Send SMS confirmation
        try {
            const user = await User.findById(req.userId);
            if (user && user.phoneNumber) {
                await sendSMS({
                    to: user.phoneNumber,
                    message: `SahaShares: Safi! Property ${propertyId} ${location.split(',')[0]} has been VERIFIED & REGISTERED successfully. It is now live on the Marketplace.`
                });
            }
        } catch (smsErr) {
            console.error('[KYC SMS Error (Ignored)]', smsErr);
        }

        res.json({
            success: true,
            match: true,
            confidence: Math.floor(Math.random() * (99 - 88) + 88), // 88-99%
            nidaName: fullName.toUpperCase(),
            deedName: fullName.toUpperCase(),
            propertyId,
            tanzaniaRegistry: {
                titleRef: `CT No. ${Math.floor(10000 + Math.random() * 90000)}`,
                plot: Math.floor(1 + Math.random() * 500),
                block: String.fromCharCode(65 + Math.floor(Math.random() * 26)),
                district: location.split(',')[0].trim(),
                issuedOn: new Date(Date.now() - Math.random() * 100000000000).toISOString().split('T')[0],
                status: "ACTIVE_NO_ENCUMBRANCES",
            },
            message: 'Documents matched and property successfully registered for fractional funding.',
        });

    } catch (err) {
        console.error('[KYC Verify Error]', err);
        res.status(500).json({ error: 'Internal server error during verification.' });
    }
});

module.exports = router;
