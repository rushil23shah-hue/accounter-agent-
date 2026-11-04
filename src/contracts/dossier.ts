//paypal dispute dossier
import { z } from "zod";
import { TaintIsolatedStringSchema } from "./provenance.js";
import { PolicyDecisionSchema } from "./policy.js";

export const DisputeDossierSchema = z.object({
  dossierId: z.string().uuid(),
  createdAt: z.string().datetime(),
  paypalAuthorizationId: z.string(),
  paypalCaptureId: z.string().nullable(),
  ownerIntentHash: z.string().regex(/^[a-f0-9]{64}$/),
  provenanceTrail: z.array(TaintIsolatedStringSchema),
  deterministicGateResult: PolicyDecisionSchema,
  flaggedAttackType: z.string().nullable(),
  evidenceSummary: z.string(),
});
export type DisputeDossier = z.infer<typeof DisputeDossierSchema>;