/**
 * api.js — Safe fetch wrapper for SahaShares frontend.
 *
 * Problems it solves:
 *  - "Unexpected end of JSON input" when the server sends an empty body
 *    or the connection drops mid-response (ECONNRESET).
 *  - Unhandled network errors (TypeError: Failed to fetch).
 *  - Noisy console errors on every transient failure.
 *
 * Any component that calls this will get a consistent shape back:
 *   { ok, status, data, error }
 *
 *   ok    — true if HTTP 2xx AND JSON parsed cleanly
 *   status — HTTP status code (or 0 on network failure)
 *   data   — parsed JSON body (or {})
 *   error  — human-readable error string (or null on success)
 */

const NETWORK_ERROR = 'Connection error. Please check your internet and try again.';
const SERVER_ERROR = 'Server is temporarily unavailable. Please try again shortly.';

/**
 * Wraps fetch() with safe JSON parsing and unified error handling.
 * @param {string} url
 * @param {RequestInit} [options]
 * @returns {Promise<{ok:boolean, status:number, data:Object, error:string|null}>}
 */
export async function apiFetch(url, options = {}) {
    let response;
    try {
        response = await fetch(url, options);
    } catch (networkErr) {
        // TypeError: Failed to fetch  /  ERR_CONNECTION_REFUSED  /  ECONNRESET
        console.warn(`[API] Network error fetching ${url}:`, networkErr.message);
        return { ok: false, status: 0, data: {}, error: NETWORK_ERROR };
    }

    let data = {};
    try {
        const text = await response.text();
        if (text) data = JSON.parse(text);
    } catch (parseErr) {
        console.warn(`[API] JSON parse error from ${url}:`, parseErr.message);
        return {
            ok: false,
            status: response.status,
            data: {},
            error: response.ok ? SERVER_ERROR : `Server error (${response.status})`,
        };
    }

    const ok = response.ok;  // 200-299
    const error = ok ? null : (data.error || data.message || `Error ${response.status}`);

    return { ok, status: response.status, data, error };
}

/** Convenience: GET with optional auth token */
export function apiGet(url, token) {
    return apiFetch(url, token ? { headers: { Authorization: `Bearer ${token}` } } : {});
}

/** Convenience: POST JSON with optional auth token */
export function apiPost(url, body, token) {
    return apiFetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
    });
}

/** Convenience: PUT JSON with optional auth token */
export function apiPut(url, body, token) {
    return apiFetch(url, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
    });
}
