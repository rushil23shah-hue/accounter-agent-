import { z } from "zod";

export const IntentAuditCategorySchema = z.enum([
  "PANTRY_GROCERY",
  "INVENTORY_RESTOCK",
  "CONSUMER_GOODS",
  "OFFICE_SUPPLIES",
  "LOGISTICS_SHIPPING",
  "EVENTS_TICKETS",
  "SAAS_SUBSCRIPTION",
]);
export type IntentAuditCategory = z.infer<typeof IntentAuditCategorySchema>;

export const IntentAuditRecordSchema = z.object({
  id: z.string(),
  timestamp: z.string().datetime(),
  displayTime: z.string(),
  
  // 1. Natural Language Intent & Business Context
  originalPrompt: z.string(),
  businessGoal: z.string(),
  category: IntentAuditCategorySchema,
  
  // 2. Line Item & Sourcing
  sku: z.string(),
  productName: z.string(),
  units: z.number().int().positive(),
  unitPriceUSD: z.number().positive(),
  grossTotalUSD: z.number().positive(),
  grossTotalINR: z.number().positive(),
  selectedPlatform: z.string(),
  paypalReceiverEmail: z.string().email(),
  
  // 3. Cross-Web Comparison
  crossWebComparisonSummary: z.string(),
  arbitrageSavingsUSD: z.number().nonnegative(),
  
  // 4. AI "Why-Trail" Systematics
  whyReasoning: z.object({
    intentDecoded: z.string(),
    sourcingRationalization: z.string(),
    solvencyVerification: z.string(),
    securityAuditVerdict: z.string(),
  }),
  
  // 5. Financial Invariants
  mandateCapUSD: z.number().positive(),
  liquidRunwayDays: z.number().nonnegative(),
  zkSolvencyStatus: z.enum(["SOLVENT_RESERVE_PRESERVED", "RUNWAY_SAFE"]),
  
  // 6. PayPal Settlement State
  status: z.enum(["AUTHORIZED_HELD_IN_UNDO", "CAPTURED_SETTLED", "VOIDED_REVERSED"]),
  paypalOrderId: z.string().optional(),
  paypalAuthorizationId: z.string().optional(),
  undoSecondsRemaining: z.number().nonnegative().optional(),
  
  // 7. Non-repudiation audit hash
  auditHash: z.string(),
});

export type IntentAuditRecord = z.infer<typeof IntentAuditRecordSchema>;
