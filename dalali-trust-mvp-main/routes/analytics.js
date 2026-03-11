'use strict';
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Property = require('../models/Property');
const User = require('../models/User');
const Investment = require('../models/Investment');
const LedgerTransaction = require('../models/LedgerTransaction');

// GET /api/analytics/overview — aggregated platform stats
router.get('/overview', async (req, res) => {
    try {
        const [
            totalProperties,
            propertiesByStatus,
            propertiesByCategory,
            totalUsersResult,
            totalInvestedResult,
            topProperties,
            recentInvestments,
        ] = await Promise.all([
            Property.countDocuments(),
            Property.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
            Property.aggregate([{ $group: { _id: { $ifNull: ['$category', 'commercial'] }, count: { $sum: 1 } } }]),
            User.countDocuments(),
            User.aggregate([{ $group: { _id: null, total: { $sum: '$totalInvested' } } }]),
            Property.find()
                .select('name location targetFunding currentFunding status category monthlyROI')
                .sort({ currentFunding: -1 })
                .limit(8)
                .lean(),
            LedgerTransaction.find({ type: 'investment', status: 'completed' })
                .sort({ createdAt: -1 })
                .limit(10)
                .populate('userId', 'fullName phoneNumber')
                .lean(),
        ]);

        const statusMap = {};
        propertiesByStatus.forEach(s => { statusMap[s._id] = s.count; });

        const categoryMap = {};
        propertiesByCategory.forEach(c => { categoryMap[c._id] = c.count; });

        const totalInvestedPesa = totalInvestedResult[0]?.total || 0;

        const propertiesWithPct = topProperties.map(p => ({
            ...p,
            fundedPct: p.status === 'active' && p.currentFunding === 0
                ? 100
                : Math.min(Math.round((p.currentFunding / p.targetFunding) * 100), 100),
        }));

        res.json({
            success: true,
            totals: {
                properties: totalProperties,
                users: totalUsersResult,
                investedPesa: totalInvestedPesa,
                investedTZS: totalInvestedPesa / 100,
                funding: statusMap.funding || 0,
                active: statusMap.active || 0,
                closed: statusMap.closed || 0,
            },
            byCategory: Object.entries(categoryMap).map(([name, count]) => ({ name, count })),
            byStatus: [
                { name: 'Funding', value: statusMap.funding || 0, fill: '#22c55e' },
                { name: 'Active', value: statusMap.active || 0, fill: '#3b82f6' },
                { name: 'Closed', value: statusMap.closed || 0, fill: '#64748b' },
            ],
            topProperties: propertiesWithPct,
            recentActivity: recentInvestments.map(tx => ({
                investor: tx.userId?.fullName || 'Anonymous',
                amountTZS: tx.amount / 100,
                description: tx.description,
                date: tx.createdAt,
            })),
        });
    } catch (err) {
        console.error('[Analytics] Overview error:', err.message);
        res.status(500).json({ error: 'Could not fetch analytics.' });
    }
});

module.exports = router;
