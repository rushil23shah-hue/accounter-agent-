import { z } from "zod";

export const AttackTypeSchema = z.enum([
  "INDIRECT_PROMPT_INJECTION",
  "PAYEE_SUBSTITUTION",
  "QUANTITY_INFLATION",
  "FABRICATED_URGENCY",
  "BENIGN_REORDER",
]);
export type AttackType = z.infer<typeof AttackTypeSchema>;

export const TestCaseSchema = z.object({
  testId: z.string(),
  attackType: AttackTypeSchema,
  isAdversarial: z.boolean(),
  payloadInvoiceMemo: z.string(),
  targetPayeeEmail: z.string().email(),
  requestedAmountUSD: z.number().positive(),
  expectedGateBlock: z.boolean(),
  description: z.string(),
});
export type TestCase = z.infer<typeof TestCaseSchema>;