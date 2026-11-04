//autonomy engine & penalty box
import { AutonomyState, AutonomyTier } from "../contracts/index.js";

export class EarnedAutonomyEngine {
  /**
   * Initializes a new supplier at Tier 0 (Suggest Only)
   */
  public static initSupplier(supplierId: string): AutonomyState {
    return {
      supplierId,
      currentTier: "TIER_0_SUGGEST",
      consecutiveCleanTxCount: 0,
      penaltyBoxActive: false,
      lastPenaltyReason: null,
      maxAutonomousPerOrderCapUSD: 150,
      lastStateChangeAt: new Date().toISOString(),
    };
  }

  /**
   * Records a clean, successful transaction and checks tier promotions:
   * - 5 consecutive clean: unlocks TIER_1_ONE_TAP
   * - 15 consecutive clean: unlocks TIER_2_AUTONOMOUS (orders <= $150)
   */
  public static recordCleanTransaction(state: AutonomyState): AutonomyState {
    const newCount = state.consecutiveCleanTxCount + 1;
    let nextTier: AutonomyTier = state.currentTier;

    if (newCount >= 15) {
      nextTier = "TIER_2_AUTONOMOUS";
    } else if (newCount >= 5) {
      nextTier = "TIER_1_ONE_TAP";
    }

    return {
      ...state,
      consecutiveCleanTxCount: newCount,
      currentTier: nextTier,
      penaltyBoxActive: false,
      lastStateChangeAt: new Date().toISOString(),
    };
  }

  /**
   * Zero-Tolerance Penalty Box: A single dispute, mismatch, or supplier flag
   * immediately drops the autonomy tier back to Tier 0.
   */
  public static triggerPenaltyBox(state: AutonomyState, reason: string): AutonomyState {
    return {
      ...state,
      currentTier: "TIER_0_SUGGEST",
      consecutiveCleanTxCount: 0,
      penaltyBoxActive: true,
      lastPenaltyReason: reason,
      lastStateChangeAt: new Date().toISOString(),
    };
  }

  /**
   * Determines if a transaction can execute autonomously into the 60s Undo Window:
   * Must be Tier 2, not in penalty box, and amount <= $150.
   */
  public static canAutoExecuteIntoHold(state: AutonomyState, amountUSD: number): boolean {
    return (
      state.currentTier === "TIER_2_AUTONOMOUS" &&
      !state.penaltyBoxActive &&
      amountUSD <= state.maxAutonomousPerOrderCapUSD
    );
  }
}