import crypto from "crypto";

export interface SemanticMemoryItem {
  id: string;
  topic: string; // e.g. "WHOLESALE_SUGAR_PURCHASE"
  content: string;
  metadata: {
    sku?: string;
    vendor?: string;
    unitPriceUSD?: number;
    units?: number;
    season?: string;
    riskScore?: number;
    timestamp: string;
  };
  sparseVector: Record<string, number>;
}

export class SemanticVectorMemoryEngine {
  private static memoryStore: SemanticMemoryItem[] = [];

  /**
   * Initializes long-term memory with baseline corporate history.
   */
  public static init() {
    if (this.memoryStore.length === 0) {
      this.seedBaselineMemories();
    }
  }

  /**
   * Stores a new memory item and generates its semantic sparse vector.
   */
  public static storeMemory(params: {
    topic: string;
    content: string;
    metadata: {
      sku?: string;
      vendor?: string;
      unitPriceUSD?: number;
      units?: number;
      season?: string;
      riskScore?: number;
    };
  }): SemanticMemoryItem {
    const timestamp = new Date().toISOString();
    const id = `MEM-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    const textToVectorize = `${params.topic} ${params.content} ${params.metadata.sku || ""} ${params.metadata.vendor || ""}`.toLowerCase();
    const sparseVector = this.extractTermFrequency(textToVectorize);

    const item: SemanticMemoryItem = {
      id,
      topic: params.topic,
      content: params.content,
      metadata: {
        ...params.metadata,
        timestamp,
      },
      sparseVector,
    };

    this.memoryStore.push(item);
    return item;
  }

  /**
   * Performs semantic cosine search across long-term business memories.
   */
  public static searchMemories(query: string, limit = 3): { item: SemanticMemoryItem; score: number }[] {
    if (this.memoryStore.length === 0) {
      this.init();
    }

    const queryVec = this.extractTermFrequency(query.toLowerCase());
    const scored = this.memoryStore.map((item) => {
      const score = this.cosineSimilarity(queryVec, item.sparseVector);
      return { item, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit);
  }

  public static getAllMemories(): SemanticMemoryItem[] {
    if (this.memoryStore.length === 0) {
      this.init();
    }
    return [...this.memoryStore];
  }

  // ── Vectorization & Mathematics ──────────────────────────────────────────

  private static extractTermFrequency(text: string): Record<string, number> {
    const tokens = text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 2);

    const freq: Record<string, number> = {};
    for (const t of tokens) {
      freq[t] = (freq[t] || 0) + 1;
    }
    return freq;
  }

  private static cosineSimilarity(vecA: Record<string, number>, vecB: Record<string, number>): number {
    let dot = 0;
    let magA = 0;
    let magB = 0;

    for (const [term, countA] of Object.entries(vecA)) {
      magA += countA * countA;
      if (vecB[term]) {
        dot += countA * vecB[term];
      }
    }

    for (const countB of Object.values(vecB)) {
      magB += countB * countB;
    }

    const denom = Math.sqrt(magA) * Math.sqrt(magB);
    return denom > 0 ? dot / denom : 0;
  }

  private static seedBaselineMemories() {
    this.storeMemory({
      topic: "HISTORICAL_TEA_RESTOCK",
      content: "Organic Earl Grey Reserve bought regularly from Assam Highlands Estate Direct. Target unit cost is $7.22. Average delivery lead time is 5 days.",
      metadata: {
        sku: "TEA-EG-001",
        vendor: "Assam Highlands Estate Direct",
        unitPriceUSD: 7.22,
        units: 180,
        season: "Fall",
        riskScore: 0,
      },
    });

    this.storeMemory({
      topic: "HISTORICAL_SUGAR_ARBITRAGE",
      content: "Pantry sugar replenishment best sourced via BigBasket Quick Commerce at ₹48 ($0.55 USD/kg). Blinkit charges ₹50/kg. Zepto has fastest delivery.",
      metadata: {
        sku: "SKU-SUGAR-01",
        vendor: "BigBasket Quick",
        unitPriceUSD: 0.55,
        units: 1,
        season: "Year-Round",
        riskScore: 0,
      },
    });

    this.storeMemory({
      topic: "PREVIOUS_ATTACK_PATTERN",
      content: "Supplier 'global-distro@domain.com' attempted to inject Cyrillic homoglyph override into invoice memo. Blacklisted in security ledger.",
      metadata: {
        vendor: "global-distro@domain.com",
        riskScore: 100,
        season: "Q3",
      },
    });
  }
}
