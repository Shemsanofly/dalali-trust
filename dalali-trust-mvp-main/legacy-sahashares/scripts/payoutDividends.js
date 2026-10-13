'use strict';
/**
 * ╔═══════════════════════════════════════════════════════════════════╗
 * ║  SahaShares — Monthly Dividend Distributor                    ║
 * ║  Run: node scripts/payoutDividends.js                            ║
 * ║  Schedule: cron 0 0 1 * * (1st of every month, midnight EAT)    ║
 * ╠═══════════════════════════════════════════════════════════════════╣
 * ║  RULES:                                                         ║
 * ║  1. All math in INTEGER PESA (1 TZS = 100 pesa).                ║
 * ║  2. Dividend >= 100,000 pesa (1,000 TZS) → B2C M-Pesa payout.  ║
 * ║  3. Dividend <  100,000 pesa (1,000 TZS) → AT Airtime topup.    ║
 * ║  4. Every payout logged to LedgerTransaction (append-only).      ║
 * ║  5. User.totalDividends incremented atomically via $inc.         ║
 * ║  6. Property.escrowBalance remains untouched — dividends come    ║
 * ║     from operational revenue, not escrow.                        ║
 * ╚═══════════════════════════════════════════════════════════════════╝
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const mongoose = require('mongoose');

const Property = require('../models/Property');
const Investment = require('../models/Investment');
const User = require('../models/User');
const LedgerTransaction = require('../models/LedgerTransaction');
const { recordB2CPayout } = require('../services/paymentService');
const { sendAirtimeDividend } = require('../services/airtimeService');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/SahaShares';

// ── Pesa threshold: 1,000 TZS = 100,000 pesa ──────────────────────────
const B2C_THRESHOLD_PESA = 100_000;

async function payoutDividends() {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🏪 SahaShares — Monthly Dividend Distribution');
    console.log(`📅 ${new Date().toISOString()}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    await mongoose.connect(MONGODB_URI);
    console.log('[Payout] Connected to MongoDB.\n');

    // ── Step 1: Find all active (fully funded) properties ───────────
    const activeProperties = await Property.find({ status: 'active' }).lean();

    if (!activeProperties.length) {
        console.log('[Payout] No active properties found. Nothing to distribute.');
        await mongoose.disconnect();
        return;
    }

    console.log(`[Payout] Found ${activeProperties.length} active propert${activeProperties.length === 1 ? 'y' : 'ies'}.\n`);

    let totalDistributed = 0;
    let totalB2C = 0;
    let totalAirtime = 0;
    let totalFailed = 0;

    for (const property of activeProperties) {
        console.log(`┌─ ${property.name} (${property.propertyId})`);
        console.log(`│  Target: ${property.targetFunding} pesa | ROI: ${property.monthlyROI}%`);

        // ── Step 2: Calculate monthly yield pool (integer pesa) ──────
        // monthlyROI is stored as a percentage (e.g., 10 = 10%)
        // yield = targetFunding × (monthlyROI / 100)
        // We use integer division to stay in the pesa domain
        const yieldPoolPesa = Math.floor(
            (property.targetFunding * property.monthlyROI) / 100
        );

        console.log(`│  Monthly yield pool: ${yieldPoolPesa} pesa (${yieldPoolPesa / 100} TZS)`);

        // ── Step 3: Find all investors in this property ──────────────
        const investments = await Investment.find({ propertyId: property._id })
            .populate('userId', 'phoneNumber fullName walletBalance totalDividends')
            .lean();

        if (!investments.length) {
            console.log(`│  ⚠ No investors found. Skipping.`);
            console.log('└──────────────────────────────────────────\n');
            continue;
        }

        console.log(`│  Investors: ${investments.length}`);

        // ── Step 4: Calculate per-investor dividend ──────────────────
        for (const inv of investments) {
            const user = inv.userId;
            if (!user || !user.phoneNumber) {
                console.log(`│  ⚠ Skipping orphaned investment (userId missing)`);
                totalFailed++;
                continue;
            }

            // Dividend = yieldPool × (sharesOwned / totalShares)
            // Integer math: multiply first, then divide to minimize truncation
            const dividendPesa = Math.floor(
                (yieldPoolPesa * inv.sharesOwned) / property.totalShares
            );

            if (dividendPesa <= 0) {
                console.log(`│  ⚠ ${user.fullName}: 0 pesa dividend (rounding). Skipping.`);
                continue;
            }

            const dividendTZS = dividendPesa / 100;
            const routeLabel = dividendPesa >= B2C_THRESHOLD_PESA ? 'B2C M-Pesa' : 'Airtime';

            console.log(`│  💰 ${user.fullName}: ${dividendPesa} pesa (TSh ${dividendTZS.toLocaleString()}) → ${routeLabel}`);

            // ── Step 5: Atomic credit to user wallet ────────────────
            const updatedUser = await User.findOneAndUpdate(
                { _id: user._id },
                { $inc: { walletBalance: dividendPesa, totalDividends: dividendPesa } },
                { new: true }
            );

            // ── Step 6: Log to immutable ledger ─────────────────────
            const ledgerEntry = await LedgerTransaction.create({
                userId: user._id,
                amount: dividendPesa,
                type: 'dividend',
                status: 'completed',
                propertyId: property._id,
                balanceAfter: updatedUser.walletBalance,
                description: `Monthly dividend: ${inv.sharesOwned}/${property.totalShares} shares of ${property.name} (${property.monthlyROI}% ROI)`,
            });

            // ── Step 7: Route payout via AT ─────────────────────────
            try {
                if (dividendPesa >= B2C_THRESHOLD_PESA) {
                    // B2C M-Pesa payout (amount sent to AT in TZS)
                    await recordB2CPayout({
                        phoneNumber: user.phoneNumber,
                        amountTZS: dividendTZS,
                        reason: `SahaShares dividend: ${property.name}`,
                        ledgerEntryId: ledgerEntry._id,
                    });
                    totalB2C++;
                } else {
                    // Airtime top-up for micro-dividends
                    await sendAirtimeDividend(user.phoneNumber, dividendPesa);
                    totalAirtime++;
                }
            } catch (atErr) {
                console.error(`│  ❌ AT payout failed for ${user.fullName}: ${atErr.message}`);
                // Funds are already in the user's wallet — they can withdraw manually.
                // Mark the AT delivery attempt as failed but ledger stays completed.
                totalFailed++;
            }

            totalDistributed += dividendPesa;
        }

        console.log('└──────────────────────────────────────────\n');
    }

    // ── Summary ─────────────────────────────────────────────────────
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Distribution Summary');
    console.log(`   Total distributed: ${totalDistributed} pesa (TSh ${(totalDistributed / 100).toLocaleString()})`);
    console.log(`   B2C payouts:       ${totalB2C}`);
    console.log(`   Airtime top-ups:   ${totalAirtime}`);
    console.log(`   Failed deliveries: ${totalFailed}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    await mongoose.disconnect();
    console.log('[Payout] Done. Disconnected from MongoDB.');
}

// ── Execute ─────────────────────────────────────────────────────────────
payoutDividends().catch((err) => {
    console.error('[Payout] FATAL:', err);
    process.exit(1);
});
