import { z } from "zod";

// ─────────────────────────────────────────────────────────────────────────────
// Schemas & Types
// ─────────────────────────────────────────────────────────────────────────────

export const VolumeTierSchema = z.object({
  minUnits: z.number().int().positive(),
  discountPercent: z.number().min(0).max(100),
});
export type VolumeTier = z.infer<typeof VolumeTierSchema>;

export const WholesaleSupplierQuoteSchema = z.object({
  supplierId: z.string().min(1),
  supplierName: z.string().min(1),
  paypalReceiverEmail: z.string().email(),
  baseUnitCostUSD: z.number().positive(),
  volumeTiers: z.array(VolumeTierSchema),
  shippingCostUSD: z.number().nonnegative(),
  freeShippingThresholdUSD: z.number().positive(),
  leadTimeDays: z.number().int().positive(),
  /** 1 (unreliable) → 5 (excellent). Used as a tiebreaker in ranking. */
  reliabilityRating: z.number().min(1).max(5),
  isVerifiedPartner: z.boolean().default(true),
});
export type WholesaleSupplierQuote = z.infer<typeof WholesaleSupplierQuoteSchema>;

export const EvaluatedDealSchema = z.object({
  supplierId: z.string(),
  supplierName: z.string(),
  paypalReceiverEmail: z.string().email(),
  effectiveUnitCostUSD: z.number().positive(),
  appliedDiscountPercent: z.number().nonnegative(),
  shippingFeeUSD: z.number().nonnegative(),
  grossTotalUSD: z.number().positive(),
  netLandedCostPerUnitUSD: z.number().positive(),
  leadTimeDays: z.number().int().positive(),
  reliabilityRating: z.number().min(1).max(5),
  fitsDeliveryDeadline: z.boolean(),
  savingsComparedToBaselineUSD: z.number().nonnegative(),
  /**
   * Composite score used for ranking (lower is better).
   * Formula: netLandedCostPerUnit / reliabilityRating
   * This means a supplier that is 10 % cheaper but half as reliable
   * is ranked below the more reliable one.
   */
  compositeScore: z.number().positive(),
});
export type EvaluatedDeal = z.infer<typeof EvaluatedDealSchema>;

export const DealComparisonResultSchema = z.object({
  sku: z.string(),
  unitsRequested: z.number().int().positive(),
  maxLeadTimeDaysAllowed: z.number().int().positive(),
  evaluatedDeals: z.array(EvaluatedDealSchema),
  feasibleDeals: z.array(EvaluatedDealSchema),
  recommendedDeal: EvaluatedDealSchema,
  allSuppliersFeasible: z.boolean(),
  totalSavingsUSD: z.number().nonnegative(),
  decisionReason: z.string(),
  comparedAt: z.string().datetime(),
});
export type DealComparisonResult = z.infer<typeof DealComparisonResultSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Errors
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Thrown when no supplier quotes are provided at all.
 */
export class NoQuotesAvailableError extends Error {
  constructor(sku: string) {
    super(`WholesaleDealScout: No quotes available for SKU "${sku}".`);
    this.name = "NoQuotesAvailableError";
  }
}

/**
 * Thrown when no supplier can meet the delivery deadline.
 * The calling code should decide whether to relax the deadline or raise
 * an alert for manual review — this engine never silently falls back.
 */
export class NoFeasibleDeadlineError extends Error {
  public readonly fastestLeadTimeDays: number;
  public readonly requiredLeadTimeDays: number;

  constructor(sku: string, fastest: number, required: number) {
    super(
      `WholesaleDealScout: No supplier for SKU "${sku}" can deliver within ${required} days. ` +
        `Fastest available lead time is ${fastest} days. ` +
        `Consider relaxing the deadline or accepting a stockout risk.`,
    );
    this.name = "NoFeasibleDeadlineError";
    this.fastestLeadTimeDays = fastest;
    this.requiredLeadTimeDays = required;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Deal Scout
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Multi-Vendor Wholesale Deal Scout & Price Comparison Engine.
 *
 * Evaluates volume discount tiers, shipping thresholds, delivery deadlines,
 * and supplier reliability to surface the optimal restock deal.
 *
 * **Ranking algorithm** (primary → secondary → tertiary):
 *   1. Must fit delivery deadline (hard filter — not a score weight).
 *   2. `compositeScore = netLandedCostPerUnit / reliabilityRating`
 *      → Lower is better: rewards cheap AND reliable suppliers.
 *   3. If two suppliers tie on compositeScore, prefer the one with the
 *      shorter lead time.
 *
 * **Error policy** (never silently falls back):
 *   - `NoQuotesAvailableError` — zero quotes provided.
 *   - `NoFeasibleDeadlineError` — quotes exist but none meet the deadline.
 *     The caller is responsible for deciding whether to relax or escalate.
 */
export class WholesaleDealScout {
  /**
   * Compares multiple wholesale quotes and returns a full comparison result.
   *
   * @param sku                   The SKU being restocked.
   * @param unitsRequested        Number of units to order (must be ≥ 1).
   * @param maxLeadTimeDaysAllowed  Maximum acceptable lead time in days.
   * @param quotes                Array of supplier quotes.
   * @param baselineUnitCostUSD   The merchant's current unit cost — used to
   *                              compute savings. Pass 0 if unknown.
   *
   * @throws {RangeError}             If `unitsRequested` < 1 or
   *                                  `maxLeadTimeDaysAllowed` < 1.
   * @throws {NoQuotesAvailableError} If `quotes` is empty.
   * @throws {NoFeasibleDeadlineError} If no quote meets the delivery deadline.
   */
  public static compareQuotes(
    sku: string,
    unitsRequested: number,
    maxLeadTimeDaysAllowed: number,
    quotes: WholesaleSupplierQuote[],
    baselineUnitCostUSD: number = 0,
  ): DealComparisonResult {
    // ── Guard clauses ──────────────────────────────────────────────────────
    if (!Number.isInteger(unitsRequested) || unitsRequested < 1) {
      throw new RangeError(
        `WholesaleDealScout: unitsRequested must be a positive integer, got ${unitsRequested}`,
      );
    }
    if (!Number.isInteger(maxLeadTimeDaysAllowed) || maxLeadTimeDaysAllowed < 1) {
      throw new RangeError(
        `WholesaleDealScout: maxLeadTimeDaysAllowed must be a positive integer, got ${maxLeadTimeDaysAllowed}`,
      );
    }
    if (quotes.length === 0) {
      throw new NoQuotesAvailableError(sku);
    }

    const baselineTotalUSD = baselineUnitCostUSD * unitsRequested;

    // ── Evaluate every quote ───────────────────────────────────────────────
    const evaluatedDeals: EvaluatedDeal[] = quotes.map((q) => {
      // Find the highest applicable volume-discount tier for this order qty.
      let bestDiscountPercent = 0;
      for (const tier of q.volumeTiers) {
        if (unitsRequested >= tier.minUnits && tier.discountPercent > bestDiscountPercent) {
          bestDiscountPercent = tier.discountPercent;
        }
      }

      // Unit cost after volume discount — round to 4dp for precision.
      const discountedUnitCost = Number(
        (q.baseUnitCostUSD * (1 - bestDiscountPercent / 100)).toFixed(4),
      );

      const itemsSubtotal = discountedUnitCost * unitsRequested;
      const shippingFee =
        itemsSubtotal >= q.freeShippingThresholdUSD ? 0 : q.shippingCostUSD;

      // Round to 2dp (USD cents) only at the final gross total.
      const grossTotal = Number((itemsSubtotal + shippingFee).toFixed(2));
      const netLandedCostPerUnit = Number((grossTotal / unitsRequested).toFixed(4));

      const fitsDeliveryDeadline = q.leadTimeDays <= maxLeadTimeDaysAllowed;

      // Savings cannot be negative in the result schema — clamp to 0.
      const rawSavings = baselineTotalUSD - grossTotal;
      const savingsComparedToBaselineUSD = Number(Math.max(0, rawSavings).toFixed(2));

      // Composite score: lower is better. Dividing cost by reliability
      // rewards suppliers that are both cheap AND dependable.
      const compositeScore = Number(
        (netLandedCostPerUnit / q.reliabilityRating).toFixed(6),
      );

      return {
        supplierId: q.supplierId,
        supplierName: q.supplierName,
        paypalReceiverEmail: q.paypalReceiverEmail,
        effectiveUnitCostUSD: Number(discountedUnitCost.toFixed(2)),
        appliedDiscountPercent: bestDiscountPercent,
        shippingFeeUSD: shippingFee,
        grossTotalUSD: grossTotal,
        netLandedCostPerUnitUSD: Number(netLandedCostPerUnit.toFixed(2)),
        leadTimeDays: q.leadTimeDays,
        reliabilityRating: q.reliabilityRating,
        fitsDeliveryDeadline,
        savingsComparedToBaselineUSD,
        compositeScore,
      };
    });

    // ── Deadline filter ────────────────────────────────────────────────────
    const feasibleDeals = evaluatedDeals.filter((d) => d.fitsDeliveryDeadline);

    if (feasibleDeals.length === 0) {
      // No supplier meets the deadline — throw a descriptive error.
      // The caller (autopilot) decides whether to relax the window or block.
      const fastestLeadTime = Math.min(...evaluatedDeals.map((d) => d.leadTimeDays));
      throw new NoFeasibleDeadlineError(sku, fastestLeadTime, maxLeadTimeDaysAllowed);
    }

    // ── Rank feasible deals ────────────────────────────────────────────────
    // Sort ascending by compositeScore; break ties with shorter lead time.
    const rankedDeals = [...feasibleDeals].sort((a, b) => {
      const scoreDiff = a.compositeScore - b.compositeScore;
      if (Math.abs(scoreDiff) > 1e-9) return scoreDiff;
      return a.leadTimeDays - b.leadTimeDays;
    });

    const recommendedDeal = rankedDeals[0];

    // ── Decision narrative ─────────────────────────────────────────────────
    const discountNote =
      recommendedDeal.appliedDiscountPercent > 0
        ? ` (${recommendedDeal.appliedDiscountPercent}% bulk discount applied)`
        : "";
    const reliabilityNote = ` Reliability: ${recommendedDeal.reliabilityRating}/5.`;
    const feasibleNote =
      feasibleDeals.length < evaluatedDeals.length
        ? ` (${evaluatedDeals.length - feasibleDeals.length} supplier(s) excluded for missing ${maxLeadTimeDaysAllowed}-day deadline.)`
        : "";

    const decisionReason =
      `Selected ${recommendedDeal.supplierName}: landed cost $${recommendedDeal.netLandedCostPerUnitUSD}/unit${discountNote}, ` +
      `gross total $${recommendedDeal.grossTotalUSD.toFixed(2)}, delivers in ${recommendedDeal.leadTimeDays}d.` +
      reliabilityNote +
      (recommendedDeal.savingsComparedToBaselineUSD > 0
        ? ` Saves $${recommendedDeal.savingsComparedToBaselineUSD.toFixed(2)} vs baseline.`
        : "") +
      feasibleNote;

    return {
      sku,
      unitsRequested,
      maxLeadTimeDaysAllowed,
      evaluatedDeals,
      feasibleDeals,
      recommendedDeal,
      allSuppliersFeasible: feasibleDeals.length === evaluatedDeals.length,
      totalSavingsUSD: recommendedDeal.savingsComparedToBaselineUSD,
      decisionReason,
      comparedAt: new Date().toISOString(),
    };
  }
}
