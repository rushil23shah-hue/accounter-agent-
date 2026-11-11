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
}

export class GeminiClient {
  public static getApiKey(overrideKey?: string): string | undefined {
    return overrideKey || process.env.GEMINI_API_KEY || undefined;
  }

  public static isConfigured(overrideKey?: string): boolean {
    return Boolean(this.getApiKey(overrideKey));
  }

  /**
   * Universal Natural Language Commerce Parser powered by Gemini 1.5 Flash.
   */
  public static async parseCommerceIntent(prompt: string, overrideKey?: string): Promise<GeminiCommerceResult | null> {
    const apiKey = this.getApiKey(overrideKey);
    if (!apiKey) {
      return null;
    }

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
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
              { text: `User Prompt: "${prompt}"` }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json"
        }
      };

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Gemini API Error:", response.status, errorText);
        return null;
      }

      const json = await response.json();
      const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) return null;

      const parsed = JSON.parse(rawText) as GeminiCommerceResult;
      return parsed;
    } catch (err) {
      console.error("Gemini parsing failed, using high-trust fallback:", err);
      return null;
    }
  }
}
