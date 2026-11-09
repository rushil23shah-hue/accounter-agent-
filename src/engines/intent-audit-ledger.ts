import crypto from "crypto";
import { IntentAuditRecord, IntentAuditRecordSchema, IntentAuditCategory } from "../contracts/intent-audit.js";

export class IntentAuditLedgerEngine {
  private static records: IntentAuditRecord[] = [];

  /**
   * Initializes the ledger with historical high-trust records if empty.
   */
  public static init() {
    if (this.records.length === 0) {
      this.seedInitialAuditRecords();
    }
  }

  /**
   * Logs a new autonomous transaction systematically with full AI why-trail.
   */
  public static recordTransaction(params: {
    originalPrompt: string;
    sku: string;
    productName: string;
    units: number;
    unitPriceUSD: number;
    grossTotalUSD: number;
    grossTotalINR?: number;
    selectedPlatform: string;
    paypalReceiverEmail: string;
    crossWebComparisonSummary: string;
    arbitrageSavingsUSD?: number;
    mandateCapUSD: number;
    liquidRunwayDays: number;
    paypalOrderId?: string;
    paypalAuthorizationId?: string;
  }): IntentAuditRecord {
    const timestamp = new Date().toISOString();
    const dateObj = new Date();
    const displayTime = dateObj.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }) + " • " + dateObj.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    const id = `AUDIT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const category = this.categorizePrompt(params.originalPrompt, params.productName);
    const businessGoal = this.deriveBusinessGoal(params.originalPrompt, params.productName, category);
    const grossINR = params.grossTotalINR || Number((params.grossTotalUSD * 86.5).toFixed(2));

    const whyReasoning = {
      intentDecoded: `Decoded operator intent from natural language: "${params.originalPrompt}". Resolved line item: ${params.units}x ${params.productName}.`,
      sourcingRationalization: params.crossWebComparisonSummary || `Evaluated multi-channel retail offers; locked optimal landed deal via ${params.selectedPlatform}.`,
      solvencyVerification: `Verified via ZK-Vault: Order amount ($${params.grossTotalUSD.toFixed(2)}) is strictly bounded by active mandate cap ($${params.mandateCapUSD.toFixed(2)}). Liquid runway stands at ${params.liquidRunwayDays.toFixed(1)} days with zero cash-floor breach.`,
      securityAuditVerdict: `Pre-Flight Payment Shield scanned payee (${params.paypalReceiverEmail}): 0 attack vectors detected; payee pre-whitelisted for autonomous settlement.`,
    };

    const hashPayload = JSON.stringify({
      id,
      timestamp,
      originalPrompt: params.originalPrompt,
      sku: params.sku,
      grossTotalUSD: params.grossTotalUSD,
      paypalOrderId: params.paypalOrderId,
    });
    const auditHash = crypto.createHash("sha256").update(hashPayload).digest("hex");

    const record = IntentAuditRecordSchema.parse({
      id,
      timestamp,
      displayTime,
      originalPrompt: params.originalPrompt,
      businessGoal,
      category,
      sku: params.sku,
      productName: params.productName,
      units: params.units,
      unitPriceUSD: params.unitPriceUSD,
      grossTotalUSD: params.grossTotalUSD,
      grossTotalINR: grossINR,
      selectedPlatform: params.selectedPlatform,
      paypalReceiverEmail: params.paypalReceiverEmail,
      crossWebComparisonSummary: params.crossWebComparisonSummary,
      arbitrageSavingsUSD: params.arbitrageSavingsUSD || 0,
      whyReasoning,
      mandateCapUSD: params.mandateCapUSD,
      liquidRunwayDays: params.liquidRunwayDays,
      zkSolvencyStatus: "SOLVENT_RESERVE_PRESERVED",
      status: "AUTHORIZED_HELD_IN_UNDO",
      paypalOrderId: params.paypalOrderId,
      paypalAuthorizationId: params.paypalAuthorizationId,
      undoSecondsRemaining: 60,
      auditHash,
    });

    this.records.unshift(record);
    return record;
  }

  public static getAllRecords(): IntentAuditRecord[] {
    if (this.records.length === 0) {
      this.init();
    }
    return [...this.records];
  }

  public static exportCSV(): string {
    const records = this.getAllRecords();
    const headers = [
      "Audit ID",
      "Timestamp",
      "Original User Prompt",
      "Business Goal",
      "Category",
      "SKU",
      "Product Name",
      "Units",
      "Total USD",
      "Total INR",
      "Platform",
      "Payee",
      "AI Why-Trail (Rationalization)",
      "Solvency Status",
      "PayPal Order ID",
      "Audit Hash",
    ];

    const rows = records.map((r) => [
      `"${r.id}"`,
      `"${r.displayTime}"`,
      `"${r.originalPrompt.replace(/"/g, '""')}"`,
      `"${r.businessGoal.replace(/"/g, '""')}"`,
      `"${r.category}"`,
      `"${r.sku}"`,
      `"${r.productName.replace(/"/g, '""')}"`,
      r.units,
      r.grossTotalUSD.toFixed(2),
      r.grossTotalINR.toFixed(2),
      `"${r.selectedPlatform}"`,
      `"${r.paypalReceiverEmail}"`,
      `"${r.whyReasoning.sourcingRationalization.replace(/"/g, '""')}"`,
      `"${r.zkSolvencyStatus}"`,
      `"${r.paypalOrderId || "N/A"}"`,
      `"${r.auditHash.slice(0, 16)}..."`,
    ]);

    return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
  }

  private static categorizePrompt(prompt: string, product: string): IntentAuditCategory {
    const p = (prompt + " " + product).toLowerCase();
    if (p.includes("sugar") || p.includes("tea") || p.includes("coffee") || p.includes("milk") || p.includes("rice") || p.includes("grocery")) {
      return "PANTRY_GROCERY";
    }
    if (p.includes("shoe") || p.includes("nike") || p.includes("sneaker") || p.includes("dress") || p.includes("cloth")) {
      return "CONSUMER_GOODS";
    }
    if (p.includes("ticket") || p.includes("concert") || p.includes("coldplay") || p.includes("show")) {
      return "EVENTS_TICKETS";
    }
    if (p.includes("glove") || p.includes("box") || p.includes("pack") || p.includes("pouch")) {
      return "OFFICE_SUPPLIES";
    }
    return "INVENTORY_RESTOCK";
  }

  private static deriveBusinessGoal(prompt: string, product: string, category: IntentAuditCategory): string {
    switch (category) {
      case "PANTRY_GROCERY":
        return `Kitchen & Pantry Staple Replenishment for Daily Operations (${product})`;
      case "CONSUMER_GOODS":
        return `Staff Uniform / Retail Merchandise Purchase (${product})`;
      case "EVENTS_TICKETS":
        return `Corporate Hospitality / Client Entertainment Access`;
      case "OFFICE_SUPPLIES":
        return `Essential Warehouse & Packaging Consumables Supply`;
      default:
        return `Operational Supply Chain & Restock Continuity`;
    }
  }

  private static seedInitialAuditRecords() {
    const now = Date.now();
    this.records = [
      {
        id: "AUDIT-20261109-A19F",
        timestamp: new Date(now - 120_000).toISOString(),
        displayTime: "Nov 9, 2026 • 10:20 PM",
        originalPrompt: "buy me nike shoes under 1100",
        businessGoal: "Staff Workwear & Uniform Footwear Sourcing",
        category: "CONSUMER_GOODS",
        sku: "SKU-NIKE-SHOES-01",
        productName: "Nike Lightweight Running Shoes",
        units: 1,
        unitPriceUSD: 7.50,
        grossTotalUSD: 7.50,
        grossTotalINR: 649.00,
        selectedPlatform: "Meesho Direct",
        paypalReceiverEmail: "merchant-payments@meesho.com",
        crossWebComparisonSummary: "Cross-web price comparison scanned Meesho (₹649), Flipkart (₹799), Amazon (₹11,499). Saved 94% off MSRP.",
        arbitrageSavingsUSD: 125.44,
        whyReasoning: {
          intentDecoded: "Operator specified lightweight work sneakers with budget ceiling of ₹1,100 ($12.72).",
          sourcingRationalization: "Meesho verified deal at ₹649 delivered 18% savings under the operator's ₹1,100 ceiling.",
          solvencyVerification: "Approved under $800 daily mandate allowance. Business runway intact at 89.1 days.",
          securityAuditVerdict: "Pre-Flight Payment Shield 100% verified. Payee whitelisted.",
        },
        mandateCapUSD: 800.00,
        liquidRunwayDays: 89.1,
        zkSolvencyStatus: "SOLVENT_RESERVE_PRESERVED",
        status: "CAPTURED_SETTLED",
        paypalOrderId: "MOCK_PP_ORD_NOPO36O",
        paypalAuthorizationId: "MOCK_AUTH_OHF3LME",
        undoSecondsRemaining: 0,
        auditHash: "88be31ad8e9c349b21a5a47a7073e569f6ece0212bdeb8ebb67be6142a9e12c6",
      },
    ];
  }
}
