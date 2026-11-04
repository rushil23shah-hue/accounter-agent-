//AI tightens limits always, but nevel loosens them. that logic.
import { z } from "zod";

export const PolicyEvaluationInputSchema = z.object({
  proposedAmountUSD: z.number().positive(),
  payeeEmail: z.string().email(),
  ownerHardCeilingUSD: z.number().positive(),
  aiAdjustedCeilingUSD: z.number().positive(),
  currentLiquidCashUSD: z.number().nonnegative(),
  reservedFloorUSD: z.number().nonnegative(),
  dailyBurnRateUSD: z.number().positive(),
});
export type PolicyEvaluationInput = z.infer<typeof PolicyEvaluationInputSchema>;

export const PolicyDecisionSchema = z.object({
  allowed: z.boolean(),
  effectiveLimitUSD: z.number().positive(),
  decisionReason: z.string(),
  violations: z.array(z.string()),
  requiresHumanMfa: z.boolean(),
  evaluatedAt: z.string().datetime(),
});
export type PolicyDecision = z.infer<typeof PolicyDecisionSchema>;