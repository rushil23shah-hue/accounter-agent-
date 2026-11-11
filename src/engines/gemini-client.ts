// Ensure .env is loaded if running in Node with native loadEnvFile
try {
  if (typeof (process as any).loadEnvFile === "function") {
    (process as any).loadEnvFile();
  }
} catch {
  // Silent if .env is missing or already loaded
}

export interface GeminiCommerceResult {
  productName: string;
  brand: string;
  category: string;
  quantity: string;
  unitsCount: number;
  estimatedPriceINR: number;
  estimatedPriceUSD: number;
  fastestPlatform: string;
  etaMinutes: number;
  arbitrageSavingsINR: number;
  crossWebComparisonSummary: string;
  aiRationale: string;
  keyUsedIndex?: number;
  totalKeysInPool?: number;
}

export class GeminiClient {
  private static keyPool: string[] = [];
  private static currentKeyIndex = 0;

  /**
   * Initializes or refreshes the key pool from environment variables.
   * Supports GEMINI_API_KEYS (comma-separated pool) and GEMINI_API_KEY.
   */
  public static getKeyPool(overrideKey?: string): string[] {
    const pool: string[] = [];

    if (overrideKey && overrideKey.trim()) {
      pool.push(overrideKey.trim());
    }

    const envKeys = process.env.GEMINI_API_KEYS;
    if (envKeys) {
      const split = envKeys.split(",").map((k) => k.trim()).filter(Boolean);
      for (const k of split) {
        if (!pool.includes(k)) pool.push(k);
      }
    }

    const singleKey = process.env.GEMINI_API_KEY?.trim();
    if (singleKey && !pool.includes(singleKey)) {
      pool.push(singleKey);
    }

    return pool;
  }

  public static isConfigured(overrideKey?: string): boolean {
    return this.getKeyPool(overrideKey).length > 0;
  }

  /**
   * Universal Natural Language Commerce Parser with Round-Robin Cycling & Automatic Failover.
   * Seamlessly tries the next key in the pool if one hits rate limits or spikes.
   */
  public static async parseCommerceIntent(
    prompt: string,
    overrideKey?: string
  ): Promise<GeminiCommerceResult | null> {
    const keys = this.getKeyPool(overrideKey);
    if (keys.length === 0) {
      return null;
    }

    const maxAttempts = keys.length;
    const startIndex = this.currentKeyIndex % keys.length;

    // Advance round-robin pointer for next turn
    this.currentKeyIndex = (this.currentKeyIndex + 1) % keys.length;

    const systemInstruction = `
You are the autonomous purchasing engine for Steward 2.0. 
Analyze the following natural language user buying request across Indian and global retail/quick-commerce.
Extract the exact product, appropriate commercial brand, realistic unit price in INR and USD (assume 1 USD = 86.5 INR), fastest delivery service (Blinkit, Zepto, BigBasket, Amazon, Flipkart), estimated delivery time, and competitive price comparison.

Respond ONLY in valid, pure JSON with no markdown wrapping:
{
  "productName": "Commercial product name (e.g. Everest Tikhalal Red Chilli Powder 1kg)",
  "brand": "Brand name (e.g. Everest, MDH, Logitech, Daawat)",
  "category": "grocery | electronics | personal_care | apparel | household | general",
  "quantity": "e.g. 1 kg, 500g, 2 units",
  "unitsCount": 1,
  "estimatedPriceINR": 380,
  "estimatedPriceUSD": 4.39,
  "fastestPlatform": "Blinkit",
  "etaMinutes": 14,
  "arbitrageSavingsINR": 45,
  "crossWebComparisonSummary": "Blinkit (₹380, 14m) vs Zepto (₹395) vs BigBasket (₹405) vs Amazon (₹425). Sourced via Blinkit.",
  "aiRationale": "GAAP-compliant rationale for autonomous procurement"
}
`;

    const requestBody = {
      contents: [
        {
          parts: [
            { text: systemInstruction },
            { text: `User Prompt: "${prompt}"` },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json",
      },
    };

    // Try keys with automatic failover
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const keyIndex = (startIndex + attempt) % keys.length;
      const key = keys[keyIndex];

      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${key}`;
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        });

        if (response.ok) {
          const json = await response.json();
          const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) {
            const parsed = JSON.parse(rawText) as GeminiCommerceResult;
            parsed.keyUsedIndex = keyIndex + 1;
            parsed.totalKeysInPool = keys.length;
            console.log(
              `[Gemini Key Pool] ✓ Successfully processed prompt using Key #${keyIndex + 1} of ${keys.length} (${key.slice(0, 10)}...)`
            );
            return parsed;
          }
        } else {
          const errText = await response.text();
          console.warn(
            `[Gemini Key Pool] ⚠️ Key #${keyIndex + 1} returned status ${response.status}. Automatically failing over to next key... Details: ${errText.slice(0, 100)}`
          );
        }
      } catch (err: any) {
        console.warn(
          `[Gemini Key Pool] ⚠️ Key #${keyIndex + 1} connection error (${err.message}). Failing over to next key...`
        );
      }
    }

    console.error("[Gemini Key Pool] All API keys in pool exhausted or unavailable, using deterministic fallback.");
    return null;
  }
}
