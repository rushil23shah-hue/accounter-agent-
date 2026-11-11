import { z } from "zod";

export const UPIMandateStatusSchema = z.enum([
  "ACTIVE",
  "PAUSED",
  "REVOKED",
  "EXPIRED",
]);
export type UPIMandateStatus = z.infer<typeof UPIMandateStatusSchema>;

export const UPIMandateFrequencySchema = z.enum([
  "AS_PRESENTED",
  "DAILY",
  "WEEKLY",
  "MONTHLY",
  "BIMONTHLY",
  "QUARTERLY",
  "YEARLY",
]);
export type UPIMandateFrequency = z.infer<typeof UPIMandateFrequencySchema>;

export const UPIMandateSchema = z.object({
  umn: z.string().min(1, "UMN is required"),
  payerVpa: z.string().min(3, "Payer VPA is required"),
  payerName: z.string().min(1),
  agentVpa: z.string().default("agenticpay.autopilot@paypal"),
  agentName: z.string().default("AgenticPay Autonomous Agent"),
  status: UPIMandateStatusSchema,
  maxAmountINR: z.number().positive(),
  maxAmountUSD: z.number().positive(),
  cumulativeMonthlyCapINR: z.number().positive(),
  cumulativeMonthlyCapUSD: z.number().positive(),
  spentThisMonthINR: z.number().nonnegative().default(0),
  spentThisMonthUSD: z.number().nonnegative().default(0),
  fxRateUSDToINR: z.number().positive().default(86.5),
  frequency: UPIMandateFrequencySchema.default("AS_PRESENTED"),
  validFrom: z.string().datetime(),
  validUntil: z.string().datetime(),
  purposeCode: z.string().default("COMMERCE_RESTOCK"),
  qrPayloadUri: z.string(),
  auditTrail: z.array(z.string()).default([]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type UPIMandate = z.infer<typeof UPIMandateSchema>;

export const CreateUPIMandateInputSchema = z.object({
  payerVpa: z.string().min(3),
  payerName: z.string().min(1),
  maxAmountINR: z.number().positive(),
  cumulativeMonthlyCapINR: z.number().positive().optional(),
  validityDays: z.number().int().positive().default(365),
  frequency: UPIMandateFrequencySchema.optional(),
});
export type CreateUPIMandateInput = z.infer<typeof CreateUPIMandateInputSchema>;

export const UPIMandateValidationResultSchema = z.object({
  allowed: z.boolean(),
  reason: z.string(),
  orderAmountINR: z.number(),
  orderAmountUSD: z.number(),
  remainingMonthlyCapINR: z.number(),
  mandateStatus: UPIMandateStatusSchema,
  enforcedInvariants: z.array(z.string()),
});
export type UPIMandateValidationResult = z.infer<typeof UPIMandateValidationResultSchema>;
