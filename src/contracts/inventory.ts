//deterministic financial math
import { z } from "zod";

export const WhitelistedPayeeSchema = z.object({
  supplierId: z.string(),
  name: z.string(),
  paypalReceiverEmail: z.string().email(),
  category: z.string(),
  maxSingleOrderLimitUSD: z.number().positive(),
  isActive: z.boolean().default(true),
});
export type WhitelistedPayee = z.infer<typeof WhitelistedPayeeSchema>;

export const OwnerIntentProfileSchema = z.object({
  profileId: z.string().uuid(),
  ownerName: z.string().min(1),
  mode: z.enum(["BUSINESS_CFO", "CONSUMER_BUDGET_GUARDIAN"]).default("BUSINESS_CFO"),
  hardCeilingUSD: z.number().positive(),
  reservedCashFloorUSD: z.number().nonnegative(),
  targetCashRunwayDays: z.number().int().positive(),
  maxSlowMovingItemOrderUSD: z.number().positive(),
  whitelistedPayees: z.array(WhitelistedPayeeSchema),
  updatedAt: z.string().datetime(),
  version: z.number().int().positive(),
});
export type OwnerIntentProfile = z.infer<typeof OwnerIntentProfileSchema>;