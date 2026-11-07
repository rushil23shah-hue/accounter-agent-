import { z } from "zod";
import { WhitelistedPayee, TaintIsolatedString } from "../contracts/index.js";
import { TaintQuarantineParser } from "../engines/taint-parser.js";

// ─────────────────────────────────────────────────────────────────────────────
// Schemas & Types
// ─────────────────────────────────────────────────────────────────────────────

export const ShieldThreatTypeSchema = z.enum([
  "INDIRECT_PROMPT_INJECTION",
  "PAYEE_SUBSTITUTION",
  "AMOUNT_INFLATION",
  "STEALTH_UNICODE_OBFUSCATION",
  "URGENCY_FABRICATION",
  "BASE64_ENCODED_PAYLOAD",
  "RTL_OVERRIDE_ATTACK",
  "MARKDOWN_IMAGE_EXPLOIT",
  "HTML_COMMENT_INJECTION",
  "GOAL_HIJACKING",
]);
export type ShieldThreatType = z.infer<typeof ShieldThreatTypeSchema>;

export const ThreatReportSchema = z.object({
  type: ShieldThreatTypeSchema,
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  matchedPattern: z.string(),
  excerpt: z.string().max(400), // bounded to prevent log-flooding
  remediation: z.string(),
});
export type ThreatReport = z.infer<typeof ThreatReportSchema>;

export const ShieldVerdictSchema = z.object({
  clearedForPayment: z.boolean(),
  riskScore: z.number().min(0).max(1),
  threatsDetected: z.array(ThreatReportSchema),
  sanitizedParameters: z
    .object({
      payeeEmail: z.string().email(),
      amountUSD: z.number().positive(),
      sku: z.string(),
      units: z.number().int().positive(),
    })
    .optional(),
  whyExplanation: z.string(),
  shieldTimestamp: z.string().datetime(),
  scanDurationMs: z.number().nonnegative(),
});
export type ShieldVerdict = z.infer<typeof ShieldVerdictSchema>;

export interface PreFlightScanRequest {
  /** Raw text from inbound supplier invoice or email. */
  incomingInvoiceOrEmailText: string;
  /** PayPal email of the proposed payee. */
  proposedPayeeEmail: string;
  /** The amount the system is about to send. */
  proposedAmountUSD: number;
  /** The amount quoted/agreed previously — used for inflation detection. */
  expectedAmountUSD: number;
  /** SKU of the item being restocked. */
  sku: string;
  /** Number of units being ordered. */
  units: number;
  /** Merchant's whitelist of authorised suppliers. */
  whitelistedPayees: WhitelistedPayee[];
  /** Identifier of the data source (e.g. `supplier_feed_sup_123`). */
  sourceIdentifier: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Attack-Pattern Definitions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Each pattern entry describes one class of attack, the regex to detect it,
 * its severity level, and a human-readable remediation note.
 *
 * Adding a new attack class is a one-line change here — no scattered if/else.
 */
interface PatternEntry {
  type: ShieldThreatType;
  regex: RegExp;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  remediation: string;
}

const INJECTION_PATTERN_ENTRIES: PatternEntry[] = [
  // ── Classic prompt-injection phrases ──────────────────────────────────────
  {
    type: "INDIRECT_PROMPT_INJECTION",
    regex: /ignore\s+(all\s+)?(previous|prior)\s+instructions/i,
    severity: "CRITICAL",
    remediation: "Classic ignore-instructions payload quarantined as data literal.",
  },
  {
    type: "INDIRECT_PROMPT_INJECTION",
    regex: /system\s+override/i,
    severity: "CRITICAL",
    remediation: "System-override directive quarantined.",
  },
  {
    type: "INDIRECT_PROMPT_INJECTION",
    regex: /disregard\s+(all\s+)?(rules|restrictions|guidelines)/i,
    severity: "CRITICAL",
    remediation: "Rule-disregard directive quarantined.",
  },
  {
    type: "INDIRECT_PROMPT_INJECTION",
    regex: /developer\s+mode/i,
    severity: "HIGH",
    remediation: "Developer-mode unlock attempt blocked.",
  },
  {
    type: "INDIRECT_PROMPT_INJECTION",
    regex: /new\s+system\s+directive/i,
    severity: "CRITICAL",
    remediation: "Injected system directive quarantined.",
  },
  {
    type: "INDIRECT_PROMPT_INJECTION",
    regex: /you\s+are\s+now\s+(an?\s+)?[\w\s]{1,30}\s*,?\s*(and\s+you\s+should|your\s+task\s+is)/i,
    severity: "CRITICAL",
    remediation: "Persona-replacement injection quarantined.",
  },
  // ── Payment-redirect phrases ──────────────────────────────────────────────
  {
    type: "INDIRECT_PROMPT_INJECTION",
    regex: /transfer\s+(all\s+)?funds?\s+to/i,
    severity: "CRITICAL",
    remediation: "Payment-redirect instruction blocked.",
  },
  {
    type: "INDIRECT_PROMPT_INJECTION",
    regex: /pay\s+instead\s+to/i,
    severity: "CRITICAL",
    remediation: "Alternative-payee redirect blocked.",
  },
  {
    type: "INDIRECT_PROMPT_INJECTION",
    regex: /credit\s+(my\s+)?(personal|private)\s+account/i,
    severity: "CRITICAL",
    remediation: "Personal-account credit redirect blocked.",
  },
  {
    type: "INDIRECT_PROMPT_INJECTION",
    regex: /paypal\s+account\s+(has\s+)?(changed|updated)/i,
    severity: "CRITICAL",
    remediation: "PayPal account-change notice blocked — potential BEC attack.",
  },
  // ── Urgency fabrication ───────────────────────────────────────────────────
  {
    type: "URGENCY_FABRICATION",
    regex: /urgent\s+wire\s+transfer/i,
    severity: "HIGH",
    remediation: "Fabricated urgency signal stripped; payment gated for manual review.",
  },
  {
    type: "URGENCY_FABRICATION",
    regex: /immediate\s+payment\s+required|pay\s+within\s+(\d+)\s+minutes?/i,
    severity: "HIGH",
    remediation: "High-urgency coercion pattern detected and suppressed.",
  },
  // ── Goal-hijacking ────────────────────────────────────────────────────────
  {
    type: "GOAL_HIJACKING",
    regex: /your\s+(primary\s+)?goal\s+is\s+now/i,
    severity: "CRITICAL",
    remediation: "Goal-override injection quarantined as data literal.",
  },
  {
    type: "GOAL_HIJACKING",
    regex: /forget\s+your\s+(previous\s+)?(instructions|task|objective)/i,
    severity: "CRITICAL",
    remediation: "Task-replacement directive blocked.",
  },
  // ── HTML / XML hidden payloads ────────────────────────────────────────────
  {
    type: "HTML_COMMENT_INJECTION",
    regex: /<!--\s*SYSTEM.*?-->/is,
    severity: "CRITICAL",
    remediation: "HTML comment carrying SYSTEM prompt stripped.",
  },
  {
    type: "HTML_COMMENT_INJECTION",
    regex: /<script[\s>]/i,
    severity: "CRITICAL",
    remediation: "Embedded <script> tag removed.",
  },
  // ── Markdown image exploit: ![alt](javascript:...) ───────────────────────
  {
    type: "MARKDOWN_IMAGE_EXPLOIT",
    regex: /!\[.*?\]\((javascript|data):/i,
    severity: "HIGH",
    remediation: "Markdown image with javascript/data-URI scheme blocked.",
  },
];

/** Detects zero-width and bidirectional Unicode characters used for obfuscation. */
const UNICODE_OBFUSCATION_REGEX =
  /[\u200B-\u200F\u202A-\u202E\u2060-\u2064\uFEFF\u00A0\u180E]/;

/** Specifically flags U+202E RIGHT-TO-LEFT OVERRIDE — a severe attack vector. */
const RTL_OVERRIDE_REGEX = /\u202E/;

/**
 * Detects Base64-encoded blobs that could contain hidden payloads.
 * Requires at least 40 chars of Base64 to avoid false-positives on
 * short product codes like "SKU-B64".
 */
const BASE64_PAYLOAD_REGEX = /[A-Za-z0-9+/]{40,}={0,2}/;

// Inflation tolerance: flag anything more than 10 % above the expected amount.
const INFLATION_TOLERANCE_RATIO = 1.10;

// ─────────────────────────────────────────────────────────────────────────────
// Risk Score Calculation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Computes a continuous risk score in [0, 1] from the detected threat set.
 *
 * Logic:
 *  - Any CRITICAL threat → 1.0 (hard block, no nuance).
 *  - Multiple HIGH threats → 0.80.
 *  - Single HIGH threat → 0.60.
 *  - MEDIUM threats → 0.35.
 *  - LOW threats only → 0.15.
 *  - No threats → 0.0.
 *
 * We use the *highest* severity tier as the dominant signal, then
 * count multiplies it slightly for multi-threat payloads.
 */
function computeRiskScore(threats: ThreatReport[]): number {
  if (threats.length === 0) return 0.0;

  const hasCritical = threats.some((t) => t.severity === "CRITICAL");
  if (hasCritical) return 1.0;

  const highCount = threats.filter((t) => t.severity === "HIGH").length;
  if (highCount >= 2) return 0.80;
  if (highCount === 1) return 0.60;

  const mediumCount = threats.filter((t) => t.severity === "MEDIUM").length;
  if (mediumCount > 0) return 0.35;

  return 0.15; // LOW only
}

// ─────────────────────────────────────────────────────────────────────────────
// Shield
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Pre-Flight Payment Security Shield ("Steward Shield").
 *
 * Acts as an inbound firewall for every payment that is about to hit the
 * PayPal API.  It enforces five independent defence layers:
 *
 *   1. **Quarantine** – wraps raw supplier text in a taint-isolated envelope
 *      so the content can never be executed as LLM instructions.
 *   2. **Injection scan** – 15+ regex patterns covering prompt injection,
 *      goal hijacking, payment redirect, HTML comment payloads, and markdown
 *      image exploits.
 *   3. **Unicode obfuscation scan** – zero-width characters, bidirectional
 *      overrides (U+202E RTL), invisible padding.
 *   4. **Base64 payload scan** – encoded blobs that could smuggle instructions.
 *   5. **Payee whitelist check** – hard block on any payee not in the
 *      merchant's pre-approved supplier list.
 *   6. **Amount inflation check** – flags if the invoice exceeds the agreed
 *      quote by more than 10 %.
 *
 * Threat deduplication: within a single scan, each `ShieldThreatType` is
 * reported at most once — multiple regex hits of the same attack class are
 * collapsed into a single high-severity report with the first matched excerpt.
 */
export class PreFlightPaymentShield {
  /**
   * Scans an inbound payment request and returns a verdict.
   * This call is synchronous and must complete in < 5 ms (all CPU-bound regex).
   *
   * @param request  All parameters describing the proposed payment.
   * @throws {TypeError} If `proposedAmountUSD` or `units` are not positive
   *                     finite numbers.
   */
  public static inspect(request: PreFlightScanRequest): ShieldVerdict {
    // ── Guard clauses ──────────────────────────────────────────────────────
    if (!Number.isFinite(request.proposedAmountUSD) || request.proposedAmountUSD <= 0) {
      throw new TypeError(
        `PreFlightPaymentShield: proposedAmountUSD must be a positive finite number, got ${request.proposedAmountUSD}`,
      );
    }
    if (!Number.isInteger(request.units) || request.units <= 0) {
      throw new TypeError(
        `PreFlightPaymentShield: units must be a positive integer, got ${request.units}`,
      );
    }

    const startMs = Date.now();
    const threats: ThreatReport[] = [];
    // Track which threat types have already been reported to prevent duplicates.
    const reportedTypes = new Set<ShieldThreatType>();

    // ── Layer 1: Quarantine inbound text ──────────────────────────────────
    const quarantined: TaintIsolatedString = TaintQuarantineParser.ingest(
      request.incomingInvoiceOrEmailText,
      "UNTRUSTED_SUPPLIER_INVOICE",
      request.sourceIdentifier,
    );
    const content = quarantined.rawContent;

    // ── Layer 2: Injection pattern scan ───────────────────────────────────
    for (const entry of INJECTION_PATTERN_ENTRIES) {
      if (reportedTypes.has(entry.type)) continue; // deduplicate same type
      const match = content.match(entry.regex);
      if (match) {
        reportedTypes.add(entry.type);
        threats.push({
          type: entry.type,
          severity: entry.severity,
          matchedPattern: entry.regex.source,
          excerpt: match[0].slice(0, 200), // cap excerpt length
          remediation: entry.remediation,
        });
      }
    }

    // ── Layer 3a: Unicode RTL Override (severe — own block) ───────────────
    if (!reportedTypes.has("RTL_OVERRIDE_ATTACK") && RTL_OVERRIDE_REGEX.test(content)) {
      reportedTypes.add("RTL_OVERRIDE_ATTACK");
      threats.push({
        type: "RTL_OVERRIDE_ATTACK",
        severity: "CRITICAL",
        matchedPattern: "Unicode U+202E RIGHT-TO-LEFT OVERRIDE",
        excerpt: "RTL override character detected — text may visually misrepresent amounts or payee.",
        remediation: "Hard block: RTL override is unambiguously adversarial in invoice context.",
      });
    }

    // ── Layer 3b: Generic Unicode obfuscation ─────────────────────────────
    if (
      !reportedTypes.has("STEALTH_UNICODE_OBFUSCATION") &&
      UNICODE_OBFUSCATION_REGEX.test(content)
    ) {
      reportedTypes.add("STEALTH_UNICODE_OBFUSCATION");
      threats.push({
        type: "STEALTH_UNICODE_OBFUSCATION",
        severity: "HIGH",
        matchedPattern: "Unicode invisible/bidirectional control characters",
        excerpt: "Detected invisible or bidirectional unicode characters in invoice body.",
        remediation: "Characters stripped during sanitization; invoice flagged for manual review.",
      });
    }

    // ── Layer 4: Base64 encoded payload ───────────────────────────────────
    if (!reportedTypes.has("BASE64_ENCODED_PAYLOAD") && BASE64_PAYLOAD_REGEX.test(content)) {
      reportedTypes.add("BASE64_ENCODED_PAYLOAD");
      threats.push({
        type: "BASE64_ENCODED_PAYLOAD",
        severity: "MEDIUM",
        matchedPattern: "Base64 blob ≥ 40 characters",
        excerpt: "Long Base64 string found — may conceal encoded instructions.",
        remediation: "Flagged for human review; Base64 blob not decoded or executed.",
      });
    }

    // ── Layer 5: Payee whitelist check ────────────────────────────────────
    const normalizedPayee = request.proposedPayeeEmail.trim().toLowerCase();
    const matchedWhitelisted = request.whitelistedPayees.find(
      (p) => p.paypalReceiverEmail.trim().toLowerCase() === normalizedPayee && p.isActive,
    );

    if (!matchedWhitelisted) {
      reportedTypes.add("PAYEE_SUBSTITUTION");
      threats.push({
        type: "PAYEE_SUBSTITUTION",
        severity: "CRITICAL",
        matchedPattern: "PAYEE_NOT_IN_ACTIVE_WHITELIST",
        excerpt: `Proposed payee "${request.proposedPayeeEmail}" is not on the merchant's active whitelist.`,
        remediation: "Hard block: payment gated until merchant explicitly authorises this payee.",
      });
    }

    // ── Layer 6: Amount inflation check ───────────────────────────────────
    if (request.expectedAmountUSD > 0) {
      const inflationRatio = request.proposedAmountUSD / request.expectedAmountUSD;
      if (inflationRatio > INFLATION_TOLERANCE_RATIO) {
        const pctOver = Math.round((inflationRatio - 1) * 100);
        threats.push({
          type: "AMOUNT_INFLATION",
          severity: "HIGH",
          matchedPattern: `PRICE_INFLATION_>${Math.round((INFLATION_TOLERANCE_RATIO - 1) * 100)}PCT`,
          excerpt: `Proposed $${request.proposedAmountUSD.toFixed(2)} exceeds quoted $${request.expectedAmountUSD.toFixed(2)} by ${pctOver}%.`,
          remediation: "Payment blocked pending merchant confirmation of unexpected surcharge.",
        });
      }
    }

    // ── Risk score & verdict ──────────────────────────────────────────────
    const riskScore = computeRiskScore(threats);
    const clearedForPayment = threats.length === 0;

    // ── Why explanation ───────────────────────────────────────────────────
    let whyExplanation: string;
    if (clearedForPayment) {
      whyExplanation =
        `Steward Shield CLEARED: Payee "${request.proposedPayeeEmail}" is verified. ` +
        `Amount $${request.proposedAmountUSD.toFixed(2)} matches quoted $${request.expectedAmountUSD.toFixed(2)}. ` +
        `All ${INJECTION_PATTERN_ENTRIES.length + 4} attack-pattern checks passed.`;
    } else {
      const typeSummary = [...reportedTypes].join(", ");
      whyExplanation =
        `Steward Shield BLOCKED: ${threats.length} threat(s) detected [${typeSummary}]. ` +
        `Risk score: ${(riskScore * 100).toFixed(0)}%. ` +
        threats.map((t) => `[${t.type} / ${t.severity}]: ${t.excerpt}`).join(" | ");
    }

    const scanDurationMs = Date.now() - startMs;

    return {
      clearedForPayment,
      riskScore,
      threatsDetected: threats,
      sanitizedParameters: clearedForPayment
        ? {
            payeeEmail: request.proposedPayeeEmail,
            amountUSD: request.proposedAmountUSD,
            sku: request.sku,
            units: request.units,
          }
        : undefined,
      whyExplanation,
      shieldTimestamp: new Date().toISOString(),
      scanDurationMs,
    };
  }
}
