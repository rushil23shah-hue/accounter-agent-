import { z } from "zod";
import { OwnerIntentProfile } from "../contracts/index.js";
import { AutonomyState } from "../contracts/index.js";

// ─────────────────────────────────────────────────────────────────────────────
// Named Constants
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fraction of rolling 7-day revenue used as the baseline AI spend allowance.
 * e.g. 0.45 → AI may autonomously commit up to 45 % of weekly revenue.
 */
const BASELINE_REVENUE_FRACTION = 0.45;

/**
 * When cash runway is below the owner's target, the mandate is multiplied
 * by this factor to protect the cash floor.
 */
const RUNWAY_TIGHTENING_MULTIPLIER = 0.60;

/**
 * When a Tier 2 (fully autonomous) supplier relationship is in play,
 * the mandate is relaxed by a small additional factor (never above owner ceiling).
 * This rewards proven, trusted suppliers with slightly more headroom.
 */
const TIER2_TRUST_BONUS_MULTIPLIER = 1.10;

// ─────────────────────────────────────────────────────────────────────────────
// Schemas & Types
// ─────────────────────────────────────────────────────────────────────────────

export const DynamicMandateStateSchema = z.object({
  ownerHardCeilingUSD: z.number().positive(),
  currentEffectiveMandateUSD: z.number().nonnegative(),
  aiAdjustedAllowanceUSD: z.number().nonnegative(),
  revenueVelocity7dUSD: z.number().nonnegative(),
  autonomyTierApplied: z.enum(["TIER_0_SUGGEST", "TIER_1_ONE_TAP", "TIER_2_AUTONOMOUS"]),
  isTightenedByRisk: z.boolean(),
  tighteningReason: z.string().optional(),
  mandateExplanation: z.string(),
  lastEvaluatedAt: z.string().datetime(),
});
export type DynamicMandateState = z.infer<typeof DynamicMandateStateSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Dynamic Mandate Engine
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Dynamic Agentic Spending Mandate ("Smart UPI AutoPay" for PayPal).
 *
 * Calculates an adaptive spending allowance that flexes with live cash flow
 * and sales velocity.  The result respects two hard architectural invariants:
 *
 *   **Asymmetric Limit Invariant** — The AI may only *tighten* limits, never
 *   loosen them above the owner's hard ceiling.  Formally:
 *   ```
 *   effectiveMandate = min(ownerHardCeiling, aiAdjustedAllowance)
 *   ```
 *
 *   **Earned Trust Relaxation** — A Tier 2 supplier that has built up 15+
 *   consecutive clean transactions is given a 10 % bonus on the AI allowance
 *   (before the owner ceiling clamp).  This is capped at the owner ceiling.
 *
 *   **Runway Tightening** — If the projected post-purchase cash runway drops
 *   below the owner's configured target, the AI automatically halves its
 *   allowance to protect the cash floor.
 */
export class DynamicMandateEngine {
  /**
   * Computes the current effective spending mandate.
   *
   * @param profile               The owner's intent profile (ceiling, runway target).
   * @param averageDailyRevenueUSD  Rolling average daily revenue in USD.
   * @param currentCashRunwayDays   Computed current runway (days) from the ZK-Vault.
   * @param supplierAutonomyState   Optional autonomy state for the supplier being
   *                                evaluated; enables Tier 2 trust bonus.
   *
   * @throws {RangeError} If `averageDailyRevenueUSD` or `currentCashRunwayDays`
   *                      are negative.
   */
  public static evaluateMandate(
    profile: OwnerIntentProfile,
    averageDailyRevenueUSD: number,
    currentCashRunwayDays: number,
    supplierAutonomyState?: AutonomyState,
  ): DynamicMandateState {
    // ── Guard clauses ──────────────────────────────────────────────────────
    if (!Number.isFinite(averageDailyRevenueUSD) || averageDailyRevenueUSD < 0) {
      throw new RangeError(
        `DynamicMandateEngine: averageDailyRevenueUSD must be ≥ 0, got ${averageDailyRevenueUSD}`,
      );
    }
    if (!Number.isFinite(currentCashRunwayDays) || currentCashRunwayDays < 0) {
      throw new RangeError(
        `DynamicMandateEngine: currentCashRunwayDays must be ≥ 0, got ${currentCashRunwayDays}`,
      );
    }

    const weeklyRevenue = averageDailyRevenueUSD * 7;
    let calculatedAllowance = Number((weeklyRevenue * BASELINE_REVENUE_FRACTION).toFixed(2));

    const autonomyTier = supplierAutonomyState?.currentTier ?? "TIER_0_SUGGEST";
    let isTightened = false;
    let tighteningReason: string | undefined;

    // ── Step 1: Earned Trust Bonus (Tier 2 suppliers only) ────────────────
    // A supplier that has earned TIER_2_AUTONOMOUS via 15+ clean transactions
    // gets a small headroom bonus, up to but never exceeding the owner ceiling.
    if (
      autonomyTier === "TIER_2_AUTONOMOUS" &&
      !(supplierAutonomyState?.penaltyBoxActive)
    ) {
      calculatedAllowance = Number(
        (calculatedAllowance * TIER2_TRUST_BONUS_MULTIPLIER).toFixed(2),
      );
    }

    // ── Step 2: Runway Tightening ─────────────────────────────────────────
    if (currentCashRunwayDays < profile.targetCashRunwayDays) {
      isTightened = true;
      calculatedAllowance = Number(
        (calculatedAllowance * RUNWAY_TIGHTENING_MULTIPLIER).toFixed(2),
      );
      tighteningReason =
        `Cash runway (${Math.round(currentCashRunwayDays)}d) is below target ` +
        `(${profile.targetCashRunwayDays}d). Spend allowance auto-restricted to ` +
        `${Math.round(RUNWAY_TIGHTENING_MULTIPLIER * 100)}% to protect cash floor.`;
    }

    // ── Asymmetric Invariant: clamp to owner hard ceiling ─────────────────
    // The AI can NEVER loosen above the owner's ceiling, no matter what.
    const currentEffectiveMandate = Number(
      Math.min(profile.hardCeilingUSD, calculatedAllowance).toFixed(2),
    );

    // ── Explanation narrative ─────────────────────────────────────────────
    const tierNote =
      autonomyTier === "TIER_2_AUTONOMOUS"
        ? ` Tier 2 trust bonus applied (+${Math.round((TIER2_TRUST_BONUS_MULTIPLIER - 1) * 100)}% headroom).`
        : autonomyTier === "TIER_1_ONE_TAP"
          ? " Tier 1 supplier (one-tap approval required)."
          : " Tier 0 supplier (suggest-only mode).";
    const ceilingNote =
      calculatedAllowance > profile.hardCeilingUSD
        ? ` AI allowance ($${calculatedAllowance.toFixed(2)}) clamped to owner ceiling ($${profile.hardCeilingUSD.toFixed(2)}).`
        : "";
    const tightenNote = isTightened ? ` ⚠️ ${tighteningReason}` : "";

    const mandateExplanation =
      `Effective mandate: $${currentEffectiveMandate.toFixed(2)} ` +
      `(7d revenue: $${weeklyRevenue.toFixed(2)} × ${(BASELINE_REVENUE_FRACTION * 100).toFixed(0)}% = $${(weeklyRevenue * BASELINE_REVENUE_FRACTION).toFixed(2)}).` +
      tierNote +
      ceilingNote +
      tightenNote;

    return {
      ownerHardCeilingUSD: profile.hardCeilingUSD,
      currentEffectiveMandateUSD: currentEffectiveMandate,
      aiAdjustedAllowanceUSD: calculatedAllowance,
      revenueVelocity7dUSD: weeklyRevenue,
      autonomyTierApplied: autonomyTier,
      isTightenedByRisk: isTightened,
      tighteningReason,
      mandateExplanation,
      lastEvaluatedAt: new Date().toISOString(),
    };
  }
}
