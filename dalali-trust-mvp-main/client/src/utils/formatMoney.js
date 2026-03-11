/**
 * formatMoney.js — Comma-formatted money input utility for SahaShares
 *
 * Usage:
 *   import { formatMoneyInput, parseMoneyValue } from '../utils/formatMoney';
 *
 *   <input
 *     value={displayVal}
 *     onChange={e => setDisplayVal(formatMoneyInput(e.target.value))}
 *   />
 *   // When submitting: parseMoneyValue(displayVal) → raw number (e.g. 10000)
 */

/**
 * Format a raw input string into a comma-separated number string.
 * Strips all non-digits, then re-adds commas every 3 digits.
 * @param {string} raw — e.g. "10000" or "10,000" or "abc10x000"
 * @returns {string} — e.g. "10,000"
 */
export function formatMoneyInput(raw) {
    const digits = String(raw).replace(/[^0-9]/g, '');
    if (!digits) return '';
    return Number(digits).toLocaleString('en-US');
}

/**
 * Parse a formatted money string back to a plain number.
 * @param {string} formatted — e.g. "10,000"
 * @returns {number} — e.g. 10000
 */
export function parseMoneyValue(formatted) {
    const digits = String(formatted).replace(/[^0-9]/g, '');
    return digits ? Number(digits) : 0;
}
