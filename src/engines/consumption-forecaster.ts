import { z } from "zod";
import { InventoryItem } from "../contracts/index.js";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/** Default restock coverage horizon in days. */
const DEFAULT_RESTOCK_COVERAGE_DAYS = 21;

/**
 * Trend thresholds.
 * A 7-day/30-day EMA ratio ≥ SURGE_THRESHOLD means demand is accelerating.
 * A ratio ≤ DECAY_THRESHOLD means demand is decelerating.
 */
const SURGE_THRESHOLD = 1.15;
const DECAY_THRESHOLD = 0.85;

/**
 * Demand-trend multipliers applied to ema14 for next-month velocity projection.
 * Keeping these named constants makes A/B testing trivial.
 */
const SURGE_MULTIPLIER = 1.20;
const DECAY_MULTIPLIER = 0.85;

// ─────────────────────────────────────────────────────────────────────────────
// Schemas & types
// ─────────────────────────────────────────────────────────────────────────────

export const TrendTypeSchema = z.enum(["ACCELERATING", "STABLE", "DECELERATING"]);
export type TrendType = z.infer<typeof TrendTypeSchema>;

export const AdaptiveForecastResultSchema = z.object({
  sku: z.string(),
  productName: z.string(),
  currentStockUnits: z.number().int().nonnegative(),
  daysUntilDepletion: z.number().nonnegative(),
  isRestockUrgent: z.boolean(),
  trendType: TrendTypeSchema,
  trendAccelerationRatio: z.number().nonnegative(),
  baselineDailyVelocity: z.number().nonnegative(),
  projectedNextMonthDailyVelocity: z.number().nonnegative(),
  tailoredNextMonthUnits: z.number().int().nonnegative(),
  safetyStockUnits: z.number().int().nonnegative(),
  reorderPointUnits: z.number().int().nonnegative(),
  forecastingInsight: z.string(),
  calculatedAt: z.string().datetime(),
});
export type AdaptiveForecastResult = z.infer<typeof AdaptiveForecastResultSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Forecaster
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Adaptive Consumption & Usage Forecaster.
 *
 * Learns daily burn rates via three-horizon EMA signals (7d / 14d / 30d),
 * detects demand surge or decay, and dynamically tailors the next reorder
 * batch size to prevent both stockouts and dead-inventory lock-up.
 *
 * Key design decisions:
 * - **Zero-velocity items are NOT auto-ordered.**  If all three EMAs are 0,
 *   the item has not moved.  `tailoredNextMonthUnits` will be 0 and
 *   `isRestockUrgent` will be false.  The autopilot must respect this —
 *   do NOT enforce a minimum batch on a truly dormant SKU.
 * - **Minimum batch** only applies when demand exists but the calculated
 *   reorder quantity is small enough to be uneconomical.  The threshold is
 *   injected via `options.minEconomicBatchUnits` (default 20) so it can be
 *   configured per product category without touching the engine.
 * - **targetRestockCoverageDays** is passed in by the caller (default 21d)
 *   so the owner can override per-category from their intent profile.
 */
export class AdaptiveConsumptionForecaster {
  /**
   * Forecasts demand and tailors the next reorder batch.
   *
   * @param item                     The inventory item to evaluate.
   * @param targetRestockCoverageDays Days of forward coverage to stock up for
   *                                 (default: 21).
   * @param minEconomicBatchUnits    Minimum batch size to avoid uneconomical
   *                                 micro-orders (default: 20).  Set to 0 to
   *                                 disable the minimum.
   * @throws {RangeError} If `targetRestockCoverageDays` or
   *   `minEconomicBatchUnits` are negative.
   */
  public static forecastItem(
    item: InventoryItem,
    targetRestockCoverageDays: number = DEFAULT_RESTOCK_COVERAGE_DAYS,
    minEconomicBatchUnits: number = 20,
  ): AdaptiveForecastResult {
    // ── Guard clauses ──────────────────────────────────────────────────────
    if (targetRestockCoverageDays < 0) {
      throw new RangeError(
        `AdaptiveConsumptionForecaster: targetRestockCoverageDays must be ≥ 0, got ${targetRestockCoverageDays}`,
      );
    }
    if (minEconomicBatchUnits < 0) {
      throw new RangeError(
        `AdaptiveConsumptionForecaster: minEconomicBatchUnits must be ≥ 0, got ${minEconomicBatchUnits}`,
      );
    }
    if (item.currentStockUnits < 0) {
      throw new RangeError(
        `AdaptiveConsumptionForecaster: currentStockUnits must be ≥ 0, got ${item.currentStockUnits}`,
      );
    }

    // ── EMA signals (clamp negatives to 0, never replace 0 with 1) ────────
    const ema7 = Math.max(0, item.velocity.ema7Days);
    const ema14 = Math.max(0, item.velocity.ema14Days);
    const ema30 = Math.max(0, item.velocity.ema30Days);

    // ── Zero-velocity guard: dormant items should NOT be ordered ──────────
    const isZeroVelocity = ema7 === 0 && ema14 === 0 && ema30 === 0;
    if (isZeroVelocity) {
      return {
        sku: item.sku,
        productName: item.name,
        currentStockUnits: item.currentStockUnits,
        daysUntilDepletion: Infinity > 1e9 ? 999 : 999, // practically infinite
        isRestockUrgent: false,
        trendType: "STABLE",
        trendAccelerationRatio: 1.0,
        baselineDailyVelocity: 0,
        projectedNextMonthDailyVelocity: 0,
        tailoredNextMonthUnits: 0,
        safetyStockUnits: 0,
        reorderPointUnits: 0,
        forecastingInsight:
          `${item.name} has zero recorded velocity across all three EMA windows. ` +
          `No reorder generated — item may be discontinued or newly listed.`,
        calculatedAt: new Date().toISOString(),
      };
    }

    // ── Trend detection ────────────────────────────────────────────────────
    // Use ema30 as the long-horizon baseline; guard divide-by-zero (ema30 > 0 here because isZeroVelocity is false and we use the max of all three)
    const baseline30 = ema30 > 0 ? ema30 : ema14 > 0 ? ema14 : ema7;
    const trendRatio = Number((ema7 / baseline30).toFixed(4));

    let trendType: TrendType = "STABLE";
    if (trendRatio >= SURGE_THRESHOLD) {
      trendType = "ACCELERATING";
    } else if (trendRatio <= DECAY_THRESHOLD) {
      trendType = "DECELERATING";
    }

    // ── Project next-month daily velocity ─────────────────────────────────
    // Anchor on ema14 (medium-horizon signal) and skew with trend multiplier.
    const trendMultiplier =
      trendType === "ACCELERATING"
        ? SURGE_MULTIPLIER
        : trendType === "DECELERATING"
          ? DECAY_MULTIPLIER
          : 1.0;

    const projectedDailyVelocity = Number((ema14 * trendMultiplier).toFixed(4));

    // ── Safety stock & reorder point ──────────────────────────────────────
    // Safety Stock = safety buffer days × projected daily velocity
    const safetyStock = Math.ceil(item.safetyBufferDays * projectedDailyVelocity);

    // Reorder Point = (lead-time days × projected velocity) + safety stock
    const reorderPoint = Math.ceil(item.leadTimeDays * projectedDailyVelocity + safetyStock);

    // ── Days until depletion ───────────────────────────────────────────────
    // Use ema14 (the most balanced signal) for burn-rate denominator.
    const daysUntilDepletion =
      ema14 > 0
        ? Number((item.currentStockUnits / ema14).toFixed(1))
        : 999; // practically infinite if ema14 somehow 0 while others are not

    // ── Urgency ───────────────────────────────────────────────────────────
    const isRestockUrgent = item.currentStockUnits <= reorderPoint;

    // ── Tailored batch size ────────────────────────────────────────────────
    // Units needed = coverage horizon + lead-time buffer + safety stock,
    // minus existing stock.  Never order a negative number.
    const neededUnitsTotal = Math.ceil(
      targetRestockCoverageDays * projectedDailyVelocity +
        item.leadTimeDays * projectedDailyVelocity +
        safetyStock,
    );
    const rawOrderQty = Math.max(0, neededUnitsTotal - item.currentStockUnits);

    // Apply economic minimum only when we do need to order something.
    // A dormant SKU (rawOrderQty === 0) is never bumped up.
    const tailoredUnits =
      rawOrderQty > 0 && rawOrderQty < minEconomicBatchUnits
        ? minEconomicBatchUnits
        : rawOrderQty;

    // ── Insight narrative ─────────────────────────────────────────────────
    let forecastingInsight: string;
    if (trendType === "ACCELERATING") {
      forecastingInsight =
        `Demand surging (+${Math.round((trendRatio - 1) * 100)}% over 7d vs 30d baseline). ` +
        `Sized batch up to ${tailoredUnits} units to prevent stockout during peak velocity. ` +
        `Current stock covers ~${daysUntilDepletion}d at present burn rate.`;
    } else if (trendType === "DECELERATING") {
      forecastingInsight =
        `Demand cooling (${Math.round(trendRatio * 100)}% of 30d baseline). ` +
        `Scaled batch to ${tailoredUnits} units to avoid locking capital in slow-moving inventory. ` +
        `Current stock covers ~${daysUntilDepletion}d.`;
    } else {
      forecastingInsight =
        `Steady consumption at ~${ema14} units/day (ema14). ` +
        `Tailored restock to ${tailoredUnits} units for ${targetRestockCoverageDays}-day coverage. ` +
        `Current stock covers ~${daysUntilDepletion}d.`;
    }

    return {
      sku: item.sku,
      productName: item.name,
      currentStockUnits: item.currentStockUnits,
      daysUntilDepletion,
      isRestockUrgent,
      trendType,
      trendAccelerationRatio: Number(trendRatio.toFixed(2)),
      baselineDailyVelocity: ema14,
      projectedNextMonthDailyVelocity: projectedDailyVelocity,
      tailoredNextMonthUnits: tailoredUnits,
      safetyStockUnits: safetyStock,
      reorderPointUnits: reorderPoint,
      forecastingInsight,
      calculatedAt: new Date().toISOString(),
    };
  }
}
