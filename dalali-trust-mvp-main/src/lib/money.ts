/** Money helpers. Amounts are integer Tanzanian shillings (TZS); never floats. */

export const CURRENCY = "TZS" as const;
export const MAX_TZS_AMOUNT = 1_000_000_000; // sanity ceiling: 1 billion TZS

export function formatTZS(amount: number, locale: "en" | "sw" = "en"): string {
  if (!Number.isSafeInteger(amount)) throw new Error("Money amounts must be safe integers");
  const grouped = new Intl.NumberFormat(locale === "sw" ? "sw-TZ" : "en-TZ", {
    maximumFractionDigits: 0,
  }).format(amount);
  return `TSh ${grouped}`;
}

/** Parses user input such as "350,000" or "350 000" into an integer amount of TZS. */
export function parseTZS(input: string): number | null {
  const digits = input.replace(/[\s,_]/g, "");
  if (!/^\d{1,10}$/.test(digits)) return null;
  const value = Number(digits);
  return Number.isSafeInteger(value) ? value : null;
}

export type CostLine = { label: string; amount: number; frequency: "ONE_TIME" | "MONTHLY" };

/**
 * Computes the total cash a tenant should expect to pay before moving in:
 * rent paid in advance + deposit + agent fee + one-time charges. Integer arithmetic only.
 */
export function moveInCost(input: {
  rentAmount: number;
  advanceMonths: number;
  depositAmount: number;
  agentFeeAmount: number;
  charges: { amount: number; frequency: "ONE_TIME" | "MONTHLY" }[];
}): { advanceRent: number; oneTimeCharges: number; monthlyCharges: number; total: number } {
  const advanceRent = input.rentAmount * Math.max(1, input.advanceMonths);
  const oneTimeCharges = input.charges
    .filter((c) => c.frequency === "ONE_TIME")
    .reduce((s, c) => s + c.amount, 0);
  const monthlyCharges = input.charges
    .filter((c) => c.frequency === "MONTHLY")
    .reduce((s, c) => s + c.amount, 0);
  const total = advanceRent + input.depositAmount + input.agentFeeAmount + oneTimeCharges;
  return { advanceRent, oneTimeCharges, monthlyCharges, total };
}
