//transparent autonomy state management contract
import { z } from "zod";

export const AutonomyTierSchema = z.enum(["TIER_0_SUGGEST", "TIER_1_ONE_TAP", "TIER_2_AUTONOMOUS"]);
export type AutonomyTier = z.infer<typeof AutonomyTierSchema>;

export const AutonomyStateSchema = z.object({
  supplierId: z.string(),
  currentTier: AutonomyTierSchema,
  consecutiveCleanTxCount: z.number().int().nonnegative(),
  penaltyBoxActive: z.boolean(),
  lastPenaltyReason: z.string().nullable(),
  maxAutonomousPerOrderCapUSD: z.number().default(150),
  lastStateChangeAt: z.string().datetime(),
});
export type AutonomyState = z.infer<typeof AutonomyStateSchema>;