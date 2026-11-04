import { z } from "zod";

export const VelocityMetricSchema = z.object({
  ema7Days: z.number().nonnegative(),
  ema14Days: z.number().nonnegative(),
  ema30Days: z.number().nonnegative(),
});
export type VelocityMetric = z.infer<typeof VelocityMetricSchema>;

export const InventoryItemSchema = z.object({
  sku: z.string(),
  name: z.string(),
  currentStockUnits: z.number().int().nonnegative(),
  leadTimeDays: z.number().int().positive(),
  safetyBufferDays: z.number().int().positive(),
  unitCostUSD: z.number().positive(),
  sellingPriceUSD: z.number().positive(),
  velocity: VelocityMetricSchema,
  supplierId: z.string(),
});
export type InventoryItem = z.infer<typeof InventoryItemSchema>;

export const CFOInventoryCalculusSchema = z.object({
  sku: z.string(),
  dailyVelocityUnits: z.number().nonnegative(),
  safetyStockUnits: z.number().nonnegative(),
  reorderPointUnits: z.number().nonnegative(),
  daysUntilStockout: z.number().nonnegative(),
  recommendedReorderUnits: z.number().int().nonnegative(),
  totalCostUSD: z.number().nonnegative(),
  projectedRunwayDaysPostPurchase: z.number(),
  computedAt: z.string().datetime(),
});
export type CFOInventoryCalculus = z.infer<typeof CFOInventoryCalculusSchema>;