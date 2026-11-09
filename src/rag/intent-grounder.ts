import {
  ProposedIntentDraft,
  ProposedIntentDraftSchema,
  IntentGroundingResult,
  IntentGroundingResultSchema,
  KnowledgeItem,
  IntentMode,
} from "../contracts/rag.js";

// Generic stop words across common queries
const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "of", "for", "in", "on", "at", "to", "from",
  "with", "our", "we", "is", "are", "be", "this", "that", "it", "what", "which",
  "who", "city", "capital", "please", "reorder", "order", "replenish", "purchase"
]);

/**
 * Topic-Agnostic High-Trust Knowledge Base.
 * Dynamically indexes arbitrary items, SKU aliases, and policy rules for ANY domain.
 * Zero hardcoded product names, categories, or industries.
 */
export class HighTrustKnowledgeBase {
  private readonly items: KnowledgeItem[] = [];
  private readonly skuMap: Map<string, KnowledgeItem> = new Map();
  private readonly aliasMap: Map<string, KnowledgeItem> = new Map();

  constructor(initialItems: KnowledgeItem[] = []) {
    for (const item of initialItems) {
      this.addItem(item);
    }
  }

  public addItem(item: KnowledgeItem): void {
    this.items.push(item);
    if (item.sku) {
      this.skuMap.set(item.sku.trim().toLowerCase(), item);
    }
    for (const alias of item.aliases) {
      this.aliasMap.set(alias.trim().toLowerCase(), item);
    }
  }

  public getItems(): KnowledgeItem[] {
    return [...this.items];
  }

  public getItemBySku(sku: string): KnowledgeItem | undefined {
    return this.skuMap.get(sku.trim().toLowerCase());
  }

  /**
   * Search knowledge base using exact match, token overlap, and n-gram similarity.
   * Completely domain-agnostic.
   */
  public search(query: string): Array<{ item: KnowledgeItem; score: number; matchType: "EXACT_SKU" | "EXACT_ALIAS" | "HYBRID" }> {
    const qLower = query.toLowerCase().trim();
    const qTokens = tokenizeWords(qLower).filter((t) => !STOP_WORDS.has(t));
    const results: Array<{ item: KnowledgeItem; score: number; matchType: "EXACT_SKU" | "EXACT_ALIAS" | "HYBRID" }> = [];

    for (const item of this.items) {
      const itemSkuLower = (item.sku || "").toLowerCase();
      
      // 1. Exact SKU match priority
      if (itemSkuLower && (qTokens.includes(itemSkuLower) || qLower.includes(itemSkuLower))) {
        results.push({ item, score: 100.0, matchType: "EXACT_SKU" });
        continue;
      }

      // 2. Exact alias match priority
      let matchedAlias = false;
      for (const alias of item.aliases) {
        const aliasLower = alias.toLowerCase().trim();
        if (aliasLower && qLower.includes(aliasLower)) {
          results.push({ item, score: 50.0 + aliasLower.length, matchType: "EXACT_ALIAS" });
          matchedAlias = true;
          break;
        }
      }
      if (matchedAlias) continue;

      // 3. Hybrid Token Overlap + Subword N-gram Cosine
      if (qTokens.length === 0) continue;

      const itemTextLower = `${item.text} ${item.aliases.join(" ")} ${item.tags.join(" ")}`.toLowerCase();
      const itemTokens = tokenizeWords(itemTextLower).filter((t) => !STOP_WORDS.has(t));
      
      let tokenOverlap = 0;
      for (const qt of qTokens) {
        if (itemTokens.includes(qt)) {
          tokenOverlap += 1.0;
        }
      }

      // If no substantive content words overlap, do not falsely score
      if (tokenOverlap === 0) continue;

      const sim = computeNgramCosine(qLower, itemTextLower);
      const compositeScore = (tokenOverlap * 3.0) + (sim * 4.0);

      // Require meaningful confidence floor to avoid hallucinating on unrelated generic prompts
      if (compositeScore >= 3.0) {
        results.push({ item, score: compositeScore, matchType: "HYBRID" });
      }
    }

    return results.sort((a, b) => b.score - a.score);
  }
}

/**
 * Deterministic Intent Grounding Engine
 * Translates ambiguous natural language requests into verified Zod payloads.
 * Features:
 *  - Exact-match priority
 *  - Ambiguity Abstention (Drops to Tier 0 when 2+ candidate SKUs conflict)
 *  - Zero-LLM Math: Derives budgets strictly from retrieved rules & mandate caps
 *  - Strict Zod validation
 */
export class IntentGroundingEngine {
  /**
   * Ground a vague user prompt against any provided high-trust knowledge base.
   */
  public static ground(params: {
    userPrompt: string;
    knowledgeBase: HighTrustKnowledgeBase;
    mandateAllowanceCapUSD: number;
    defaultUnits?: number;
  }): IntentGroundingResult {
    const { userPrompt, knowledgeBase, mandateAllowanceCapUSD, defaultUnits = 50 } = params;

    if (!userPrompt || !userPrompt.trim()) {
      return IntentGroundingResultSchema.parse({
        status: "UNRESOLVED",
        targetTier: 0,
        draft: null,
        candidateSkus: [],
        abstainReason: "User prompt is empty.",
      });
    }

    // 1. Execute Retrieval with Exact-Match Priority
    const searchResults = knowledgeBase.search(userPrompt);

    if (searchResults.length === 0) {
      return IntentGroundingResultSchema.parse({
        status: "UNRESOLVED",
        targetTier: 0,
        draft: null,
        candidateSkus: [],
        abstainReason: "No matching SKU or policy found in knowledge base for query.",
      });
    }

    // 2. Exact-Match Priority Disambiguation
    // Phase 2a: Verbatim SKU matches take absolute precedence over alias matches
    const verbatimSkuMatches = searchResults.filter((r) => r.matchType === "EXACT_SKU");
    const uniqueVerbatimSkus = Array.from(
      new Set(verbatimSkuMatches.map((m) => m.item.sku).filter((s): s is string => Boolean(s)))
    );

    if (uniqueVerbatimSkus.length > 1) {
      return IntentGroundingResultSchema.parse({
        status: "AMBIGUOUS_ABSTAIN",
        targetTier: 0,
        draft: null,
        candidateSkus: uniqueVerbatimSkus,
        merchantPrompt: `Your request mentions multiple distinct SKUs: [${uniqueVerbatimSkus.join(", ")}]. Please submit separate requests for each item.`,
        abstainReason: `Multiple conflicting verbatim SKUs in prompt (${uniqueVerbatimSkus.join(", ")}).`,
      });
    }

    let winningItem: KnowledgeItem | null = null;

    if (uniqueVerbatimSkus.length === 1) {
      winningItem = verbatimSkuMatches.find((m) => m.item.sku === uniqueVerbatimSkus[0])!.item;
    } else {
      // Phase 2b: Check exact alias matches
      const exactAliasMatches = searchResults.filter((r) => r.matchType === "EXACT_ALIAS");
      const uniqueAliasSkus = Array.from(
        new Set(exactAliasMatches.map((m) => m.item.sku).filter((s): s is string => Boolean(s)))
      );

      if (uniqueAliasSkus.length > 1) {
        return IntentGroundingResultSchema.parse({
          status: "AMBIGUOUS_ABSTAIN",
          targetTier: 0,
          draft: null,
          candidateSkus: uniqueAliasSkus,
          merchantPrompt: `Your request matches multiple items: [${uniqueAliasSkus.join(", ")}]. Please specify which SKU you intended.`,
          abstainReason: `Exact alias ambiguity: prompt matched multiple distinct SKUs (${uniqueAliasSkus.join(", ")}).`,
        });
      }

      if (uniqueAliasSkus.length === 1) {
        winningItem = exactAliasMatches.find((m) => m.item.sku === uniqueAliasSkus[0])!.item;
      } else {
        // Phase 2c: Ambiguity Check for Hybrid/Semantic Retrieval
        // Filter close contenders scoring within 80% of top score
        const topScore = searchResults[0].score;
        const closeContenders = searchResults.filter((r) => r.score >= topScore * 0.80);
        const candidateSkus = Array.from(
          new Set(closeContenders.map((r) => r.item.sku).filter((s): s is string => Boolean(s)))
        );

        if (candidateSkus.length > 1) {
          return IntentGroundingResultSchema.parse({
            status: "AMBIGUOUS_ABSTAIN",
            targetTier: 0,
            draft: null,
            candidateSkus,
            merchantPrompt: `Your request could refer to: [${candidateSkus.join(", ")}]. Which item would you like to reorder?`,
            abstainReason: `Semantic ambiguity: multiple close candidate SKUs found (${candidateSkus.join(", ")}). Dropping to Tier 0 (Suggest Mode).`,
          });
        }

        if (candidateSkus.length === 1) {
          winningItem = closeContenders.find((r) => r.item.sku === candidateSkus[0])!.item;
        }
      }
    }

    if (!winningItem || !winningItem.sku) {
      return IntentGroundingResultSchema.parse({
        status: "UNRESOLVED",
        targetTier: 0,
        draft: null,
        candidateSkus: [],
        abstainReason: "Could not resolve a specific product SKU from query.",
      });
    }

    // 4. Extract Target Units (Pure Code, Domain-Agnostic)
    const targetUnits = extractQuantity(userPrompt, winningItem.defaultOrderUnits || defaultUnits);

    // 5. Determine Intent Mode (Pure Code, Domain-Agnostic)
    const intentMode = extractIntentMode(userPrompt);

    // 6. Zero-LLM Math: Derive Budget Strictly from Rules & Dynamic Allowance Threshold
    // Never allow an LLM to guess.
    let ruleDerivedBudgetUSD = mandateAllowanceCapUSD;
    if (winningItem.maxBudgetUSD && winningItem.maxBudgetUSD > 0) {
      ruleDerivedBudgetUSD = Math.min(winningItem.maxBudgetUSD, mandateAllowanceCapUSD);
    }

    // 7. Extract Applicable Retrieved Rules
    const retrievedRulesApplied: string[] = [winningItem.text];
    for (const res of searchResults) {
      if (res.item.id !== winningItem.id && res.item.text && !retrievedRulesApplied.includes(res.item.text)) {
        retrievedRulesApplied.push(res.item.text);
      }
    }

    // 8. Pure Code Populates Zod Schema & Validates
    const draftPayload: ProposedIntentDraft = ProposedIntentDraftSchema.parse({
      sku: winningItem.sku,
      targetUnits,
      maxBudgetUSD: Number(ruleDerivedBudgetUSD.toFixed(2)),
      preferredSupplierId: winningItem.preferredSupplierId,
      intentMode,
      retrievedRulesApplied,
    });

    return IntentGroundingResultSchema.parse({
      status: "GROUNDED",
      targetTier: 1,
      draft: draftPayload,
      candidateSkus: [winningItem.sku],
      merchantPrompt: undefined,
      abstainReason: undefined,
    });
  }
}

/**
 * Helper: Domain-agnostic integer quantity extractor.
 */
function extractQuantity(prompt: string, fallbackUnits: number): number {
  // Pattern 1: e.g. "50 units", "100 pcs", "25 boxes", "10 items", "12 ct"
  const quantityPattern = /\b(\d+)\s*(?:units?|pcs?|items?|tins?|boxes?|packs?|cases?|cartons?|bottles?|pairs?|bags?|rolls?|ct|kits?)?\b/i;
  
  // Pattern 2: e.g. "reorder 60", "buy 15", "order 200"
  const verbPattern = /\b(?:reorder|order|restock|buy|replenish|need|purchase)\s+(\d+)\b/i;
  
  const verbMatch = prompt.match(verbPattern);
  if (verbMatch) {
    const val = parseInt(verbMatch[1], 10);
    if (val > 0) return val;
  }

  const qMatch = prompt.match(quantityPattern);
  if (qMatch) {
    const val = parseInt(qMatch[1], 10);
    if (val > 0) return val;
  }

  return fallbackUnits;
}

/**
 * Helper: Domain-agnostic intent mode classifier.
 */
function extractIntentMode(prompt: string): IntentMode {
  const p = prompt.toLowerCase();
  
  // Urgent signals
  if (
    p.includes("urgent") ||
    p.includes("asap") ||
    p.includes("immediately") ||
    p.includes("critical") ||
    p.includes("running out") ||
    p.includes("emergency") ||
    p.includes("low stock") ||
    p.includes("out of stock") ||
    p.includes("right away") ||
    p.includes("right now") ||
    p.includes("rush") ||
    /\bsurges?\b/.test(p) ||
    /\bsurging\b/.test(p)
  ) {
    return "URGENT_RESTOCK";
  }

  // Price discovery signals
  if (
    p.includes("best deal") ||
    p.includes("lowest price") ||
    p.includes("cheapest") ||
    p.includes("scout") ||
    p.includes("compare") ||
    p.includes("discount") ||
    p.includes("explore options")
  ) {
    return "PRICE_DISCOVERY";
  }

  // Default: Conservative restock
  return "CONSERVATIVE_RESTOCK";
}

/**
 * Helper: Tokenize into alphanumeric word tokens.
 */
function tokenizeWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 0);
}

/**
 * Helper: Subword character 3-gram cosine similarity (works for ANY language/domain).
 */
function computeNgramCosine(s1: string, s2: string): number {
  const ngrams1 = getNgrams(s1, 3);
  const ngrams2 = getNgrams(s2, 3);

  if (ngrams1.size === 0 || ngrams2.size === 0) return 0;

  let intersection = 0;
  for (const [gram, count1] of ngrams1.entries()) {
    const count2 = ngrams2.get(gram) || 0;
    intersection += Math.min(count1, count2);
  }

  const norm1 = Math.sqrt(Array.from(ngrams1.values()).reduce((sum, v) => sum + v * v, 0));
  const norm2 = Math.sqrt(Array.from(ngrams2.values()).reduce((sum, v) => sum + v * v, 0));

  return intersection / (norm1 * norm2);
}

function getNgrams(str: string, n: number): Map<string, number> {
  const map = new Map<string, number>();
  const clean = str.replace(/\s+/g, " ").trim();
  if (clean.length < n) {
    map.set(clean, 1);
    return map;
  }
  for (let i = 0; i <= clean.length - n; i++) {
    const gram = clean.slice(i, i + n);
    map.set(gram, (map.get(gram) || 0) + 1);
  }
  return map;
}
