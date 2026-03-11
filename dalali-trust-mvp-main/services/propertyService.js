'use strict';
const Property = require('../models/Property');
const LedgerTransaction = require('../models/LedgerTransaction');

/**
 * Find a specific property by its String ID (e.g. PROP-XXXXXX)
 */
async function findPropertyById(propertyId) {
    return await Property.findOne({ propertyId }).lean();
}

/**
 * Get recent property investments for the live feed
 */
async function getRecentTransactions(limit = 10) {
    const txns = await LedgerTransaction.find({ type: 'investment' })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('userId', 'fullName')
        .populate('propertyId', 'name location propertyId')
        .lean();

    return txns.map(t => ({
        _id: t._id,
        investorName: t.userId?.fullName || 'Anonymous User',
        amount: t.amount,
        propertyName: t.propertyId?.name,
        propertyId: t.propertyId?.propertyId,
        location: t.propertyId?.location,
        createdAt: t.createdAt
    }));
}

/**
 * Get properties that have been flagged by users
 */
async function getFlaggedProperties() {
    return await Property.find({ 'flaggedBy.0': { $exists: true } })
        .populate('ownerId', 'fullName phoneNumber')
        .lean();
}

module.exports = {
    findPropertyById,
    getRecentTransactions,
    getFlaggedProperties
};
