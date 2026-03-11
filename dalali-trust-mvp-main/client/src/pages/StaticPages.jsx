import React from 'react';
import { useLanguage } from '../context/LanguageContext';

export default function TextContentPage({ title, children }) {
    return (
        <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6">
            <div className="max-w-3xl mx-auto bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-800 rounded-3xl p-8 sm:p-12 shadow-xl">
                <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white mb-8 tracking-tight">
                    {title}
                </h1>
                <div className="prose dark:prose-invert prose-slate prose-lg max-w-none">
                    {children}
                </div>
            </div>
        </div>
    );
}

export const HelpCenter = () => (
    <TextContentPage title="Help Center">
        <h3>Welcome to SahaShares Support</h3>
        <p>If you're having trouble investing, verifying a property, or withdrawing your dividends, we're here to help.</p>

        <h4>Common Questions</h4>
        <ul>
            <li><strong>How do I top up my wallet?</strong> Use the "Top Up" button in your Portfolio, or dial our USSD code.</li>
            <li><strong>When do I get dividends?</strong> Dividends are paid out automatically on the first day of every month to your M-Pesa.</li>
            <li><strong>Is my money safe?</strong> Yes. All properties are verified against official government registries (NIDA & Title Deeds).</li>
        </ul>
        <p>For further assistance, email us at support@SahaShares.co.tz.</p>
    </TextContentPage>
);

export const UssdInstructions = () => (
    <TextContentPage title="Offline USSD Instructions">
        <h3>Invest Without the Internet</h3>
        <p>You don't need a smartphone to use SahaShares. Follow these steps to access your portfolio offline:</p>

        <ol>
            <li>Dial <strong>*384*7741#</strong> on your mobile phone (any network).</li>
            <li>Select your preferred language (1 for English, 2 for Swahili).</li>
            <li>Use the menu to:
                <ul>
                    <li>Browse available properties to invest in.</li>
                    <li>Check your current wallet balance and total dividends.</li>
                    <li>Top up your wallet via M-Pesa.</li>
                </ul>
            </li>
        </ol>
        <p><em>Note: Standard USSD network charges may apply.</em></p>
    </TextContentPage>
);

export const Terms = () => (
    <TextContentPage title="Terms of Service">
        <h3>1. Acceptance of Terms</h3>
        <p>By registering on SahaShares, you agree to these terms. We provide a platform for fractional property investment and verification.</p>

        <h3>2. Investment Risks</h3>
        <p>All investments carry risk. While we securely verify all landlords and title deeds, property yields can fluctuate. Never invest more than you can afford to lose.</p>

        <h3>3. Fees</h3>
        <p>We charge a fixed platform fee of 1,000 TSh for unlocking verified landlord contacts. Fractional investments carry a minimal 2% processing fee.</p>
    </TextContentPage>
);

export const PrivacyPolicy = () => (
    <TextContentPage title="Privacy Policy">
        <h3>Data Collection</h3>
        <p>We collect your phone number for authentication and payments. Landlords must provide NIDA IDs and Title Deeds to verify authenticity.</p>

        <h3>Data Usage</h3>
        <p>Your data is used strictly for KYC verification, payment processing, and securing your investments. We never sell your data to third parties.</p>

        <h3>Security</h3>
        <p>All sensitive information is heavily encrypted. High-value transactions are protected by Africa's Talking Voice 2FA.</p>
    </TextContentPage>
);
