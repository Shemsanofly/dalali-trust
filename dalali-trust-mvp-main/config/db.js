'use strict';
const mongoose = require('mongoose');

/**
 * Vercel-optimised Mongoose connection.
 * Caches the connection promise across warm serverless invocations
 * to avoid reconnecting on every request.
 */
let cached = global.__mongooseConnection;
if (!cached) {
    cached = global.__mongooseConnection = { conn: null, promise: null };
}

async function connect() {
    // Already connected — skip
    if (cached.conn) return cached.conn;

    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.warn('[DB] MONGODB_URI not set — running in MOCK mode (data lost on restart)');
        return null;
    }

    // Reuse the pending connection promise (prevents race conditions on cold start)
    if (!cached.promise) {
        cached.promise = mongoose
            .connect(uri, { serverSelectionTimeoutMS: 10000 })
            .then((m) => {
                console.log('[DB] Connected to MongoDB:', uri.replace(/\/\/.*@/, '//***@'));
                return m;
            })
            .catch((err) => {
                console.warn(`[DB] MongoDB connection failed (${err.message}) — falling back to mock mode`);
                cached.promise = null;
                return null;
            });
    }

    cached.conn = await cached.promise;
    return cached.conn;
}

function isConnected() {
    return !!cached.conn;
}

module.exports = { connect, isConnected };
