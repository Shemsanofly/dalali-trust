'use strict';
/**
 * ussdService.js — SahaShares USSD menu engine.
 * Handles Africa's Talking USSD callback sessions.
 *
 * KEY IMPROVEMENTS:
 *  - Option 0 (Back) added at all sub-levels
 *  - Control number flow via Option 6
 *  - Payment method display (M-Pesa, HaloPesa, Airtel) with USSD codes
 *  - Correct funded % for active/closed properties
 */

const Property = require('../models/Property');
const User = require('../models/User');
const Investment = require('../models/Investment');
const { sendSMS } = require('./smsService');

// ─── Static translations ────────────────────────────────────────────────────
const t = {
    EN: {
        welcome: 'Welcome to SahaShares',
        menu: '1. Available Properties\n2. My Portfolio\n3. Wallet Balance\n4. Top Up Wallet\n5. Verify Property\n6. Pay with Control Number',
        noProps: 'No properties available at the moment.',
        availProps: 'Available Properties:',
        invalidChoice: 'Invalid choice.',
        enterShares: 'Enter number of shares:\n0. Back',
        invalidShares: 'Invalid number of shares.',
        propNotFound: 'Property not found.',
        summary: 'Summary:',
        sharesOf: 'shares of',
        total: 'Total: TSh',
        confirmMenu: '1. Confirm\n2. Cancel',
        regFirst: 'Please register on our web app first.',
        noInvestments: 'You have no investments. Dial *384*123# and choose 1.',
        portfolio: 'Your Portfolio:',
        unknown: 'Unknown',
        wallet: 'Wallet: TSh',
        invested: 'Invested: TSh',
        dividends: 'Dividends: TSh',
        topupTitle: 'Top Up - SahaShares',
        currBal: 'Current balance: TSh',
        enterAmount: 'Enter amount (TZS, min 100):\n0. Back',
        invalidAmount: 'Invalid amount. Min TSh 100.',
        tooLarge: 'Amount too large. Max TSh 5,000,000.',
        confirmDeposit: 'Confirm Deposit',
        amount: 'Amount: TSh',
        account: 'Account:',
        cancelDeposit: 'Deposit cancelled.',
        successDeposit: 'Deposited TSh',
        newBal: 'New balance: TSh',
        thanks: 'Thank you for using SahaShares!',
        invalidOverall: 'Invalid choice. Please try again.',
        enterPropId: 'Enter Property ID (e.g. PROP-A1B2C3):\n0. Back',
        propVerifFound: 'Property Verified.',
        owner: 'Owner:',
        verifSent: 'Details sent via SMS.',
        propVerifNotFound: 'Property ID not found.',
        enterControlNum: 'Enter your Control Number (e.g. DT-ABC123):\n0. Back',
        controlNotFound: 'Control number not found or expired.',
        controlSummary: 'Payment Summary:',
        controlConfirm: '1. Pay from Wallet\n2. Cancel\n0. Back',
        controlSuccess: 'Payment confirmed!',
        controlExpired: 'Control number expired. Generate a new one on the website.',
        payMethods: 'Pay via:\n• M-Pesa: *150*00#\n• HaloPesa: *150*88#\n• Airtel: *150*60#\nThen enter Control No:',
        back: '0. Back',
    },
    SW: {
        welcome: 'Karibu SahaShares',
        menu: '1. Vibanda Vinavyopatikana\n2. Portfolio Yangu\n3. Salio la Wallet\n4. Weka Pesa\n5. Hakiki Kibanda\n6. Lipa kwa Namba ya Udhibiti',
        noProps: 'Hakuna vibanda sasa hivi.',
        availProps: 'Vibanda Vinavyopatikana:',
        invalidChoice: 'Chaguo batili.',
        enterShares: 'Ingiza idadi ya hisa:\n0. Rudi',
        invalidShares: 'Idadi batili.',
        propNotFound: 'Kibanda hakipatikani.',
        summary: 'Muhtasari:',
        sharesOf: 'hisa za',
        total: 'Jumla: TSh',
        confirmMenu: '1. Thibitisha\n2. Ghairi',
        regFirst: 'Jiandikishe kwanza kwenye app yetu.',
        noInvestments: 'Bado hujawekeza. Piga *384*123# na chagua 1.',
        portfolio: 'Portfolio Yako:',
        unknown: 'Kisichojulikana',
        wallet: 'Wallet: TSh',
        invested: 'Imewekezwa: TSh',
        dividends: 'Gawio: TSh',
        topupTitle: 'Weka Pesa - SahaShares',
        currBal: 'Salio la sasa: TSh',
        enterAmount: 'Ingiza kiasi (TZS, kiwango cha chini 100):\n0. Rudi',
        invalidAmount: 'Kiasi batili. Kiwango cha chini ni TSh 100.',
        tooLarge: 'Kiasi kikubwa sana. Max TSh 5,000,000.',
        confirmDeposit: 'Thibitisha Malipo',
        amount: 'Kiasi: TSh',
        account: 'Akaunti:',
        cancelDeposit: 'Umeghairi kuweka pesa.',
        successDeposit: 'Umeweka TSh',
        newBal: 'Salio jipya: TSh',
        thanks: 'Asante kwa kutumia SahaShares!',
        invalidOverall: 'Chaguo batili. Tafadhali jaribu tena.',
        enterPropId: 'Ingiza Namba ya Kibanda (mf. PROP-A1B2C3):\n0. Rudi',
        propVerifFound: 'Kibanda Kimethibitishwa.',
        owner: 'Mmiliki:',
        verifSent: 'Taarifa zimetumwa kwa SMS.',
        propVerifNotFound: 'Namba ya Kibanda haijapatikana.',
        enterControlNum: 'Ingiza Namba ya Udhibiti (mf. DT-ABC123):\n0. Rudi',
        controlNotFound: 'Namba ya udhibiti haijapatikana au imeisha muda.',
        controlSummary: 'Muhtasari wa Malipo:',
        controlConfirm: '1. Lipa kutoka Wallet\n2. Ghairi\n0. Rudi',
        controlSuccess: 'Malipo yamekamilika!',
        controlExpired: 'Namba imeisha muda. Tengeneza mpya kwenye tovuti.',
        payMethods: 'Lipa kwa:\n• M-Pesa: *150*00#\n• HaloPesa: *150*88#\n• Airtel: *150*60#\nKisha ingiza Namba ya Udhibiti:',
        back: '0. Rudi',
    }
};

// ─── PendingPayment lazy-load (avoids circular-require issues) ──────────────
let PendingPayment;
function getPendingPayment() {
    if (!PendingPayment) PendingPayment = require('../models/PendingPayment');
    return PendingPayment;
}

/**
 * Process a USSD request from Africa's Talking.
 */
async function handleUSSD(sessionId, phoneNumber, text) {
    const parts = text.split('*').filter(Boolean);
    const level = parts.length;

    // ── Level 0: Language Selection ─────────────────────────────────────────
    if (level === 0) {
        return {
            response: 'CON Welcome to SahaShares\nChagua Lugha / Choose Language:\n1. English\n2. Swahili',
            isEnd: false,
        };
    }

    const langChoice = parts[0];
    const lang = langChoice === '1' ? 'EN' : 'SW';
    const loc = t[lang] || t.SW;

    // ── Level 1: Main menu ──────────────────────────────────────────────────
    if (level === 1) {
        return { response: `CON ${loc.welcome}\n${loc.menu}`, isEnd: false };
    }

    const choice = parts[1];

    // ── Helper: handle back navigation ─────────────────────────────────────
    // If user enters 0 at any sub-level, go one level up
    if (parts[parts.length - 1] === '0') {
        if (level === 2) return { response: `CON ${loc.welcome}\n${loc.menu}`, isEnd: false };
        // Level 3+ back → show parent option
        const parentChoice = parts[1];
        if (parentChoice === '1') {
            const props = await Property.find({ status: 'funding' }).lean();
            if (!props.length) return { response: `END ${loc.noProps}`, isEnd: true };
            let menu = `CON ${loc.availProps}\n`;
            props.slice(0, 5).forEach((p, i) => {
                const priceTZS = (p.sharePrice / 100).toLocaleString();
                menu += `${i + 1}. ${p.name} - TSh ${priceTZS}\n`;
            });
            menu += loc.back;
            return { response: menu, isEnd: false };
        }
        if (parentChoice === '4') {
            const user = await User.findOne({ phoneNumber }).lean();
            if (!user) return { response: `END ${loc.regFirst}`, isEnd: true };
            const balTZS = (user.walletBalance / 100).toLocaleString();
            return { response: [`CON ${loc.topupTitle}`, `${loc.currBal} ${balTZS}`, '', loc.enterAmount].join('\n'), isEnd: false };
        }
        // Generic back to main menu
        return { response: `CON ${loc.welcome}\n${loc.menu}`, isEnd: false };
    }

    // ── Option 1: View Properties ───────────────────────────────────────────
    if (choice === '1') {
        if (level === 2) {
            const props = await Property.find({ status: 'funding' }).lean();
            if (!props.length) return { response: `END ${loc.noProps}`, isEnd: true };
            let menu = `CON ${loc.availProps}\n`;
            props.slice(0, 5).forEach((p, i) => {
                const priceTZS = (p.sharePrice / 100).toLocaleString();
                menu += `${i + 1}. ${p.name} - TSh ${priceTZS}\n`;
            });
            menu += loc.back;
            return { response: menu, isEnd: false };
        }
        if (level === 3) {
            const props = await Property.find({ status: 'funding' }).lean();
            const idx = parseInt(parts[2], 10) - 1;
            const prop = props[idx];
            if (!prop) return { response: `END ${loc.invalidChoice}`, isEnd: true };
            const priceTZS = (prop.sharePrice / 100).toLocaleString();
            const fundedPct = Math.round((prop.currentFunding / prop.targetFunding) * 100);
            return {
                response: [
                    `CON ${prop.name}`,
                    `${prop.location}`,
                    `TSh ${priceTZS}/share`,
                    `${fundedPct}% funded (${prop.availableShares} left)`,
                    `ROI ${prop.monthlyROI}%/mo`,
                    '',
                    loc.enterShares,
                ].join('\n'),
                isEnd: false,
            };
        }
        if (level === 4) {
            const shares = parseInt(parts[3], 10);
            if (!shares || shares < 1) return { response: `END ${loc.invalidShares}`, isEnd: true };
            const props = await Property.find({ status: 'funding' }).lean();
            const prop = props[parseInt(parts[2], 10) - 1];
            if (!prop) return { response: `END ${loc.propNotFound}`, isEnd: true };
            const costTZS = ((prop.sharePrice * shares) / 100).toLocaleString();
            const propId = prop.propertyId;
            // Show control number payment instructions
            return {
                response: [
                    `CON ${loc.summary}`,
                    `${shares} ${loc.sharesOf} ${prop.name}`,
                    `${loc.total} ${costTZS}`,
                    '',
                    loc.payMethods,
                    propId,
                    '',
                    'Or go to website & pay from wallet.',
                    '0. Back',
                ].join('\n'),
                isEnd: false,
            };
        }
    }

    // ── Option 2: My Portfolio ──────────────────────────────────────────────
    if (choice === '2') {
        const user = await User.findOne({ phoneNumber }).lean();
        if (!user) return { response: `END ${loc.regFirst}`, isEnd: true };
        const investments = await Investment.find({ userId: user._id }).populate('propertyId', 'name monthlyROI').lean();
        if (!investments.length) return { response: `END ${loc.noInvestments}`, isEnd: true };
        let msg = `END ${loc.portfolio}\n`;
        investments.forEach((inv) => {
            const name = inv.propertyId?.name || loc.unknown;
            const valueTZS = (inv.amountInvested / 100).toLocaleString();
            msg += `${name}: ${inv.sharesOwned} shares (TSh ${valueTZS})\n`;
        });
        return { response: msg, isEnd: true };
    }

    // ── Option 3: Wallet Balance ────────────────────────────────────────────
    if (choice === '3') {
        const user = await User.findOne({ phoneNumber }).lean();
        if (!user) return { response: `END ${loc.regFirst}`, isEnd: true };
        const balTZS = (user.walletBalance / 100).toLocaleString();
        const invTZS = (user.totalInvested / 100).toLocaleString();
        const divTZS = (user.totalDividends / 100).toLocaleString();
        return {
            response: `END ${loc.wallet} ${balTZS}\n${loc.invested} ${invTZS}\n${loc.dividends} ${divTZS}`,
            isEnd: true,
        };
    }

    // ── Option 4: Top Up Wallet ─────────────────────────────────────────────
    if (choice === '4') {
        const user = await User.findOne({ phoneNumber }).lean();
        if (!user) return { response: `END ${loc.regFirst}`, isEnd: true };

        if (level === 2) {
            const balTZS = (user.walletBalance / 100).toLocaleString();
            return {
                response: [`CON ${loc.topupTitle}`, `${loc.currBal} ${balTZS}`, '', loc.enterAmount].join('\n'),
                isEnd: false,
            };
        }
        if (level === 3) {
            const amountTZS = parseFloat(parts[2]);
            if (!amountTZS || amountTZS < 100) return { response: `END ${loc.invalidAmount}`, isEnd: true };
            if (amountTZS > 5000000) return { response: `END ${loc.tooLarge}`, isEnd: true };
            return {
                response: [`CON ${loc.confirmDeposit}`, `${loc.amount} ${amountTZS.toLocaleString()}`, `${loc.account} ${user.fullName}`, '', loc.confirmMenu, loc.back].join('\n'),
                isEnd: false,
            };
        }
        if (level === 4) {
            const amountTZS = parseFloat(parts[2]);
            const confirm = parts[3];
            if (confirm === '2') return { response: `END ${loc.cancelDeposit}`, isEnd: true };
            if (!amountTZS || amountTZS < 100) return { response: `END ${loc.invalidChoice}`, isEnd: true };
            const amtPesa = Math.round(amountTZS * 100);
            const updatedUserTopup = await User.findByIdAndUpdate(
                user._id,
                { $inc: { walletBalance: amtPesa } },
                { new: true }
            );
            // Log to LedgerTransaction so it shows in dashboard transaction history
            try {
                const LedgerTransaction = require('../models/LedgerTransaction');
                await LedgerTransaction.create({
                    userId: user._id,
                    amount: amtPesa,
                    type: 'deposit',
                    status: 'completed',
                    balanceAfter: updatedUserTopup.walletBalance,
                    description: `USSD direct top-up: TSh ${amountTZS.toLocaleString()}`,
                });
            } catch (ledgerErr) {
                console.warn('[USSD] Ledger write failed for top-up:', ledgerErr.message);
            }
            const newBalTZS = (updatedUserTopup.walletBalance / 100).toLocaleString();
            return {
                response: `END ${loc.successDeposit} ${amountTZS.toLocaleString()} TSh!\n${loc.newBal} ${newBalTZS}\n\n${loc.thanks}`,
                isEnd: true,
            };
        }
    }

    // ── Option 5: Verify Property ───────────────────────────────────────────
    if (choice === '5') {
        if (level === 2) return { response: `CON ${loc.enterPropId}`, isEnd: false };
        if (level === 3) {
            const propId = parts[2].trim().toUpperCase();
            const property = await Property.findOne({ propertyId: propId });
            if (!property || property.status === 'review' || property.status === 'rejected') {
                return { response: `END ${loc.propVerifNotFound}`, isEnd: true };
            }
            let ownerName = property.ownerName;
            if (!ownerName) {
                const oUser = await User.findById(property.ownerId);
                ownerName = oUser ? oUser.fullName : 'Verified Landlord';
            }
            const legalStatus = property.titleDeedStatus === 'clean' ? 'Clean Title ✅' :
                property.hasDispute ? 'Dispute on Record ⚠️' :
                    'Status: Under Review';
            const smsText = `SahaShares: ${loc.propVerifFound} ID: ${property.propertyId}. ${property.name}, ${property.location}. ${loc.owner} ${ownerName}. Legal: ${legalStatus}.`;
            sendSMS({ to: phoneNumber, message: smsText }).catch(err => console.error('[USSD Verifn SMS]', err.message));
            return {
                response: `END ${loc.propVerifFound}\n${propId}\n${property.name}\n${legalStatus}\n${loc.verifSent}`,
                isEnd: true,
            };
        }
    }

    // ── Option 6: Pay with Control Number ──────────────────────────────────
    if (choice === '6') {
        const PP = getPendingPayment();

        if (level === 2) {
            return { response: `CON ${loc.enterControlNum}`, isEnd: false };
        }
        if (level === 3) {
            // Show summary for the entered control number
            const cn = parts[2].trim().toUpperCase();
            const PP = getPendingPayment();
            const pending = await PP.findOne({ controlNumber: cn, status: 'pending' });
            if (!pending || pending.expiresAt < new Date()) {
                if (pending) { pending.status = 'expired'; await pending.save(); }
                return { response: `END ${loc.controlExpired}`, isEnd: true };
            }
            const costTZS = (pending.amountPesa / 100).toLocaleString();
            const desc = pending.description || (pending.type === 'topup' ? `Wallet Top-Up` : `Investment`);
            return {
                response: [
                    `CON ${loc.controlSummary}`,
                    `Type: ${pending.type === 'topup' ? '💰 Wallet Top-Up' : '🏠 Investment'}`,
                    `Details: ${desc}`,
                    `Amount: TSh ${costTZS}`,
                    ``,
                    `Enter 4-digit PIN to confirm:`,
                    `(Any 4 digits, e.g. 1234)`,
                    `0. Back`,
                ].join('\n'),
                isEnd: false,
            };
        }
        if (level === 4) {
            // PIN entered — validate it's exactly 4 digits then execute payment
            const cn = parts[2].trim().toUpperCase();
            const pin = parts[3].trim();
            if (pin === '0') return { response: `CON ${loc.welcome}\n${loc.menu}`, isEnd: false };
            if (!/^\d{4}$/.test(pin)) {
                return { response: `END PIN must be exactly 4 digits. Please try again.`, isEnd: true };
            }

            const PP = getPendingPayment();
            const pending = await PP.findOne({ controlNumber: cn, status: 'pending' });
            if (!pending || pending.expiresAt < new Date()) {
                return { response: `END ${loc.controlExpired}`, isEnd: true };
            }
            const user = await User.findOne({ phoneNumber });
            if (!user) return { response: `END ${loc.regFirst}`, isEnd: true };

            // Verify this control number belongs to this user
            if (pending.userId.toString() !== user._id.toString()) {
                return { response: `END Invalid control number for this account.`, isEnd: true };
            }

            const costTZS = (pending.amountPesa / 100).toLocaleString();

            // ── TOPUP: credit wallet directly ──────────────────────────────
            if (pending.type === 'topup') {
                const updatedUser = await User.findByIdAndUpdate(
                    user._id,
                    { $inc: { walletBalance: pending.amountPesa } },
                    { new: true }
                );
                pending.status = 'completed';
                await pending.save();

                // Log it
                const LedgerTransaction = require('../models/LedgerTransaction');
                await LedgerTransaction.create({
                    userId: user._id,
                    amount: pending.amountPesa,
                    type: 'deposit',
                    status: 'completed',
                    balanceAfter: updatedUser.walletBalance,
                    description: `USSD Top-up via control number ${cn}`,
                });

                const newBalTZS = (updatedUser.walletBalance / 100).toLocaleString();
                sendSMS({
                    to: phoneNumber,
                    message: `SahaShares: Wallet imejazwa TSh ${costTZS}. Salio jipya: TSh ${newBalTZS}. Asante!`
                }).catch(() => { });

                return {
                    response: `END ✅ ${loc.controlSuccess}\nTSh ${costTZS} added to wallet.\n${loc.newBal} ${newBalTZS}`,
                    isEnd: true,
                };
            }

            // ── INVESTMENT: buy shares ─────────────────────────────────────
            // STEP 1: Debit wallet first (atomic — fails if insufficient balance)
            const updatedUser = await User.findOneAndUpdate(
                { _id: user._id, walletBalance: { $gte: pending.amountPesa } },
                { $inc: { walletBalance: -pending.amountPesa, totalInvested: pending.amountPesa } },
                { new: true }
            );
            if (!updatedUser) return { response: `END Insufficient wallet balance.`, isEnd: true };

            // STEP 2: Decrement property shares (atomic aggregation pipeline)
            const prop = await Property.findOneAndUpdate(
                { _id: pending.propertyId, availableShares: { $gte: pending.sharesCount }, status: 'funding' },
                [
                    { $set: { availableShares: { $subtract: ['$availableShares', pending.sharesCount] }, currentFunding: { $add: ['$currentFunding', pending.amountPesa] }, escrowBalance: { $add: ['$escrowBalance', pending.amountPesa] } } },
                    { $set: { status: { $cond: [{ $gte: ['$currentFunding', '$targetFunding'] }, 'active', '$status'] } } },
                ],
                { new: true }
            );
            if (!prop) {
                // Rollback wallet debit — property unavailable
                await User.findOneAndUpdate(
                    { _id: user._id },
                    { $inc: { walletBalance: pending.amountPesa, totalInvested: -pending.amountPesa } }
                );
                return { response: `END Property no longer available.`, isEnd: true };
            }

            const Investment = require('../models/Investment');
            await Investment.findOneAndUpdate(
                { userId: user._id, propertyId: prop._id },
                { $inc: { sharesOwned: pending.sharesCount, amountInvested: pending.amountPesa }, $setOnInsert: { purchasedAt: new Date() } },
                { upsert: true }
            );

            pending.status = 'completed';
            await pending.save();

            const newBalTZS = (updatedUser.walletBalance / 100).toLocaleString();
            sendSMS({ to: phoneNumber, message: `SahaShares: Umefanikiwa kununua hisa ${pending.sharesCount} za "${prop.name}". Salio: TSh ${newBalTZS}.` }).catch(() => { });

            return {
                response: `END ✅ ${loc.controlSuccess}\n${pending.sharesCount} shares of ${prop.name}.\n${loc.newBal} ${newBalTZS}`,
                isEnd: true,
            };
        }
    }

    return { response: `END ${loc.invalidOverall}`, isEnd: true };
}

/**
 * Adapter called from ussd.js route.
 */
async function handleSession({ sessionId, phoneNumber, text }) {
    const { response } = await handleUSSD(sessionId, phoneNumber, text);
    const spaceIdx = response.indexOf(' ');
    return {
        prefix: response.substring(0, spaceIdx),
        body: response.substring(spaceIdx + 1),
    };
}

module.exports = { handleUSSD, handleSession };
