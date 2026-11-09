import { z } from "zod";

/**
 * Target Schema for Structured Intent Grounding (Job 1)
 * Enforces strictly typed payloads with zero LLM math hallucinations.
 */
export const IntentModeSchema = z.enum([
  "URGENT_RESTOCK",
  "CONSERVATIVE_RESTOCK",
  "PRICE_DISCOVERY",
]);
export type IntentMode = z.infer<typeof IntentModeSchema>;

export const ProposedIntentDraftSchema = z.object({
  sku: z.string().min(1, "SKU must not be empty"),
  targetUnits: z.number().int().positive("Target units must be a positive integer"),
  maxBudgetUSD: z.number().positive("Max budget must be a positive amount"),
  preferredSupplierId: z.string().optional(),
  intentMode: IntentModeSchema,
  retrievedRulesApplied: z.array(z.string()),
});
export type ProposedIntentDraft = z.infer<typeof ProposedIntentDraftSchema>;

/**
 * Generic High-Trust Knowledge Base Item.
 * Topic-agnostic schema: works for ANY domain (apparel, electronics, automotive, groceries, etc.)
 */
export const KnowledgeItemSchema = z.object({
  id: z.string(),
  text: z.string(),
  sku: z.string().optional(),
  aliases: z.array(z.string()).default([]),
  preferredSupplierId: z.string().optional(),
  defaultOrderUnits: z.number().int().positive().optional(),
  maxBudgetUSD: z.number().positive().optional(),
  tags: z.array(z.string()).default([]),
});
export type KnowledgeItem = z.infer<typeof KnowledgeItemSchema>;

/**
 * Outcome of the Intent Grounding Process:
 * - GROUNDED: Single clear SKU resolved with exact match or decisive semantic score.
 * - AMBIGUOUS_ABSTAIN: Multiple candidate SKUs match with similar score; drops to Tier 0 (Suggest Mode).
 * - UNRESOLVED: Prompt does not match any known SKU or catalog item.
 */
export const IntentGroundingResultSchema = z.object({
  status: z.enum(["GROUNDED", "AMBIGUOUS_ABSTAIN", "UNRESOLVED"]),
  targetTier: z.number().int().min(0).max(2),
  draft: ProposedIntentDraftSchema.nullable(),
  candidateSkus: z.array(z.string()).default([]),
  merchantPrompt: z.string().optional(),
  abstainReason: z.string().optional(),
});
export type IntentGroundingResult = z.infer<typeof IntentGroundingResultSchema>;
