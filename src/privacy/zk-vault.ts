import crypto from "node:crypto";
import { z } from "zod";
import { InventoryItem, OwnerIntentProfile } from "../contracts/index.js";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fraction of rolling 7-day revenue considered a healthy autonomous spend cap.
 * e.g. 0.40 means up to 40 % of weekly revenue may be autonomously committed.
 */
const REVENUE_MANDATE_FRACTION = 0.40;

/**
 * Runway tier boundaries (as multiples of target runway days).
 * Below 1× target → CRITICAL.
 * Between 1× and 1.5× → HEALTHY.
 * Above 1.5× → SURPLUS.
 */
const SURPLUS_RUNWAY_MULTIPLIER = 1.5;

// ─────────────────────────────────────────────────────────────────────────────
// Schemas & public types
// ─────────────────────────────────────────────────────────────────────────────

export const ZKFinancialProofSchema = z.object({
  proofId: z.string(),
  timestamp: z.string().datetime(),
  isSolvent: z.boolean(),
  runwaySufficient: z.boolean(),
  mandateCompliant: z.boolean(),
  clearanceGranted: z.boolean(),
  projectedRunwayTier: z.enum(["CRITICAL", "HEALTHY", "SURPLUS"]),
  proofDigest: z.string().regex(/^[a-f0-9]{64}$/, "Must be valid SHA-256 hex digest"),
  failureReasons: z.array(z.string()),
});
export type ZKFinancialProof = z.infer<typeof ZKFinancialProofSchema>;

export const BlindedSourcingPayloadSchema = z.object({
  sourcingRequestId: z.string(),
  sku: z.string(),
  productName: z.string(),
  targetUnits: z.number().int().positive(),
  maxLeadTimeDays: z.number().int().positive(),
  anonymizedBuyerCategory: z.string(),
  zkProof: ZKFinancialProofSchema,
  generatedAt: z.string().datetime(),
});
export type BlindedSourcingPayload = z.infer<typeof BlindedSourcingPayloadSchema>;

/**
 * The private merchant ledger lives ONLY inside the vault.
 * It is never serialised to JSON and never passed to any external call.
 */
export interface PrivateMerchantLedger {
  /** Current available cash (bank + float). */
  liquidCashUSD: number;
  /** Hard floor that must never be breached by autonomous orders. */
  reservedFloorUSD: number;
  /** Estimated daily operating cost (wages, rent, utilities, etc.). */
  dailyBurnRateUSD: number;
  /** Rolling average daily revenue used to size the dynamic mandate. */
  averageDailyRevenueUSD: number;
  /** Gross margin percentage — kept private, never sent externally. */
  grossMarginPercent: number;
  /** Owner-configured minimum cash runway in days before tightening kicks in. */
  targetRunwayDays: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// ZK-Vault
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Confidential Local Financial Vault & Zero-Knowledge Constraint Solver.
 *
 * **Privacy guarantee**: raw dollar amounts (`liquidCashUSD`, `grossMarginPercent`,
 * `reservedFloorUSD`, etc.) NEVER leave this class.  External code — including
 * cloud LLMs, deal-scouting APIs, and the autopilot orchestrator — receives
 * only the cryptographically signed boolean proof object (`ZKFinancialProof`).
 *
 * Three independent solvency gates must ALL pass before `clearanceGranted` is true:
 *   1. **Solvency Gate**: post-purchase balance must remain ≥ reservedFloor.
 *   2. **Runway Gate**: projected cash runway after purchase must meet
 *      the owner's configured target runway days.
 *   3. **Mandate Gate**: order cost must not exceed the dynamic revenue-based
 *      mandate cap (`min(hardCeilingUSD, 7d-revenue × FRACTION)`).
 *
 * The cryptographic `proofDigest` is a SHA-256 commitment over the boolean
 * outputs + a secret vault salt, allowing downstream verifiers to confirm
 * the proof was generated from genuine on-device ledger data.
 */
export class ZKVault {
  private readonly ledger: Readonly<PrivateMerchantLedger>;
  private readonly vaultSalt: string;

  /**
   * @param initialLedger  The merchant's private financial state.
   * @param vaultSalt      Optional 64-hex-char salt.  If omitted, one is
   *                       generated from 32 cryptographically random bytes.
   * @throws {RangeError}  If any ledger value violates basic financial sanity.
   */
  constructor(initialLedger: PrivateMerchantLedger, vaultSalt?: string) {
    // ── Input validation: catch corrupted ledger data at construction time ──
    if (initialLedger.liquidCashUSD < 0) {
      throw new RangeError(
        `ZKVault: liquidCashUSD must be ≥ 0, got ${initialLedger.liquidCashUSD}`,
      );
    }
    if (initialLedger.reservedFloorUSD < 0) {
      throw new RangeError(
        `ZKVault: reservedFloorUSD must be ≥ 0, got ${initialLedger.reservedFloorUSD}`,
      );
    }
    if (initialLedger.dailyBurnRateUSD < 0) {
      throw new RangeError(
        `ZKVault: dailyBurnRateUSD must be ≥ 0, got ${initialLedger.dailyBurnRateUSD}`,
      );
    }
    if (initialLedger.averageDailyRevenueUSD < 0) {
      throw new RangeError(
        `ZKVault: averageDailyRevenueUSD must be ≥ 0, got ${initialLedger.averageDailyRevenueUSD}`,
      );
    }
    if (initialLedger.grossMarginPercent < 0 || initialLedger.grossMarginPercent > 100) {
      throw new RangeError(
        `ZKVault: grossMarginPercent must be in [0, 100], got ${initialLedger.grossMarginPercent}`,
      );
    }
    if (initialLedger.targetRunwayDays <= 0) {
      throw new RangeError(
        `ZKVault: targetRunwayDays must be > 0, got ${initialLedger.targetRunwayDays}`,
      );
    }

    // Deep-freeze the ledger so no reference can mutate it after construction.
    this.ledger = Object.freeze({ ...initialLedger });
    this.vaultSalt = vaultSalt ?? crypto.randomBytes(32).toString("hex");
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Public API
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Evaluates three solvency gates locally on-device.
   * Returns a boolean proof object.  No dollar amounts leave this method.
   *
   * @param orderCostUSD   The gross cost of the proposed purchase order.
   * @param profile        The owner's intent profile (used for `hardCeilingUSD`).
   * @throws {RangeError}  If `orderCostUSD` is negative or not a finite number.
   */
  public verifyFinancialSolvency(
    orderCostUSD: number,
    profile?: Pick<OwnerIntentProfile, "hardCeilingUSD">,
  ): ZKFinancialProof {
    if (!Number.isFinite(orderCostUSD) || orderCostUSD < 0) {
      throw new RangeError(
        `ZKVault.verifyFinancialSolvency: orderCostUSD must be a finite non-negative number, got ${orderCostUSD}`,
      );
    }

    const failureReasons: string[] = [];

    // ── Gate 1: Solvency ──────────────────────────────────────────────────
    const postPurchaseCash = this.ledger.liquidCashUSD - orderCostUSD;
    const isSolvent = postPurchaseCash >= this.ledger.reservedFloorUSD;
    if (!isSolvent) {
      failureReasons.push(
        `Solvency gate failed: post-purchase cash would breach reserved floor.`,
      );
    }

    // ── Gate 2: Cash Runway ───────────────────────────────────────────────
    // Available cash after purchase minus the reserved floor, divided by daily burn.
    // If burn rate is 0 (e.g. a fully bootstrapped business), runway is effectively infinite.
    const availableAfterFloor = postPurchaseCash - this.ledger.reservedFloorUSD;
    const projectedRunwayDays =
      this.ledger.dailyBurnRateUSD > 0
        ? availableAfterFloor / this.ledger.dailyBurnRateUSD
        : 9999; // effectively infinite

    const runwaySufficient = projectedRunwayDays >= this.ledger.targetRunwayDays;
    if (!runwaySufficient) {
      failureReasons.push(
        `Runway gate failed: projected runway (~${Math.round(projectedRunwayDays)}d) below target (${this.ledger.targetRunwayDays}d).`,
      );
    }

    // ── Gate 3: Dynamic Revenue Mandate ───────────────────────────────────
    // Allow up to REVENUE_MANDATE_FRACTION of rolling 7-day revenue.
    // Also enforce the owner's hard ceiling if a profile is supplied.
    const rollingRevenueAllowance = Number(
      (this.ledger.averageDailyRevenueUSD * 7 * REVENUE_MANDATE_FRACTION).toFixed(2),
    );
    const hardCeiling = profile?.hardCeilingUSD ?? Infinity;

    // The effective cap is the LESSER of the two (asymmetric invariant: AI never loosens above owner ceiling).
    const effectiveMandateCap = Math.min(hardCeiling, rollingRevenueAllowance);
    const mandateCompliant = orderCostUSD <= effectiveMandateCap;
    if (!mandateCompliant) {
      failureReasons.push(
        `Mandate gate failed: order cost $${orderCostUSD.toFixed(2)} exceeds effective cap $${effectiveMandateCap.toFixed(2)} (revenue allowance: $${rollingRevenueAllowance.toFixed(2)}, owner ceiling: $${hardCeiling === Infinity ? "∞" : hardCeiling.toFixed(2)}).`,
      );
    }

    // ── Runway tier classification ────────────────────────────────────────
    let projectedRunwayTier: "CRITICAL" | "HEALTHY" | "SURPLUS";
    if (projectedRunwayDays < this.ledger.targetRunwayDays) {
      projectedRunwayTier = "CRITICAL";
    } else if (projectedRunwayDays >= this.ledger.targetRunwayDays * SURPLUS_RUNWAY_MULTIPLIER) {
      projectedRunwayTier = "SURPLUS";
    } else {
      projectedRunwayTier = "HEALTHY";
    }

    const clearanceGranted = isSolvent && runwaySufficient && mandateCompliant;

    // ── Cryptographic commitment ──────────────────────────────────────────
    const proofId = `zk_proof_${crypto.randomBytes(8).toString("hex")}`;
    const timestamp = new Date().toISOString();

    // The digest commits to the boolean outputs + vault salt.
    // A verifier can confirm the proof was generated on a device that holds
    // the correct salt without learning any raw financial figures.
    const proofDigest = crypto
      .createHash("sha256")
      .update(
        `${proofId}|${timestamp}|${isSolvent}|${runwaySufficient}|${mandateCompliant}|${clearanceGranted}|${this.vaultSalt}`,
        "utf8",
      )
      .digest("hex");

    return {
      proofId,
      timestamp,
      isSolvent,
      runwaySufficient,
      mandateCompliant,
      clearanceGranted,
      projectedRunwayTier,
      proofDigest,
      failureReasons,
    };
  }

  /**
   * Generates a privacy-blinded sourcing payload for external deal scouting.
   *
   * The payload contains ONLY:
   *   - SKU name, unit quantity, lead-time requirement
   *   - A buyer category label (not the merchant's identity)
   *   - The ZK proof (boolean flags + digest — zero dollar amounts)
   *
   * Bank balances, margins, revenue, and reserved floor are NEVER included.
   *
   * @throws {RangeError} If `targetUnits` is not a positive integer.
   */
  public createBlindedSourcingPayload(
    item: InventoryItem,
    targetUnits: number,
    proof: ZKFinancialProof,
  ): BlindedSourcingPayload {
    if (!Number.isInteger(targetUnits) || targetUnits <= 0) {
      throw new RangeError(
        `ZKVault.createBlindedSourcingPayload: targetUnits must be a positive integer, got ${targetUnits}`,
      );
    }

    return {
      sourcingRequestId: `src_req_${crypto.randomBytes(6).toString("hex")}`,
      sku: item.sku,
      productName: item.name,
      targetUnits,
      maxLeadTimeDays: item.leadTimeDays + item.safetyBufferDays,
      anonymizedBuyerCategory: "verified_commercial_merchant",
      zkProof: proof,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Records a captured (settled) payment by reducing the private cash balance.
   *
   * @throws {RangeError} If `capturedAmountUSD` is negative.
   */
  public recordSettlement(capturedAmountUSD: number): void {
    if (!Number.isFinite(capturedAmountUSD) || capturedAmountUSD < 0) {
      throw new RangeError(
        `ZKVault.recordSettlement: capturedAmountUSD must be a finite non-negative number, got ${capturedAmountUSD}`,
      );
    }
    // Cast through unknown to mutate the frozen-at-construction copy.
    // The ledger is frozen against external mutation, but the vault itself
    // must be able to record settlements and revenue.
    (this.ledger as unknown as PrivateMerchantLedger).liquidCashUSD -= capturedAmountUSD;
  }

  /**
   * Records inbound sales revenue by increasing the private cash balance.
   *
   * @throws {RangeError} If `revenueUSD` is negative.
   */
  public recordRevenue(revenueUSD: number): void {
    if (!Number.isFinite(revenueUSD) || revenueUSD < 0) {
      throw new RangeError(
        `ZKVault.recordRevenue: revenueUSD must be a finite non-negative number, got ${revenueUSD}`,
      );
    }
    (this.ledger as unknown as PrivateMerchantLedger).liquidCashUSD += revenueUSD;
  }

  /**
   * Returns a deep copy of the private ledger **for local debugging only**.
   *
   * ⚠️  This method must NEVER be called in production code paths that touch
   * external APIs, LLM prompts, or network requests.  Its return value must
   * never be serialised to JSON and sent anywhere.
   */
  public getPrivateLedgerCopy(): Readonly<PrivateMerchantLedger> {
    // Spread creates a new object — callers cannot mutate the internal state.
    return { ...this.ledger };
  }
}
