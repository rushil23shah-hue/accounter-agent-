import { z } from "zod";

export const SentinelCategorySchema = z.enum([
  "TICKETS_EVENTS",
  "ELECTRONICS",
  "COMMODITY_RESTOCK",
  "TRAVEL_FLIGHTS",
  "GENERAL",
]);
export type SentinelCategory = z.infer<typeof SentinelCategorySchema>;

export const SentinelConditionTypeSchema = z.enum([
  "PRICE_BELOW_OR_EQUAL",
  "NEW_LISTING_DETECTED",
  "DISCOUNT_PERCENT_ABOVE",
]);
export type SentinelConditionType = z.infer<typeof SentinelConditionTypeSchema>;

export const SentinelStatusSchema = z.enum([
  "WATCHING",
  "TRIGGERED_HOLD_ACTIVE",
  "CAPTURED_SNIPED",
  "CANCELLED",
  "EXPIRED",
]);
export type SentinelStatus = z.infer<typeof SentinelStatusSchema>;

export const SentinelWatcherSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  category: SentinelCategorySchema,
  query: z.string().min(1),
  targetPriceUSD: z.number().positive(),
  targetPriceINR: z.number().positive().optional(),
  maxCeilingUSD: z.number().positive(),
  quantity: z.number().int().positive().default(1),
  condition: SentinelConditionTypeSchema,
  status: SentinelStatusSchema,
  checkIntervalSeconds: z.number().int().positive().default(30),
  lastCheckedAt: z.string().optional(),
  lastObservedPriceUSD: z.number().optional(),
  bestMarketplace: z.string().optional(),
  marketUrl: z.string().optional(),
  paypalOrderId: z.string().optional(),
  paypalAuthId: z.string().optional(),
  undoExpiresAt: z.number().optional(),
  whyTrail: z.array(z.string()).default([]),
  createdAt: z.string(),
});
export type SentinelWatcher = z.infer<typeof SentinelWatcherSchema>;

export const CreateSentinelInputSchema = z.object({
  naturalPrompt: z.string().optional(),
  name: z.string().optional(),
  category: SentinelCategorySchema.optional(),
  query: z.string().optional(),
  targetPriceUSD: z.number().positive().optional(),
  targetPriceINR: z.number().positive().optional(),
  maxCeilingUSD: z.number().positive().optional(),
  quantity: z.number().int().positive().optional(),
  condition: SentinelConditionTypeSchema.optional(),
});
export type CreateSentinelInput = z.infer<typeof CreateSentinelInputSchema>;
