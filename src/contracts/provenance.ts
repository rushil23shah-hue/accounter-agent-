// untrusted strings are isolated from the system instructions
import { z } from "zod";

export const ProvenanceTagSchema = z.enum([
  "USER_EXPLICIT_INSTRUCTION",
  "OWNER_INTENT_PROFILE",
  "UNTRUSTED_SUPPLIER_INVOICE",
  "UNTRUSTED_SUPPLIER_EMAIL",
  "DERIVED_CODE_CALCULATION",
]);
export type ProvenanceTag = z.infer<typeof ProvenanceTagSchema>;

export const TaintIsolatedStringSchema = z.object({
  rawContent: z.string(),
  tag: ProvenanceTagSchema,
  sourceIdentifier: z.string().min(1),
  ingestedAt: z.string().datetime(),
  isQuarantined: z.boolean(),
  sha256Hash: z.string().regex(/^[a-f0-9]{64}$/, "Must be valid SHA-256 hash"),
});
export type TaintIsolatedString = z.infer<typeof TaintIsolatedStringSchema>;