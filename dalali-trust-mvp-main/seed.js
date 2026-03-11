'use strict';
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('./models/User');
const Property = require('./models/Property');
const Investment = require('./models/Investment');
const LedgerTransaction = require('./models/LedgerTransaction');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/SahaShares';

async function seed() {
    console.log('[Seed] Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('[Seed] Connected.');

    // ── Clear old data ──────────────────────────────────────────────────
    await Promise.all([
        User.deleteMany({}),
        Property.deleteMany({}),
        Investment.deleteMany({}),
        LedgerTransaction.deleteMany({}),
    ]);
    console.log('[Seed] Cleared existing collections.');

    // ── Users ────────────────────────────────────────────────────────────
    const hash = await bcrypt.hash('password123', 10);

    const admin = await User.create({
        fullName: 'Dixon Admin',
        phoneNumber: '+255700000001',
        nidaId: '19900101-00001-00001-1',
        passwordHash: hash,
        role: 'admin',
        walletBalance: 0,
        verified: true,
    });

    const landlord = await User.create({
        fullName: 'Mama Halima Shops',
        phoneNumber: '+255712345678',
        nidaId: '19850315-00002-00002-2',
        passwordHash: hash,
        role: 'landlord',
        walletBalance: 0,
        verified: true,
    });

    const investor1 = await User.create({
        fullName: 'Juma Rashid',
        phoneNumber: '+255755111222',
        nidaId: '19920420-00003-00003-3',
        passwordHash: hash,
        role: 'user',
        walletBalance: 500000 * 100, // 500,000 TZS in pesa
        totalInvested: 0,
        totalDividends: 0,
        verified: true,
    });

    const investor2 = await User.create({
        fullName: 'Amina Saidi',
        phoneNumber: '+255768333444',
        nidaId: '19950610-00004-00004-4',
        passwordHash: hash,
        role: 'user',
        walletBalance: 300000 * 100, // 300,000 TZS in pesa
        totalInvested: 0,
        totalDividends: 0,
        verified: true,
    });

    // ── Developer test account (for SMS/USSD testing from real phone) ────────
    const devUser = await User.create({
        fullName: 'Dixon Dev',
        phoneNumber: '+255614940750',
        nidaId: '19900101-00005-00005-5',
        passwordHash: hash,
        role: 'user',
        walletBalance: 1000000 * 100, // 1,000,000 TZS
        totalInvested: 0,
        totalDividends: 0,
        verified: true,
    });

    console.log('[Seed] Created 4 users (admin, landlord, 2 investors).');

    // ── Properties (hyper-local Kariakoo) ────────────────────────────────
    // All amounts in PESA (TZS × 100)
    const prop1 = await Property.create({
        propertyId: 'KBS-20260305-0001',
        ownerId: landlord._id,
        name: 'Prime Retail Corner Kariakoo',
        location: 'Msimbazi St, Kariakoo, Dar es Salaam',
        description: 'An exceptional high-traffic retail frame situated at the very heart of the Kariakoo commercial district. Perfectly positioned for electronics, wholesale clothing, or a mobile network franchise. Consistent foot traffic 7 days a week.',
        imageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=1974&auto=format&fit=crop',
        images: [
            'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=1974&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1580193769210-b8d1c049a7d9?q=80&w=1974&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1518599904199-0ca897819ddb?q=80&w=2072&auto=format&fit=crop'
        ],
        mapUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d15846.545803401146!2d39.2662283!3d-6.8143!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x185c4b1235b6c2cb%3A0xe5a225de9c600109!2sKariakoo%2C%20Dar%20es%20Salaam%2C%20Tanzania!5e0!3m2!1sen!2sus!4v1709772349001!5m2!1sen!2sus',
        amenities: ['Heavy Foot Traffic', '24/7 Security Patrol', 'Backup Generator', 'Paved Access', 'Water Supply'],
        contacts: {
            phone: '+255712345678',
            whatsapp: '+255712345678',
            email: 'info@kariakooholdings.tz',
            instagram: '@kariakoo_prime'
        },
        targetFunding: 15000000 * 100, // 15M TZS in pesa
        totalShares: 1000,
        monthlyROI: 14,
        status: 'funding',
        category: 'commercial'
    });

    const prop2 = await Property.create({
        propertyId: 'KBS-20260305-0002',
        ownerId: landlord._id,
        name: 'The Mwenge Artisan Pavilion',
        location: 'Mwenge Woodcarvers Market, Dar es Salaam',
        description: 'A beautifully structured artisan pavilion located within the iconic Mwenge tourist route. Features extensive display shelving, excellent natural lighting, and strong appeal to international tourists.',
        imageUrl: '/assets/property-2.png',
        images: [
            '/assets/property-2.png',
            '/assets/property-1.png'
        ],
        mapUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d31693.30560796347!2d39.22019945!3d-6.76449175!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x185c4ddaf898b955%3A0x6b44a47fb845fa8b!2sMwenge%2C%20Dar%20es%20Salaam%2C%20Tanzania!5e0!3m2!1sen!2sus!4v1709772481002!5m2!1sen!2sus',
        amenities: ['Tourist Hotspot', 'Display Lighting', 'Tour Bus Parking', 'Cultural Heritage Site'],
        contacts: {
            phone: '+255712345678',
            whatsapp: '+255712345678'
        },
        targetFunding: 7500000 * 100, // 7.5M TZS in pesa
        totalShares: 500,
        monthlyROI: 11,
        status: 'funding',
        category: 'commercial'
    });

    const prop3 = await Property.create({
        propertyId: 'KBS-20260305-0003',
        ownerId: landlord._id,
        name: 'Mlimani City Mini-Mart East',
        location: 'Mlimani City Mall, Ubungo, Dar es Salaam',
        description: 'A premium retail location inside Dar es Salaam\'s busiest shopping mall. Features high-end glass storefronts, central AC, and guarantees foot traffic from affluent shoppers daily.',
        imageUrl: '/assets/property-1.png',
        images: [
            '/assets/property-1.png',
            '/assets/property-2.png'
        ],
        mapUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d15847.112803401146!2d39.2162283!3d-6.7743!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x185c4b1235b6c2cb%3A0xe5a225de9c600109!2sMlimani%20City%20Mall%2C%20Dar%20es%20Salaam%2C%20Tanzania!5e0!3m2!1sen!2sus!4v1709772349001!5m2!1sen!2sus',
        amenities: ['Mall Security', 'Central AC', 'Parking Lot', 'Food Court Adjacent'],
        contacts: {
            phone: '+255712345678',
            email: 'sales@mlimanimart.tz'
        },
        targetFunding: 25000000 * 100, // 25M TZS in pesa
        totalShares: 1000,
        monthlyROI: 12,
        status: 'active', // Fully funded
        category: 'commercial'
    });

    const prop4 = await Property.create({
        propertyId: 'KBS-20260305-0004',
        ownerId: landlord._id,
        name: 'Kigamboni Beachfront Estate Phase 1',
        location: 'Kigamboni, Dar es Salaam',
        description: 'A pre-construction residential estate offering modern beachfront apartments. High demand for rental yields from expatriates and corporate executives.',
        imageUrl: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?q=80&w=1974&auto=format&fit=crop',
        images: [
            'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?q=80&w=1974&auto=format&fit=crop'
        ],
        mapUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d31692!2d39!3d-6!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0!2zMTPCsDA4JzE0LjAiUyA0MsKwMTknMzguMCJF!5e0!3m2!1sen!2sus!4v1709772349000!5m2!1sen!2sus',
        amenities: ['Ocean View', 'Swimming Pool', 'Gated Community', 'Gym'],
        contacts: {
            phone: '+255712345678'
        },
        targetFunding: 50000000 * 100, // 50M TZS
        totalShares: 2000,
        monthlyROI: 9,
        status: 'funding',
        category: 'residential',
        titleDeedStatus: 'clean',
        ownerVerified: true,
    });

    const prop5 = await Property.create({
        propertyId: 'KBS-20260305-0005',
        ownerId: landlord._id,
        name: 'Kibaha Assembly Plant Facility',
        location: 'Kibaha Industrial Zone, Pwani',
        description: 'A massive 20,000 sq ft industrial facility equipped with heavy-duty power lines, loading docks, and 24/7 designated truck routes. Fully tenanted by a packaging firm with a 5-year lease.',
        imageUrl: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=2070&auto=format&fit=crop',
        images: [
            'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=2070&auto=format&fit=crop'
        ],
        mapUrl: 'https://www.google.com/maps/embed?pb=...',
        amenities: ['3-Phase Power', 'Loading Docks', 'Industrial Zoning', 'Heavy Transport Access'],
        contacts: {
            phone: '+255712345678'
        },
        targetFunding: 120000000 * 100, // 120M TZS
        totalShares: 4000,
        monthlyROI: 15,
        status: 'funding',
        category: 'industrial',
        titleDeedStatus: 'clean',
    });

    const prop6 = await Property.create({
        propertyId: 'KBS-20260305-0006',
        ownerId: landlord._id,
        name: 'Dodoma Prime Agricultural Plots',
        location: 'Chamwino, Dodoma',
        description: 'Prime agricultural land located near the capital city expansion zones. Currently leased to a commercial farming enterprise specializing in sunflower oil production.',
        imageUrl: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=2064&auto=format&fit=crop',
        images: [
            'https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=2064&auto=format&fit=crop'
        ],
        mapUrl: 'https://www.google.com/maps/embed?pb=...',
        amenities: ['Irrigation Ready', 'Fertile Soil', 'Road Access', 'Borehole Water'],
        contacts: {
            phone: '+255712345678'
        },
        targetFunding: 30000000 * 100, // 30M TZS
        totalShares: 1500,
        monthlyROI: 8,
        status: 'funding',
        category: 'land',
    });

    const prop7 = await Property.create({
        propertyId: 'KBS-20260305-0007',
        ownerId: landlord._id,
        name: 'Arusha CBD Mixed-Use Tower',
        location: 'Clock Tower Roundabout, Arusha',
        description: 'A newly constructed 8-story tower featuring ground-floor retail, mid-level office spaces, and top-floor residential penthouses. Provides diversified income streams in Arusha CBD.',
        imageUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop',
        images: [
            'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop'
        ],
        mapUrl: 'https://www.google.com/maps/embed?pb=...',
        amenities: ['Elevator', 'Basement Parking', 'Retail Ground Floor', 'City Views'],
        contacts: {
            phone: '+255712345678'
        },
        targetFunding: 90000000 * 100, // 90M TZS
        totalShares: 3000,
        monthlyROI: 11,
        status: 'funding',
        category: 'mixed',
        titleDeedStatus: 'clean',
        ownerVerified: true,
    });

    console.log('[Seed] Created 7 existing properties.');

    // --- NEW MICRO-PROPERTIES (10,000 TSh per share) ---
    // 10,000 TSh = 1,000,000 pesa

    const prop8 = await Property.create({
        propertyId: 'KBS-20260305-0008',
        ownerId: landlord._id,
        name: 'Kinondoni Student Hostel Block A',
        location: 'Kinondoni Studio, Dar es Salaam',
        description: 'A 20-room student hostel located near major bus routes and universities. Exceptional occupancy rates year-round with steady, reliable rental income from students.',
        imageUrl: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?q=80&w=2069&auto=format&fit=crop',
        images: ['https://images.unsplash.com/photo-1555854877-bab0e564b8d5?q=80&w=2069&auto=format&fit=crop'],
        mapUrl: 'https://www.google.com/maps/embed?pb=...',
        amenities: ['Free Wi-Fi', '24/7 Security', 'Shared Kitchens', 'Study Lounges'],
        contacts: { phone: '+255712345678' },
        targetFunding: 20000000 * 100, // 20M TZS
        totalShares: 2000, // 20M / 2000 = 10,000 TZS per share
        monthlyROI: 13,
        status: 'funding',
        category: 'residential',
        titleDeedStatus: 'clean',
        ownerVerified: true,
    });

    const prop9 = await Property.create({
        propertyId: 'KBS-20260305-0009',
        ownerId: landlord._id,
        name: 'Bagamoyo Logistics Hub Warehouse',
        location: 'Bagamoyo SEZ Area, Pwani',
        description: 'A robust transit warehouse in the Special Economic Zone. High demand from importers needing temporary storage before distributing across East Africa.',
        imageUrl: '/assets/property-1.png',
        images: ['/assets/property-1.png', '/assets/property-2.png'],
        mapUrl: 'https://www.google.com/maps/embed?pb=...',
        amenities: ['Heavy Vehicle Access', 'Forklift Ready', '24/7 Power'],
        contacts: { phone: '+255712345678' },
        targetFunding: 50000000 * 100, // 50M TZS
        totalShares: 5000, // 50M / 5000 = 10,000 TZS per share
        monthlyROI: 14,
        status: 'funding',
        category: 'industrial',
        titleDeedStatus: 'clean',
    });

    const prop10 = await Property.create({
        propertyId: 'KBS-20260305-0010',
        ownerId: landlord._id,
        name: 'Kigamboni Future Development Land',
        location: 'Dege Eco Village Road, Kigamboni',
        description: 'A securely fenced 2-acre plot in a rapidly appreciating residential zone. The land is currently leased to a commercial nursery, providing passive yield while the land value appreciates.',
        imageUrl: 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?q=80&w=2070&auto=format&fit=crop',
        images: ['https://images.unsplash.com/photo-1464226184884-fa280b87c399?q=80&w=2070&auto=format&fit=crop'],
        mapUrl: 'https://www.google.com/maps/embed?pb=...',
        amenities: ['Fenced', 'Water Access', 'Clear Title', 'Main Road Frontage'],
        contacts: { phone: '+255712345678' },
        targetFunding: 15000000 * 100, // 15M TZS
        totalShares: 1500, // 15M / 1500 = 10,000 TZS per share
        monthlyROI: 9, // Land yield is usually lower, offset by appreciation
        status: 'funding',
        category: 'land',
    });

    const prop11 = await Property.create({
        propertyId: 'KBS-20260305-0011',
        ownerId: landlord._id,
        name: 'Mbezi Beach Live/Work Studios',
        location: 'Tanganyika Packers Area, Mbezi Beach',
        description: 'A modern mixed-use block featuring ground floor retail spaces and first-floor creative living studios. Popular with young professionals and digital nomads.',
        imageUrl: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=2070&auto=format&fit=crop',
        images: ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=2070&auto=format&fit=crop'],
        mapUrl: 'https://www.google.com/maps/embed?pb=...',
        amenities: ['Fiber Internet', 'Cafe on Ground Floor', 'Ocean Breeze', 'Parking'],
        contacts: { phone: '+255712345678' },
        targetFunding: 35000000 * 100, // 35M TZS
        totalShares: 3500, // 35M / 3500 = 10,000 TZS per share
        monthlyROI: 12,
        status: 'funding',
        category: 'mixed',
    });

    console.log('[Seed] Created 4 additional 10k TSh micro-properties.');

    // ── Sample investments ───────────────────────────────────────────────
    const inv1Cost = 10 * prop1.sharePrice; // 10 shares of Nyamwezi
    await Investment.create({
        userId: investor1._id,
        propertyId: prop1._id,
        sharesOwned: 10,
        amountInvested: inv1Cost,
        purchasedAt: new Date(),
    });

    // Update user balances
    await User.findByIdAndUpdate(investor1._id, {
        $inc: { walletBalance: -inv1Cost, totalInvested: inv1Cost },
    });

    // Update property funding
    await Property.findByIdAndUpdate(prop1._id, {
        $inc: { currentFunding: inv1Cost, escrowBalance: inv1Cost, availableShares: -10 },
    });

    const inv2Cost = 5 * prop2.sharePrice; // 5 shares of Donge
    await Investment.create({
        userId: investor2._id,
        propertyId: prop2._id,
        sharesOwned: 5,
        amountInvested: inv2Cost,
        purchasedAt: new Date(),
    });

    await User.findByIdAndUpdate(investor2._id, {
        $inc: { walletBalance: -inv2Cost, totalInvested: inv2Cost },
    });

    await Property.findByIdAndUpdate(prop2._id, {
        $inc: { currentFunding: inv2Cost, escrowBalance: inv2Cost, availableShares: -5 },
    });

    console.log('[Seed] Created sample investments + ledger entries.');

    // ── Ledger entries ──────────────────────────────────────────────────
    const user1After = (500000 * 100) - inv1Cost;
    await LedgerTransaction.create({
        userId: investor1._id,
        amount: inv1Cost,
        type: 'investment',
        status: 'completed',
        propertyId: prop1._id,
        balanceAfter: user1After,
        description: '10 shares of Nyamwezi Frame A',
    });

    const user2After = (300000 * 100) - inv2Cost;
    await LedgerTransaction.create({
        userId: investor2._id,
        amount: inv2Cost,
        type: 'investment',
        status: 'completed',
        propertyId: prop2._id,
        balanceAfter: user2After,
        description: '5 shares of Donge Corner B',
    });

    console.log('\n✅ Seed complete!\n');
    console.log('  Demo credentials (all passwords: password123):');
    console.log(`  Admin:    ${admin.phoneNumber}`);
    console.log(`  Landlord: ${landlord.phoneNumber}`);
    console.log(`  Investor: ${investor1.phoneNumber} (Juma — wallet: ${investor1.walletBalance - inv1Cost} pesa)`);
    console.log(`  Investor: ${investor2.phoneNumber} (Amina — wallet: ${investor2.walletBalance - inv2Cost} pesa)\n`);

    await mongoose.disconnect();
    process.exit(0);
}

seed().catch((err) => {
    console.error('[Seed] Error:', err);
    process.exit(1);
});
