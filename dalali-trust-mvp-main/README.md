# 🏪 SahaShares: Prop-Tech Micro-Investment & Anti-Scam Platform

**SahaShares** is a revolutionary platform designed to break the cycle of fraud in Tanzania's rental market and democratize real estate investment. It empowers everyday citizens to invest in commercial properties (like retail stalls and shops) through micro-shares, while providing a transparent, AI-verified, and middleman-free ecosystem for landlords and tenants.

![SahaShares Platform](client/public/vite.svg)

## 🚀 The Core Vision & Features
Tanzania's market is currently plagued by unverified "fake brokers" and high barriers to entry for commercial real estate. SahaShares solves this by offering:

1. **Micro-Investing (Fractional Ownership)**: Users can buy shares in verified retail properties (vibanda) for as low as 10,000 TZS and earn monthly ROI/dividends.
2. **AI-Powered KYC Verification**: Landlords upload their NIDA (National ID) and Title Deeds. An integrated AI Broker instantly verifies documents to stop scammers.
3. **100% Africa's Talking Integration**: Over 5 distinct AT APIs power the offline accessibility, security, and financial engines of the app.
4. **Direct & Secure Connection**: Tenants can unlock landlord contacts via secure Masked Calls, eliminating broker fees.

---

## 🌍 Powered by Africa's Talking (100% Sandbox Coverage)
This MVP utilizes the full spectrum of Africa's Talking APIs to ensure the app works for everyone, everywhere—even offline.

| AT Product | Feature Implementation |
| :--- | :--- |
| **💬 2-Way SMS** | Users can text `BAL`, `PORTFOLIO`, `INVEST`, or `HELP` to our shortcode (e.g., 15629) to manage their investments offline. The system also sends outbound SMS for OTPs, KYC approvals, and dividend alerts. |
| **📱 USSD** | Dial `*384*7741#` (example) to access the full platform offline in English or Swahili. Users can browse properties, check their wallet balance, and verify property IDs. |
| **💲 Payments (C2B, B2C, B2B)**| **C2B:** Instant M-Pesa deposits via webhook. <br>**STK Push:** In-app triggers for mobile checkout (wallet top-up). <br>**B2C:** Direct-to-mobile money withdrawal payouts.<br>**B2B:** Giant lump-sum payouts from the platform directly to Landlord's corporate bank accounts. |
| **📞 Voice (2FA & TTS)** | **Voice 2FA:** Automated outbound calls asking for a 4-digit PIN for withdrawals over 500,000 TZS.<br>**Voicebot:** A Text-to-Speech (TTS) bot reads out the user's portfolio over a phone call.<br>**Masked Calls:** Tenants can call landlords securely without revealing either party's phone number. |
| **🎈 Airtime** | Instant airtime credit (1,000 TZS) awarded for new registrations. Also used as a fallback to distribute "micro-dividends" (< 1,000 TZS) that are too small for standard mobile money transfers. |

---

## 🛠️ Tech Stack
- **Frontend**: React, React Router, Vite, Tailwind CSS v4 (with sophisticated dark mode & modern UI/UX).
- **Backend**: Node.js v20.x + Express.js.
- **Database**: MongoDB (Mongoose) with optimized connection caching.
- **Telecom & Payments**: Africa's Talking SDK.
- **AI Integration**: OpenAI (GPT-4o) via `@google/genai` (Antigravity integration) for document verification.
- **Deployment**: Railway (Backend & Frontend together) or Vercel.

---

## 📦 Local Development

1. **Clone the repository**
2. **Install dependencies**
   ```bash
   # Install server/backend dependencies
   npm install

   # Install client/frontend dependencies
   cd client
   npm install
   ```
3. **Configure Environment (`.env`)**
   Create a `.env` file in the root directory (use `.env.example` as a template):
   ```env
   PORT=3000
   
   # Database (MongoDB Atlas)
   # 1. Create a free cluster at https://www.mongodb.com/cloud/atlas
   # 2. Get your connection string (Driver: Node.js)
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.example.mongodb.net/SahaShares?retryWrites=true&w=majority

   # Africa's Talking Sandbox
   BASE_URL=https://your-ngrok-url.ngrok-free.dev
   AT_API_KEY=your_sandbox_api_key
   AT_USERNAME=sandbox
   AT_SENDER_ID=SahaShares
   AT_VOICE_NUMBER=+254711XXXXXX
   AT_PRODUCT_NAME=SahaSharesPay
   AT_SMS_CODE=15629
   AT_USSD_CODE=*384*7741#
   
   # Optional: For AI Document reading
   OPENAI_API_KEY=your_openai_key 
   ```
4. **Run the Application**
   - Open two terminal windows.
   - **Terminal 1 (Backend API):** `npm run dev`
   - **Terminal 2 (Frontend React Client):** `cd client && npm run dev`
5. **View the Site:** Navigate to `http://localhost:5173`.

---

## 🚂 Railway Deployment (Production)

This project is configured to deploy seamlessly to [Railway.app](https://railway.app/).

1. Ensure your `package.json` has the correct node engine requirement (`"node": "20.x"`).
2. Connect your GitHub repository to a new Railway project.
3. Railway will automatically detect the `start` script (`node server.js`).
4. **Important**: Ensure your `package.json` includes a `postinstall` script to build the React frontend:
   ```json
   "scripts": {
     "start": "node server.js",
     "postinstall": "cd client && npm install && npm run build"
   }
   ```
5. Add all your `.env` variables into the Railway Dashboard under "Variables".
6. Deploy! The Express server will automatically serve the built React app from `client/dist`.

---
*Built to bring trust, speed, and modern verification to the African real estate market.*
