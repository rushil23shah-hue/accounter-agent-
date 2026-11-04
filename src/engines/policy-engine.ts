//the asymmetric limit invariant
import {
  OwnerIntentProfile,
  PolicyEvaluationInput,
  PolicyDecision,
} from "../contracts/index.js";

export class LimitLooseningViolationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LimitLooseningViolationError";
  }
}

export class DeterministicPolicyGate {
  /**
   * The Asymmetric Limit Invariant:
   * Effective Limit = min(OwnerCeiling, AIAdjustedLimit)
   *
   * Hard Exception triggered if AI attempts to propose an increase above OwnerCeiling.
   */
  public static calculateEffectiveLimit(
    ownerCeilingUSD: number,
    aiProposedLimitUSD: number
  ): number {
    if (aiProposedLimitUSD > ownerCeilingUSD) {
      throw new LimitLooseningViolationError(
        `Security Breach: AI attempted to loosen limit from $${ownerCeilingUSD} to $${aiProposedLimitUSD}. Raising limits requires cryptographic human biometric or MFA confirmation.`
      );
    }
    return Math.min(ownerCeilingUSD, aiProposedLimitUSD);
  }

  /**
   * Evaluates proposed transactions deterministically against hard boundaries.
   */
  public static evaluate(
    input: PolicyEvaluationInput,
    profile: OwnerIntentProfile
  ): PolicyDecision {
    const violations: string[] = [];

    // 1. Payee Whitelist Check
    const payee = profile.whitelistedPayees.find(
      (p) => p.paypalReceiverEmail.toLowerCase() === input.payeeEmail.toLowerCase() && p.isActive
    );

    if (!payee) {
      violations.push(`Payee ${input.payeeEmail} is NOT in the authorized whitelist.`);
    }

    // 2. Asymmetric Limit Invariant Check
    let effectiveLimit = profile.hardCeilingUSD;
    try {
      effectiveLimit = this.calculateEffectiveLimit(
        profile.hardCeilingUSD,
        input.aiAdjustedCeilingUSD
      );
    } catch (err: unknown) {
      if (err instanceof LimitLooseningViolationError) {
        violations.push(err.message);
      }
    }

    // 3. Single Order Cap Check
    if (input.proposedAmountUSD > effectiveLimit) {
      violations.push(
        `Proposed amount $${input.proposedAmountUSD} exceeds effective limit of $${effectiveLimit} (Owner Ceiling: $${profile.hardCeilingUSD}).`
      );
    }

    if (payee && input.proposedAmountUSD > payee.maxSingleOrderLimitUSD) {
      violations.push(
        `Proposed amount $${input.proposedAmountUSD} exceeds supplier specific ceiling $${payee.maxSingleOrderLimitUSD}.`
      );
    }

    // 4. Cash Runway & Floor Protection
    const remainingCash = input.currentLiquidCashUSD - input.proposedAmountUSD;
    if (remainingCash < input.reservedFloorUSD) {
      violations.push(
        `Purchase would breach cash floor of $${input.reservedFloorUSD}. Remaining liquid cash would be $${remainingCash}.`
      );
    }

    const allowed = violations.length === 0;

    return {
      allowed,
      effectiveLimitUSD: effectiveLimit,
      decisionReason: allowed
        ? "Deterministic policy passed. Amount within effective limit and protects cash floor."
        : `Policy gate rejected transaction: ${violations.join(" | ")}`,
      violations,
      requiresHumanMfa: !allowed,
      evaluatedAt: new Date().toISOString(),
    };
  }
}