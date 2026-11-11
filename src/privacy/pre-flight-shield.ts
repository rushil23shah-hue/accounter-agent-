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
  "TOOL_CALL_SPOOFING",
]);
export type ShieldThreatType = z.infer<typeof ShieldThreatTypeSchema>;

export const ThreatReportSchema = z.object({
  type: ShieldThreatTypeSchema,
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  matchedPattern: z.string(),
  excerpt: z.string().max(400),
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
  incomingInvoiceOrEmailText: string;
  proposedPayeeEmail: string;
  proposedAmountUSD: number;
  expectedAmountUSD: number;
  sku: string;
  units: number;
  whitelistedPayees: WhitelistedPayee[];
  sourceIdentifier: string;
}

interface PatternEntry {
  type: ShieldThreatType;
  regex: RegExp;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  remediation: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hardened Attack Patterns
// ─────────────────────────────────────────────────────────────────────────────

const INJECTION_PATTERN_ENTRIES: PatternEntry[] = [
  // ── 1. Classic & Prompt Injection Variants ────────────────────────────────
  {
    type: "INDIRECT_PROMPT_INJECTION",
    regex: /ignore\s+(all\s+)?(previous|prior)\s+instructions/i,
    severity: "CRITICAL",
    remediation: "Classic ignore-instructions payload quarantined.",
  },
  {
    type: "INDIRECT_PROMPT_INJECTION",
    regex: /system\s+override/i,
    severity: "CRITICAL",
    remediation: "System override directive quarantined.",
  },
  {
    type: "INDIRECT_PROMPT_INJECTION",
    regex: /disregard\s+(all\s+)?(rules|restrictions|guidelines|policies|safety)/i,
    severity: "CRITICAL",
    remediation: "Rule/safety-disregard directive quarantined.",
  },
  {
    type: "INDIRECT_PROMPT_INJECTION",
    regex: /(developer|debug)\s+mode(\s+enabled)?/i,
    severity: "HIGH",
    remediation: "Debug/Developer mode unlock attempt blocked.",
  },
  {
    type: "INDIRECT_PROMPT_INJECTION",
    regex: /new\s+system\s+directive/i,
    severity: "CRITICAL",
    remediation: "New system directive quarantined.",
  },
  {
    type: "INDIRECT_PROMPT_INJECTION",
    regex: /you\s+are\s+now\s+(an?\s+)?[\w\s]{1,30}\s*,?\s*(and\s+you\s+should|your\s+task\s+is|without|free)/i,
    severity: "CRITICAL",
    remediation: "Persona replacement attempt blocked.",
  },
  {
    type: "INDIRECT_PROMPT_INJECTION",
    regex: /\bDAN\b|\bDo\s+Anything\s+Now\b/i,
    severity: "CRITICAL",
    remediation: "DAN jailbreak signature blocked.",
  },
  {
    type: "INDIRECT_PROMPT_INJECTION",
    regex: /(fictional\s+screenplay|for\s+the\s+script|let's\s+play\s+a\s+game)/i,
    severity: "HIGH",
    remediation: "Hypothetical scenario jailbreak blocked.",
  },
  {
    type: "INDIRECT_PROMPT_INJECTION",
    regex: /(do\s+not.*?instead\s+do\s+the\s+exact\s+opposite|since\s+whitelists\s+are\s+optional)/i,
    severity: "HIGH",
    remediation: "Reverse psychology or inverted logic trap blocked.",
  },

  // ── 2. Multi-Model Control Delimiter Smuggling ────────────────────────────
  {
    type: "INDIRECT_PROMPT_INJECTION",
    regex: /<\|im_start\|>|<\|im_end\|>|<\|start_header_id\|>|<\|end_header_id\|>|<\|eot_id\|>/i,
    severity: "CRITICAL",
    remediation: "ChatML / Llama 3 header tokens blocked.",
  },
  {
    type: "INDIRECT_PROMPT_INJECTION",
    regex: /\[\/?INST\]|<<SYS>>|<<\/SYS>>/i,
    severity: "CRITICAL",
    remediation: "Llama / Mistral [INST] delimiter injection blocked.",
  },
  {
    type: "INDIRECT_PROMPT_INJECTION",
    regex: /<｜begin\s+of\s+sentence｜>|<｜User｜>|<｜Assistant｜>/i,
    severity: "CRITICAL",
    remediation: "DeepSeek control delimiter tokens blocked.",
  },
  {
    type: "INDIRECT_PROMPT_INJECTION",
    regex: /\n\nHuman:\s*|\n\nAssistant:\s*/i,
    severity: "CRITICAL",
    remediation: "Anthropic dialog delimiter injection blocked.",
  },

  // ── 3. Tool & Function Calling Spoofing ───────────────────────────────────
  {
    type: "TOOL_CALL_SPOOFING",
    regex: /<\/?tool_call>|{"function_call":|{"name":\s*"paypal_/i,
    severity: "CRITICAL",
    remediation: "Raw tool-calling syntax spoofing blocked.",
  },

  // ── 4. Polyglot Foreign-Language Injections ──────────────────────────────
  {
    type: "INDIRECT_PROMPT_INJECTION",
    regex: /ignora\s+(todas\s+)?las\s+instrucciones\s+anteriores/i,
    severity: "CRITICAL",
    remediation: "Spanish prompt injection blocked.",
  },
  {
    type: "INDIRECT_PROMPT_INJECTION",
    regex: /ignorez\s+(toutes\s+)?les\s+instructions\s+pr[eé]c[eé]dentes/i,
    severity: "CRITICAL",
    remediation: "French prompt injection blocked.",
  },
  {
    type: "INDIRECT_PROMPT_INJECTION",
    regex: /игнорируйте\s+предыдущие\s+инструкции/i,
    severity: "CRITICAL",
    remediation: "Russian prompt injection blocked.",
  },
  {
    type: "INDIRECT_PROMPT_INJECTION",
    regex: /忽略之前的所有指令/i,
    severity: "CRITICAL",
    remediation: "Chinese prompt injection blocked.",
  },

  // ── 5. Payment Rerouting in Memos ────────────────────────────────────────
  {
    type: "INDIRECT_PROMPT_INJECTION",
    regex: /transfer\s+(all\s+)?funds?\s+to/i,
    severity: "CRITICAL",
    remediation: "Payment-redirect instruction blocked.",
  },
  {
    type: "INDIRECT_PROMPT_INJECTION",
    regex: /(pay\s+instead\s+to|reroute\s+(this\s+)?(payment|funds?)\s+to|divert\s+(this\s+)?(payment|funds?)\s+to)/i,
    severity: "CRITICAL",
    remediation: "Alternative-payee redirect in memo blocked.",
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
    remediation: "PayPal account-change notice blocked (BEC).",
  },

  // ── 6. Goal Hijacking & Reconnaissance ────────────────────────────────────
  {
    type: "GOAL_HIJACKING",
    regex: /disregard\s+(inventory\s+)?goals?|new\s+(business\s+)?priority:/i,
    severity: "CRITICAL",
    remediation: "Goal-override injection quarantined.",
  },
  {
    type: "GOAL_HIJACKING",
    regex: /your\s+(primary\s+)?goal\s+is\s+now|forget\s+your\s+(previous\s+)?(instructions|task)/i,
    severity: "CRITICAL",
    remediation: "Task-replacement directive blocked.",
  },
  {
    type: "INDIRECT_PROMPT_INJECTION",
    regex: /print\s+your\s+(exact\s+)?system\s+prompt|repeat\s+(the\s+)?text\s+above/i,
    severity: "HIGH",
    remediation: "Prompt extraction reconnaissance blocked.",
  },

  // ── 7. Urgency, Coercion & Extortion ──────────────────────────────────────
  {
    type: "URGENCY_FABRICATION",
    regex: /urgent\s+wire\s+transfer|ceo\s+emergency/i,
    severity: "HIGH",
    remediation: "Fabricated urgency signal stripped.",
  },
  {
    type: "URGENCY_FABRICATION",
    regex: /immediate\s+(payment|settlement|tax\s+settlement)\s+required|pay\s+within\s+(\d+)\s+minutes?|ransom\s+demand/i,
    severity: "HIGH",
    remediation: "High-urgency coercion pattern suppressed.",
  },

  // ── 8. Web Exploits & Exfiltration ────────────────────────────────────────
  {
    type: "HTML_COMMENT_INJECTION",
    regex: /<!--.*?-->/is,
    severity: "CRITICAL",
    remediation: "HTML comment carrying hidden directives stripped.",
  },
  {
    type: "HTML_COMMENT_INJECTION",
    regex: /<script[\s>]/i,
    severity: "CRITICAL",
    remediation: "Embedded <script> tag removed.",
  },
  {
    type: "MARKDOWN_IMAGE_EXPLOIT",
    regex: /!\[.*?\]\((javascript|data|https?:\/\/)/i,
    severity: "HIGH",
    remediation: "Markdown image exploit / data beacon blocked.",
  },
  {
    type: "MARKDOWN_IMAGE_EXPLOIT",
    regex: /\[.*?\]\(javascript:/i,
    severity: "HIGH",
    remediation: "Javascript: URI link blocked.",
  },
];

const UNICODE_OBFUSCATION_REGEX = /[\u200B-\u200F\u202A-\u202E\u2060-\u2064\uFEFF\u00A0\u180E]/;
const RTL_OVERRIDE_REGEX = /\u202E/;
const BASE64_PAYLOAD_REGEX = /[A-Za-z0-9+/]{40,}={0,2}/;
const HEX_PAYLOAD_REGEX = /\b[0-9a-fA-F]{40,}\b/;
const INFLATION_TOLERANCE_RATIO = 1.10;

/** Normalizes Leetspeak substitutions */
function normalizeLeetspeak(text: string): string {
  return text
    .replace(/0/g, "o")
    .replace(/1/g, "i")
    .replace(/3/g, "e")
    .replace(/5/g, "s")
    .replace(/@/g, "a")
    .replace(/\$/g, "s");
}

/** Decodes URL percent-encoded characters safely */
function safeUrlDecode(text: string): string {
  try {
    return decodeURIComponent(text);
  } catch {
    return text;
  }
}

/** Detects mixed Cyrillic/Greek characters embedded in Latin context (homoglyphs) */
function hasMixedScriptHomoglyphs(text: string): boolean {
  // Flag if Cyrillic characters appear mixed into email addresses or Latin words
  const mixedMatch = text.match(/[a-zA-Z]+[\u0400-\u04FF]+|[\u0400-\u04FF]+[a-zA-Z]+/);
  return Boolean(mixedMatch);
}

function computeRiskScore(threats: ThreatReport[]): number {
  if (threats.length === 0) return 0.0;
  if (threats.some((t) => t.severity === "CRITICAL")) return 1.0;
  const highCount = threats.filter((t) => t.severity === "HIGH").length;
  if (highCount >= 2) return 0.8;
  if (highCount === 1) return 0.6;
  return 0.35;
}

// ─────────────────────────────────────────────────────────────────────────────
// Shield Implementation
// ─────────────────────────────────────────────────────────────────────────────

export class PreFlightPaymentShield {
  public static inspect(request: PreFlightScanRequest): ShieldVerdict {
    if (!Number.isFinite(request.proposedAmountUSD) || request.proposedAmountUSD <= 0) {
      throw new TypeError(`PreFlightPaymentShield: proposedAmountUSD must be a positive finite number, got ${request.proposedAmountUSD}`);
    }
    if (!Number.isInteger(request.units) || request.units <= 0) {
      throw new TypeError(`PreFlightPaymentShield: units must be a positive integer, got ${request.units}`);
    }

    const startMs = Date.now();
    const threats: ThreatReport[] = [];
    const reportedTypes = new Set<ShieldThreatType>();

    // ── Layer 1: Quarantine & Canonicalization ──────────────────────────────
    const quarantined: TaintIsolatedString = TaintQuarantineParser.ingest(
      request.incomingInvoiceOrEmailText,
      "UNTRUSTED_SUPPLIER_INVOICE",
      request.sourceIdentifier
    );
    const rawContent = quarantined.rawContent;

    // Build decoded and de-obfuscated forms for multi-pass inspection
    const decodedUrlContent = safeUrlDecode(rawContent);
    const normalizedLeetContent = normalizeLeetspeak(decodedUrlContent);

    // ── Layer 2: Injection Pattern Scan Across Canonical Forms ──────────────
    for (const entry of INJECTION_PATTERN_ENTRIES) {
      if (reportedTypes.has(entry.type)) continue;

      const match =
        rawContent.match(entry.regex) ||
        decodedUrlContent.match(entry.regex) ||
        normalizedLeetContent.match(entry.regex);

      if (match) {
        reportedTypes.add(entry.type);
        threats.push({
          type: entry.type,
          severity: entry.severity,
          matchedPattern: entry.regex.source,
          excerpt: match[0].slice(0, 200),
          remediation: entry.remediation,
        });
      }
    }

    // ── Layer 3a: RTL Unicode Override ──────────────────────────────────────
    if (!reportedTypes.has("RTL_OVERRIDE_ATTACK") && RTL_OVERRIDE_REGEX.test(rawContent)) {
      reportedTypes.add("RTL_OVERRIDE_ATTACK");
      threats.push({
        type: "RTL_OVERRIDE_ATTACK",
        severity: "CRITICAL",
        matchedPattern: "Unicode U+202E RIGHT-TO-LEFT OVERRIDE",
        excerpt: "RTL override character detected.",
        remediation: "Hard block: RTL override character is unambiguously adversarial.",
      });
    }

    // ── Layer 3b: Invisible / Obfuscation Unicode ───────────────────────────
    if (!reportedTypes.has("STEALTH_UNICODE_OBFUSCATION") && UNICODE_OBFUSCATION_REGEX.test(rawContent)) {
      reportedTypes.add("STEALTH_UNICODE_OBFUSCATION");
      threats.push({
        type: "STEALTH_UNICODE_OBFUSCATION",
        severity: "HIGH",
        matchedPattern: "Unicode invisible control characters",
        excerpt: "Detected invisible unicode characters in invoice body.",
        remediation: "Flagged for manual review.",
      });
    }

    // ── Layer 3c: Mixed-Script Cyrillic Homoglyphs ───────────────────────────
    if (!reportedTypes.has("STEALTH_UNICODE_OBFUSCATION") && hasMixedScriptHomoglyphs(rawContent)) {
      reportedTypes.add("STEALTH_UNICODE_OBFUSCATION");
      threats.push({
        type: "STEALTH_UNICODE_OBFUSCATION",
        severity: "HIGH",
        matchedPattern: "Mixed-Script Homoglyph Character Substitution",
        excerpt: "Detected Cyrillic homoglyph characters mixed into Latin words/emails.",
        remediation: "Homoglyph spoofing detected; payment blocked.",
      });
    }

    // ── Layer 4: Encoded Blobs (Base64 & Hex) ───────────────────────────────
    if (!reportedTypes.has("BASE64_ENCODED_PAYLOAD") && (BASE64_PAYLOAD_REGEX.test(rawContent) || HEX_PAYLOAD_REGEX.test(rawContent))) {
      reportedTypes.add("BASE64_ENCODED_PAYLOAD");
      threats.push({
        type: "BASE64_ENCODED_PAYLOAD",
        severity: "MEDIUM",
        matchedPattern: "Base64 or Hex encoded binary string",
        excerpt: "Large encoded blob found — may conceal smuggled instructions.",
        remediation: "Blob quarantined without execution.",
      });
    }

    // ── Layer 5: Payee Whitelist Check ──────────────────────────────────────
    const normalizedPayee = request.proposedPayeeEmail.trim().toLowerCase();
    const matchedWhitelisted = request.whitelistedPayees.find(
      (p) => p.paypalReceiverEmail.trim().toLowerCase() === normalizedPayee && p.isActive
    );

    if (!matchedWhitelisted) {
      reportedTypes.add("PAYEE_SUBSTITUTION");
      threats.push({
        type: "PAYEE_SUBSTITUTION",
        severity: "CRITICAL",
        matchedPattern: "PAYEE_NOT_IN_ACTIVE_WHITELIST",
        excerpt: `Proposed payee "${request.proposedPayeeEmail}" is not on active whitelist.`,
        remediation: "Hard block: payee must be pre-authorized by merchant.",
      });
    }

    // ── Layer 6: Amount Inflation Check ─────────────────────────────────────
    if (request.expectedAmountUSD > 0) {
      const inflationRatio = request.proposedAmountUSD / request.expectedAmountUSD;
      if (inflationRatio > INFLATION_TOLERANCE_RATIO) {
        const pctOver = Math.round((inflationRatio - 1) * 100);
        threats.push({
          type: "AMOUNT_INFLATION",
          severity: "HIGH",
          matchedPattern: `PRICE_INFLATION_OVER_${Math.round((INFLATION_TOLERANCE_RATIO - 1) * 100)}PCT`,
          excerpt: `Proposed $${request.proposedAmountUSD.toFixed(2)} exceeds quoted $${request.expectedAmountUSD.toFixed(2)} by ${pctOver}%.`,
          remediation: "Payment blocked pending merchant confirmation.",
        });
      }
    }

    // ── Verdict Compilation ─────────────────────────────────────────────────
    const riskScore = computeRiskScore(threats);
    const clearedForPayment = threats.length === 0;

    const whyExplanation = clearedForPayment
      ? `AgenticPay Shield CLEARED: Payee "${request.proposedPayeeEmail}" is verified. Amount within quote. All checks passed.`
      : `AgenticPay Shield BLOCKED: ${threats.length} threat(s) detected [${[...reportedTypes].join(", ")}]. Risk: ${(riskScore * 100).toFixed(0)}%.`;

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
      scanDurationMs: Date.now() - startMs,
    };
  }
}