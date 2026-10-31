/**
 * Agent fee algorithm. The fee is a share of the monthly rent, banded by price:
 * the lower the rent, the higher the share. Amounts are integer TZS (never floats).
 *
 * Owners (landlords) are never charged - see `listingAgentFeeAmount`.
 */

export type AgentFeeTier = { below: number; percent: number };

/** Bands, checked from cheapest to most expensive. `below` is exclusive. */
export const AGENT_FEE_TIERS: readonly AgentFeeTier[] = [
  { below: 50_000, percent: 85 },
  { below: 100_000, percent: 60 },
  { below: 500_000, percent: 40 },
  { below: 1_000_000, percent: 25 },
];

/** Share applied to rents of TSh 1,000,000 and above. */
export const AGENT_FEE_TOP_PERCENT = 10;

/** Fee percentage for a monthly rent. Rents of TSh 1,000,000 or more use the top band. */
export function agentFeePercent(rentAmount: number): number {
  if (!Number.isSafeInteger(rentAmount) || rentAmount < 0) {
    throw new Error("Rent must be a non-negative safe integer");
  }
  for (const tier of AGENT_FEE_TIERS) if (rentAmount < tier.below) return tier.percent;
  return AGENT_FEE_TOP_PERCENT;
}

/** Agent fee in whole shillings for a monthly rent. */
export function agentFeeAmount(rentAmount: number): number {
  return Math.round((rentAmount * agentFeePercent(rentAmount)) / 100);
}

/**
 * Fee stored on a listing: agents pay the banded fee, owners pay nothing.
 * Applied on the server so the amount cannot be set from a form.
 */
export function listingAgentFeeAmount(role: string, rentAmount: number): number {
  return role === "AGENT" ? agentFeeAmount(rentAmount) : 0;
}
