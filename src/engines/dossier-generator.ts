import crypto from "node:crypto";
import {
  DisputeDossier,
  DisputeDossierSchema,
  OwnerIntentProfile,
  TaintIsolatedString,
  PolicyDecision,
} from "../contracts/index.js";
import { ShieldVerdict } from "../privacy/pre-flight-shield.js";

export interface GenerateDossierParams {
  paypalAuthorizationId: string;
  paypalCaptureId?: string | null;
  ownerProfile: OwnerIntentProfile;
  provenanceTrail: TaintIsolatedString[];
  deterministicGateResult: PolicyDecision;
  shieldVerdict?: ShieldVerdict | null;
  flaggedAttackType?: string | null;
  incidentDescription?: string;
}

/**
 * 1-Click Forensic Dispute Dossier Generator (Layer 6).
 * Compiles a tamper-evident, cryptographically verifiable evidentiary packet
 * for submission to the PayPal Resolution Center during supplier disputes,
 * unauthorized invoice diversions, or adversarial spoofing incidents.
 */
export class DisputeDossierGenerator {
  /**
   * Generates a verifiable dispute dossier conforming strictly to DisputeDossierSchema.
   */
  public static generateDossier(params: GenerateDossierParams): DisputeDossier {
    const dossierId = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    // 1. Compute cryptographic SHA-256 hash of the Owner Intent Profile at time of incident
    const ownerIntentHash = crypto
      .createHash("sha256")
      .update(JSON.stringify(params.ownerProfile), "utf8")
      .digest("hex");

    // 2. Identify flagged attack type from parameters or shield verdict
    let flaggedAttackType: string | null = params.flaggedAttackType ?? null;
    if (!flaggedAttackType && params.shieldVerdict && params.shieldVerdict.threatsDetected.length > 0) {
      flaggedAttackType = params.shieldVerdict.threatsDetected[0].type;
    } else if (!flaggedAttackType && !params.deterministicGateResult.allowed) {
      flaggedAttackType = params.deterministicGateResult.violations[0] || "POLICY_GATE_REJECTION";
    }

    // 3. Compile executive narrative evidence summary
    const threatSummary = params.shieldVerdict?.threatsDetected.length
      ? `Intercepted Security Threats: ${params.shieldVerdict.threatsDetected.map((t) => `${t.type} (${t.severity})`).join(", ")}.`
      : "No adversarial injection detected by inbound pre-flight shield.";

    const evidenceSummary =
      `[FORENSIC DISPUTE DOSSIER #${dossierId}]\n` +
      `Incident Timestamp: ${createdAt}\n` +
      `PayPal Auth ID: ${params.paypalAuthorizationId} | Capture ID: ${params.paypalCaptureId || "NOT_CAPTURED"}\n` +
      `Owner Intent Commitment: SHA-256 ${ownerIntentHash} (Ceiling: $${params.ownerProfile.hardCeilingUSD}, Mode: ${params.ownerProfile.mode})\n` +
      `Deterministic Policy Gate: ${params.deterministicGateResult.allowed ? "APPROVED" : "REJECTED"} (Violations: ${params.deterministicGateResult.violations.join("; ") || "None"})\n` +
      `Decision Reason: ${params.deterministicGateResult.decisionReason}\n` +
      `${threatSummary}\n` +
      `Provenance Artifacts: ${params.provenanceTrail.length} verified immutable message digest(s) on record.\n` +
      `Merchant Context: ${params.incidentDescription || "Automated transaction audit for PayPal Resolution Center."}`;

    const dossier: DisputeDossier = {
      dossierId,
      createdAt,
      paypalAuthorizationId: params.paypalAuthorizationId,
      paypalCaptureId: params.paypalCaptureId ?? null,
      ownerIntentHash,
      provenanceTrail: params.provenanceTrail,
      deterministicGateResult: params.deterministicGateResult,
      flaggedAttackType,
      evidenceSummary,
    };

    // Validate with Zod schema
    return DisputeDossierSchema.parse(dossier);
  }

  /**
   * Formats the dispute dossier into a printable audit summary.
   */
  public static toAuditReport(dossier: DisputeDossier): string {
    return [
      `================================================================================`,
      `              PAYPAL RESOLUTION CENTER — FORENSIC EVIDENCE DOSSIER              `,
      `================================================================================`,
      `Dossier ID        : ${dossier.dossierId}`,
      `Created At        : ${dossier.createdAt}`,
      `Authorization ID  : ${dossier.paypalAuthorizationId}`,
      `Capture ID        : ${dossier.paypalCaptureId ?? "N/A (Held/Voided in Undo Window)"}`,
      `Intent Hash       : ${dossier.ownerIntentHash}`,
      `Flagged Attack    : ${dossier.flaggedAttackType ?? "None (Clean Transaction Audit)"}`,
      `Policy Gate Status: ${dossier.deterministicGateResult.allowed ? "CLEARED" : "BLOCKED"}`,
      `--------------------------------------------------------------------------------`,
      `PROVENANCE INVENTORY:`,
      ...dossier.provenanceTrail.map(
        (p, idx) =>
          `  [${idx + 1}] Source: ${p.sourceIdentifier} | Tag: ${p.tag} | SHA-256: ${p.sha256Hash}`
      ),
      `--------------------------------------------------------------------------------`,
      `EVIDENCE SUMMARY:`,
      dossier.evidenceSummary,
      `================================================================================`,
    ].join("\n");
  }
}
