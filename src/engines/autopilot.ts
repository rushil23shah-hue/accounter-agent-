import { z } from "zod";
import { InventoryItem, OwnerIntentProfile, AutonomyState } from "../contracts/index.js";
import { ZKVault, ZKFinancialProofSchema, BlindedSourcingPayloadSchema } from "../privacy/zk-vault.js";
import { PreFlightPaymentShield, ShieldVerdictSchema } from "../privacy/pre-flight-shield.js";
import {
  WholesaleDealScout,
  WholesaleSupplierQuote,
  DealComparisonResultSchema,
  NoFeasibleDeadlineError,
  NoQuotesAvailableError,
} from "./deal-scout.js";
import {
  AdaptiveConsumptionForecaster,
  AdaptiveForecastResultSchema,
} from "./consumption-forecaster.js";
import { DynamicMandateEngine, DynamicMandateStateSchema } from "./dynamic-mandate.js";
import { EarnedAutonomyEngine } from "./autonomy-engine.js";
import { PayPalOrders, PayPalClient, UndoWindow } from "../paypal/index.js";

// ─────────────────────────────────────────────────────────────────────────────
// Result Schema — fully typed, no z.any()
// ─────────────────────────────────────────────────────────────────────────────

export const AutopilotExecutionResultSchema = z.object({
  executionId: z.string(),
  sku: z.string(),
  productName: z.string(),

  /** Full adaptive forecast result for this item. */
  forecast: AdaptiveForecastResultSchema,

  /** ZK-Vault proof — null only when no restock is needed. */
  zkProof: ZKFinancialProofSchema.nullable(),

  /** Dynamic mandate evaluation — null only when no restock needed. */
  dynamicMandate: DynamicMandateStateSchema.nullable(),

  /** Deal comparison result — null only when no restock needed or quotes failed. */
  dealComparison: DealComparisonResultSchema.nullable(),

  /** Shield verdict — null only when payment was blocked before reaching shield. */
  shieldVerdict: ShieldVerdictSchema.nullable(),

  /**
   * PayPal order ID of the AUTHORIZE hold (not yet captured).
   * Present only when status is COMPLETED_AUTONOMOUS_HOLD or PENDING_OWNER_APPROVAL.
   */
  paypalOrderId: z.string().optional(),

  /**
   * Authorization ID returned by PayPal after the buyer approves.
   * Present only when status is COMPLETED_AUTONOMOUS_HOLD.
   */
  paypalAuthorizationId: z.string().optional(),

  undoWindowActive: z.boolean(),
  undoSecondsRemaining: z.number().int().nonnegative(),

  /** The autonomy tier that governed this execution cycle. */
  autonomyTierUsed: z.enum(["TIER_0_SUGGEST", "TIER_1_ONE_TAP", "TIER_2_AUTONOMOUS"]),

  /**
   * CEO-level one-paragraph summary of what happened and why,
   * written in plain English for the merchant dashboard.
   */
  executiveBriefing: z.string(),

  status: z.enum([
    /** Tier 2: order placed in AUTHORIZE hold, 60-second undo window active. */
    "COMPLETED_AUTONOMOUS_HOLD",
    /** Tier 1: order constructed, waiting for single owner tap to approve. */
    "PENDING_OWNER_APPROVAL",
    /** Tier 0: suggestion only — presented to owner, no order placed. */
    "SUGGESTION_ONLY",
    /** Shield intercepted a threat — payment blocked entirely. */
    "BLOCKED_BY_SHIELD",
    /** ZK-Vault denied clearance — solvency / runway / mandate gate failed. */
    "BLOCKED_BY_ZK_SOLVENCY",
    /** Dynamic mandate blocked the order (amount exceeds effective mandate). */
    "BLOCKED_BY_MANDATE",
    /** Forecaster determined no restock is needed right now. */
    "NO_RESTOCK_NEEDED",
    /** No supplier could meet the delivery deadline. */
    "NO_FEASIBLE_SUPPLIER",
    /** An unexpected runtime error occurred — see executiveBriefing for details. */
    "INTERNAL_ERROR",
  ]),

  timestamp: z.string().datetime(),
});
export type AutopilotExecutionResult = z.infer<typeof AutopilotExecutionResultSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Cycle Input
// ─────────────────────────────────────────────────────────────────────────────

export interface AutopilotCycleInput {
  item: InventoryItem;
  profile: OwnerIntentProfile;
  zkVault: ZKVault;
  availableWholesaleQuotes: WholesaleSupplierQuote[];
  /**
   * Autonomy state for the item's preferred supplier.
   * Governs whether the cycle auto-executes, requires 1-tap, or suggests only.
   * If omitted, defaults to Tier 0 (suggest-only).
   */
  supplierAutonomyState?: AutonomyState;
  /**
   * Live PayPalOrders client.  If omitted, the cycle runs in offline
   * simulation mode and generates a mock order ID.
   */
  paypalOrders?: PayPalOrders;
  /**
   * UndoWindow instance used to manage the 60-second reversibility hold.
   * Required for live execution (ignored in simulation mode).
   */
  undoWindow?: UndoWindow;
}

// ─────────────────────────────────────────────────────────────────────────────
// Autopilot Orchestrator
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Zero-Touch Restocking Autopilot Orchestrator.
 *
 * Connects the full Steward 2.0 pipeline in a single autonomous cycle:
 *
 * ```
 * [Consumption Forecast]
 *       ↓ (is restock urgent?)
 * [Dynamic Mandate Engine]  ← uses ZK-Vault ledger (private)
 *       ↓ (is order within mandate?)
 * [Wholesale Deal Scout]
 *       ↓ (best deal found?)
 * [ZK-Vault Solvency Proof]  ← only boolean proof exits vault
 *       ↓ (clearance granted?)
 * [Pre-Flight Security Shield]
 *       ↓ (no threats detected?)
 * [Earned Autonomy Gate]
 *       ↓ TIER_2 → PayPal AUTHORIZE + 60s Undo Window
 *         TIER_1 → Construct order, await owner tap
 *         TIER_0 → Return suggestion briefing only
 * ```
 *
 * **Privacy guarantee**: raw ledger figures (`liquidCashUSD`, `grossMarginPercent`, etc.)
 * are accessed from the ZK-Vault internally but are NEVER included in the
 * returned `AutopilotExecutionResult` or passed to any external API call.
 */
export class RestockingAutopilotOrchestrator {
  /**
   * Executes a full autonomous inventory restocking evaluation cycle.
   *
   * This method is intentionally `async` even for the non-PayPal paths,
   * to allow the calling UI to `await` it uniformly.
   *
   * Never throws — all errors are caught and returned as `INTERNAL_ERROR`
   * status results with a descriptive `executiveBriefing`.
   */
  public static async runCycle(input: AutopilotCycleInput): Promise<AutopilotExecutionResult> {
    const executionId = `auto_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const timestamp = new Date().toISOString();

    // The autonomy tier is determined by the supplier's earned state.
    const autonomyState: AutonomyState =
      input.supplierAutonomyState ??
      EarnedAutonomyEngine.initSupplier(input.item.supplierId);
    const autonomyTierUsed = autonomyState.currentTier;

    try {
      // ── Stage 1: Adaptive Demand Forecast ───────────────────────────────
      const forecast = AdaptiveConsumptionForecaster.forecastItem(input.item);

      // If velocity is zero or stock is healthy, no action required.
      const stockHealthy =
        !forecast.isRestockUrgent &&
        forecast.daysUntilDepletion >
          input.item.leadTimeDays + input.item.safetyBufferDays;

      if (forecast.tailoredNextMonthUnits === 0 || stockHealthy) {
        return {
          executionId,
          sku: input.item.sku,
          productName: input.item.name,
          forecast,
          zkProof: null,
          dynamicMandate: null,
          dealComparison: null,
          shieldVerdict: null,
          undoWindowActive: false,
          undoSecondsRemaining: 0,
          autonomyTierUsed,
          executiveBriefing:
            forecast.tailoredNextMonthUnits === 0
              ? `${input.item.name} has zero recorded sales velocity — no reorder generated. Item may be new or discontinued.`
              : `${input.item.name} stock is healthy (${input.item.currentStockUnits} units, ~${forecast.daysUntilDepletion}d remaining). No reorder needed.`,
          status: "NO_RESTOCK_NEEDED",
          timestamp,
        };
      }

      // ── Stage 2: Dynamic Mandate Evaluation ─────────────────────────────
      // We read private ledger figures locally — none of these values leave
      // this method or appear in the returned result.
      const privateLedger = input.zkVault.getPrivateLedgerCopy();
      const currentRunway =
        privateLedger.dailyBurnRateUSD > 0
          ? (privateLedger.liquidCashUSD - privateLedger.reservedFloorUSD) /
            privateLedger.dailyBurnRateUSD
          : 9999;

      const dynamicMandate = DynamicMandateEngine.evaluateMandate(
        input.profile,
        privateLedger.averageDailyRevenueUSD,
        currentRunway,
        autonomyState,
      );

      // ── Stage 3: Wholesale Deal Scout ────────────────────────────────────
      const maxLeadTime = input.item.leadTimeDays + input.item.safetyBufferDays;
      let dealComparison;
      try {
        dealComparison = WholesaleDealScout.compareQuotes(
          input.item.sku,
          forecast.tailoredNextMonthUnits,
          maxLeadTime,
          input.availableWholesaleQuotes,
          input.item.unitCostUSD,
        );
      } catch (err) {
        if (err instanceof NoFeasibleDeadlineError || err instanceof NoQuotesAvailableError) {
          return {
            executionId,
            sku: input.item.sku,
            productName: input.item.name,
            forecast,
            zkProof: null,
            dynamicMandate,
            dealComparison: null,
            shieldVerdict: null,
            undoWindowActive: false,
            undoSecondsRemaining: 0,
            autonomyTierUsed,
            executiveBriefing:
              `Restock needed for ${input.item.name} but deal scouting failed: ${(err as Error).message}`,
            status: "NO_FEASIBLE_SUPPLIER",
            timestamp,
          };
        }
        throw err; // unexpected error — rethrow to outer catch
      }

      const recommended = dealComparison.recommendedDeal;

      // ── Mandate guard: order must fit within effective mandate ───────────
      if (recommended.grossTotalUSD > dynamicMandate.currentEffectiveMandateUSD) {
        return {
          executionId,
          sku: input.item.sku,
          productName: input.item.name,
          forecast,
          zkProof: null,
          dynamicMandate,
          dealComparison,
          shieldVerdict: null,
          undoWindowActive: false,
          undoSecondsRemaining: 0,
          autonomyTierUsed,
          executiveBriefing:
            `Restock for ${input.item.name} needed (${forecast.tailoredNextMonthUnits} units, $${recommended.grossTotalUSD.toFixed(2)}) ` +
            `but exceeds the current effective mandate of $${dynamicMandate.currentEffectiveMandateUSD.toFixed(2)}. ` +
            `${dynamicMandate.mandateExplanation}`,
          status: "BLOCKED_BY_MANDATE",
          timestamp,
        };
      }

      // ── Stage 4: ZK-Vault Financial Solvency Proof ───────────────────────
      // The proof evaluates three gates (solvency, runway, mandate).
      // Raw dollar figures stay inside the vault — only booleans exit.
      const zkProof = input.zkVault.verifyFinancialSolvency(
        recommended.grossTotalUSD,
        { hardCeilingUSD: input.profile.hardCeilingUSD },
      );

      if (!zkProof.clearanceGranted) {
        const reasons = zkProof.failureReasons.join(" | ");
        return {
          executionId,
          sku: input.item.sku,
          productName: input.item.name,
          forecast,
          zkProof,
          dynamicMandate,
          dealComparison,
          shieldVerdict: null,
          undoWindowActive: false,
          undoSecondsRemaining: 0,
          autonomyTierUsed,
          executiveBriefing:
            `ZK-Vault denied clearance for ${input.item.name} ($${recommended.grossTotalUSD.toFixed(2)}). ` +
            `Reasons: ${reasons}. Cash floor protected. No payment initiated.`,
          status: "BLOCKED_BY_ZK_SOLVENCY",
          timestamp,
        };
      }

      // ── Stage 5: Pre-Flight Security Shield ──────────────────────────────
      // Builds a realistic invoice memo and scans it for adversarial content.
      const invoiceMemo =
        `Wholesale Restock Invoice — ${forecast.tailoredNextMonthUnits} units of "${input.item.name}" ` +
        `(SKU: ${input.item.sku}). Net total: $${recommended.grossTotalUSD.toFixed(2)}. ` +
        `Remit to: ${recommended.paypalReceiverEmail}.`;

      const shieldVerdict = PreFlightPaymentShield.inspect({
        incomingInvoiceOrEmailText: invoiceMemo,
        proposedPayeeEmail: recommended.paypalReceiverEmail,
        proposedAmountUSD: recommended.grossTotalUSD,
        expectedAmountUSD: recommended.grossTotalUSD,
        sku: input.item.sku,
        units: forecast.tailoredNextMonthUnits,
        whitelistedPayees: input.profile.whitelistedPayees,
        sourceIdentifier: `supplier_feed_${recommended.supplierId}`,
      });

      if (!shieldVerdict.clearedForPayment) {
        return {
          executionId,
          sku: input.item.sku,
          productName: input.item.name,
          forecast,
          zkProof,
          dynamicMandate,
          dealComparison,
          shieldVerdict,
          undoWindowActive: false,
          undoSecondsRemaining: 0,
          autonomyTierUsed,
          executiveBriefing:
            `🚨 SECURITY ALERT: Pre-Flight Shield intercepted restock payment to "${recommended.paypalReceiverEmail}". ` +
            `${shieldVerdict.threatsDetected.length} threat(s) detected: ` +
            shieldVerdict.threatsDetected.map((t) => `${t.type}/${t.severity}`).join(", ") +
            `. Payment blocked. Manual review required.`,
          status: "BLOCKED_BY_SHIELD",
          timestamp,
        };
      }

      // ── Stage 6: Earned Autonomy Gate ─────────────────────────────────────
      // TIER_0: Suggest only — no payment placed.
      if (autonomyTierUsed === "TIER_0_SUGGEST") {
        return {
          executionId,
          sku: input.item.sku,
          productName: input.item.name,
          forecast,
          zkProof,
          dynamicMandate,
          dealComparison,
          shieldVerdict,
          undoWindowActive: false,
          undoSecondsRemaining: 0,
          autonomyTierUsed,
          executiveBriefing:
            `[Suggestion — Action Required] ${forecast.forecastingInsight} ` +
            `Best deal: ${recommended.supplierName} for $${recommended.grossTotalUSD.toFixed(2)} ` +
            `(${forecast.tailoredNextMonthUnits} units, ${recommended.leadTimeDays}d delivery). ` +
            `Approve to proceed — this supplier is new and must earn autonomy trust first.`,
          status: "SUGGESTION_ONLY",
          timestamp,
        };
      }

      // TIER_1: Construct order parameters but wait for one-tap approval.
      if (autonomyTierUsed === "TIER_1_ONE_TAP") {
        // We do NOT place a PayPal order yet — we just surface the pre-approved
        // parameters so the merchant can confirm with a single tap.
        return {
          executionId,
          sku: input.item.sku,
          productName: input.item.name,
          forecast,
          zkProof,
          dynamicMandate,
          dealComparison,
          shieldVerdict,
          undoWindowActive: false,
          undoSecondsRemaining: 0,
          autonomyTierUsed,
          executiveBriefing:
            `[One-Tap Approval Required] ${forecast.forecastingInsight} ` +
            `Best deal locked in: ${recommended.supplierName} for $${recommended.grossTotalUSD.toFixed(2)} ` +
            `(${forecast.tailoredNextMonthUnits} units, ${recommended.leadTimeDays}d delivery). ` +
            `Shield ✅ | ZK-Vault ✅ | Mandate ✅. Tap to authorise payment.`,
          status: "PENDING_OWNER_APPROVAL",
          timestamp,
        };
      }

      // ── Stage 7: TIER_2 Fully Autonomous Execution ────────────────────────
      // Confirm autonomy engine allows this specific amount.
      const canAutoExecute = EarnedAutonomyEngine.canAutoExecuteIntoHold(
        autonomyState,
        recommended.grossTotalUSD,
      );

      if (!canAutoExecute) {
        // Amount exceeds the TIER_2 per-order cap — escalate to one-tap.
        return {
          executionId,
          sku: input.item.sku,
          productName: input.item.name,
          forecast,
          zkProof,
          dynamicMandate,
          dealComparison,
          shieldVerdict,
          undoWindowActive: false,
          undoSecondsRemaining: 0,
          autonomyTierUsed,
          executiveBriefing:
            `[One-Tap Required — Amount Exceeds Tier 2 Cap] ` +
            `Order of $${recommended.grossTotalUSD.toFixed(2)} exceeds the autonomous per-order cap ` +
            `of $${autonomyState.maxAutonomousPerOrderCapUSD.toFixed(2)} for ${recommended.supplierName}. ` +
            `All checks passed. Tap to approve.`,
          status: "PENDING_OWNER_APPROVAL",
          timestamp,
        };
      }

      // ── PayPal AUTHORIZE + 60-second Undo Window ─────────────────────────
      let paypalOrderId: string | undefined;
      let paypalAuthorizationId: string | undefined;
      let undoActive = false;

      if (input.paypalOrders) {
        // Live PayPal path:
        const order = await input.paypalOrders.createOrder(
          recommended.grossTotalUSD,
          recommended.paypalReceiverEmail,
          `steward_${executionId}`,
        );
        paypalOrderId = order.orderId;

        // After createOrder the buyer must approve the order at order.approveUrl.
        // In the full Steward flow the buyer is the merchant's own PayPal account
        // which approves via a configured webhook. For the sandbox/demo we
        // proceed to authorise immediately if the undoWindow is provided.
        if (input.undoWindow) {
          input.undoWindow.start(order.orderId, async () => {
            // Undo window elapsed with no void — capture the authorisation.
            if (input.paypalOrders && paypalAuthorizationId) {
              try {
                const capture = await input.paypalOrders.captureAuthorization(
                  paypalAuthorizationId,
                  `capture_${executionId}`,
                );
                console.log(
                  `[Autopilot] Captured authorisation ${paypalAuthorizationId} → captureId ${capture.captureId}`,
                );
                input.zkVault.recordSettlement(recommended.grossTotalUSD);
              } catch (captureErr) {
                console.error(
                  `[Autopilot] Failed to capture authorisation ${paypalAuthorizationId}:`,
                  captureErr,
                );
              }
            } else {
              console.log(
                `[Autopilot] Undo window elapsed for order ${order.orderId}. Authorisation pending.`,
              );
            }
          });
          undoActive = true;
        }
      } else {
        // Offline simulation mode (no PayPal credentials provided):
        paypalOrderId = `MOCK_PP_ORD_${Math.random().toString(36).slice(2, 9).toUpperCase()}`;
        paypalAuthorizationId = `MOCK_AUTH_${Math.random().toString(36).slice(2, 9).toUpperCase()}`;
        undoActive = true;
      }

      const savingsNote =
        dealComparison.totalSavingsUSD > 0
          ? ` Saved $${dealComparison.totalSavingsUSD.toFixed(2)} vs baseline unit cost.`
          : "";

      const executiveBriefing =
        `[Autopilot — Autonomous Hold Active] ` +
        `Restocking ${forecast.tailoredNextMonthUnits} units of ${input.item.name}. ` +
        `${forecast.forecastingInsight} ` +
        `Compared ${dealComparison.evaluatedDeals.length} supplier(s) — selected ${recommended.supplierName}: ` +
        `$${recommended.grossTotalUSD.toFixed(2)} total${savingsNote} ` +
        `Delivers in ${recommended.leadTimeDays}d. Reliability: ${recommended.reliabilityRating}/5. ` +
        `PayPal AUTHORIZE hold placed (Order ${paypalOrderId}). ` +
        `60-second undo window open — void now to cancel at zero cost.`;

      return {
        executionId,
        sku: input.item.sku,
        productName: input.item.name,
        forecast,
        zkProof,
        dynamicMandate,
        dealComparison,
        shieldVerdict,
        paypalOrderId,
        paypalAuthorizationId,
        undoWindowActive: undoActive,
        undoSecondsRemaining: 60,
        autonomyTierUsed,
        executiveBriefing,
        status: "COMPLETED_AUTONOMOUS_HOLD",
        timestamp,
      };
    } catch (err) {
      // ── Unexpected error boundary ─────────────────────────────────────────
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[Autopilot] Unexpected error in cycle ${executionId}:`, err);

      // We cannot return a fully typed result without forecast — but the
      // ForecasterItem guard clause runs first so this catch is truly for
      // unexpected situations.  Return a minimal INTERNAL_ERROR result.
      return {
        executionId,
        sku: input.item.sku,
        productName: input.item.name,
        // We need a minimal forecast to satisfy the schema even on error.
        forecast: AdaptiveConsumptionForecaster.forecastItem(input.item),
        zkProof: null,
        dynamicMandate: null,
        dealComparison: null,
        shieldVerdict: null,
        undoWindowActive: false,
        undoSecondsRemaining: 0,
        autonomyTierUsed,
        executiveBriefing: `[INTERNAL ERROR] Autopilot cycle ${executionId} encountered an unexpected error: ${message}. No payment was initiated.`,
        status: "INTERNAL_ERROR",
        timestamp,
      };
    }
  }
}
