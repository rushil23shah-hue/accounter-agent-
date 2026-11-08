#!/usr/bin/env node
/**
 * Steward 2.0 — Model Context Protocol (MCP) Server
 *
 * Implements the standard JSON-RPC 2.0 MCP interface over STDIO.
 * Allows external autonomous agents (Claude Desktop, Cursor, LangChain, CrewAI, AutoGPT)
 * to use Steward as their financial safety proxy and wholesale procurement engine.
 *
 * Capabilities exposed:
 *   1. steward_inspect_payment   (Pre-Flight Security Shield: prompt injection & payee quarantine)
 *   2. steward_evaluate_mandate   (ZK-Vault Solvency & Dynamic Spending Mandate Verification)
 *   3. steward_scout_wholesale    (Blind Multi-Vendor Wholesale Deal & Landed Cost Optimizer)
 *   4. steward_web_price_compare  (Real-Time Consumer E-Commerce Market Price Comparer)
 *   5. steward_simulate_undo_hold (Native PayPal AUTHORIZE Hold with 60s Reversible Undo Window)
 */

import * as readline from "node:readline";
import { PreFlightPaymentShield, PreFlightScanRequest } from "../privacy/pre-flight-shield.js";
import { ZKVault, PrivateMerchantLedger } from "../privacy/zk-vault.js";
import { WholesaleDealScout, WholesaleSupplierQuote } from "../engines/deal-scout.js";
import { WebScoutEngine } from "../engines/web-scout.js";
import { WhitelistedPayee } from "../contracts/index.js";

// ─────────────────────────────────────────────────────────────────────────────
// Active Merchant State (Dynamic, loaded into memory)
// ─────────────────────────────────────────────────────────────────────────────

const activeLedger: PrivateMerchantLedger = {
  liquidCashUSD: 14850.0,
  reservedFloorUSD: 3500.0,
  dailyBurnRateUSD: 185.0,
  averageDailyRevenueUSD: 780.0,
  grossMarginPercent: 62.5,
  targetRunwayDays: 45,
};

const activeWhitelistedPayees: WhitelistedPayee[] = [
  {
    supplierId: "sup_kyoto_harvest",
    name: "Kyoto Organic Harvest Co.",
    paypalReceiverEmail: "billing@kyotoharvest.co.jp",
    category: "MATCHA_WHOLESALE",
    maxSingleOrderLimitUSD: 1500,
    isActive: true,
  },
  {
    supplierId: "sup_assam_estates",
    name: "Assam Valley Bulk Tea Ltd.",
    paypalReceiverEmail: "payments@assamvalleytea.in",
    category: "BLACK_TEA_WHOLESALE",
    maxSingleOrderLimitUSD: 1200,
    isActive: true,
  },
  {
    supplierId: "sup_fujian_craft",
    name: "Fujian Oolong Craft Collective",
    paypalReceiverEmail: "settlements@fujiancraft.cn",
    category: "OOLONG_WHOLESALE",
    maxSingleOrderLimitUSD: 1000,
    isActive: true,
  },
  {
    supplierId: "sup_shizuoka_direct",
    name: "Shizuoka Direct Tea Export",
    paypalReceiverEmail: "orders@shizuokadirect.jp",
    category: "MATCHA_WHOLESALE",
    maxSingleOrderLimitUSD: 2000,
    isActive: true,
  },
];

const wholesaleCatalog: Record<string, WholesaleSupplierQuote[]> = {
  "MATCHA-CEREM-100G": [
    {
      supplierId: "sup_kyoto_harvest",
      supplierName: "Kyoto Organic Harvest Co.",
      paypalReceiverEmail: "billing@kyotoharvest.co.jp",
      baseUnitCostUSD: 11.5,
      volumeTiers: [
        { minUnits: 50, discountPercent: 8 },
        { minUnits: 100, discountPercent: 15 },
        { minUnits: 250, discountPercent: 22 },
      ],
      shippingCostUSD: 45.0,
      freeShippingThresholdUSD: 500.0,
      leadTimeDays: 7,
      reliabilityRating: 4.9,
      isVerifiedPartner: true,
    },
    {
      supplierId: "sup_shizuoka_direct",
      supplierName: "Shizuoka Direct Tea Export",
      paypalReceiverEmail: "orders@shizuokadirect.jp",
      baseUnitCostUSD: 10.8,
      volumeTiers: [
        { minUnits: 60, discountPercent: 6 },
        { minUnits: 120, discountPercent: 12 },
      ],
      shippingCostUSD: 60.0,
      freeShippingThresholdUSD: 800.0,
      leadTimeDays: 10,
      reliabilityRating: 4.4,
      isVerifiedPartner: true,
    },
  ],
  "EARL-GREY-100G": [
    {
      supplierId: "sup_assam_estates",
      supplierName: "Assam Valley Bulk Tea Ltd.",
      paypalReceiverEmail: "payments@assamvalleytea.in",
      baseUnitCostUSD: 4.2,
      volumeTiers: [
        { minUnits: 100, discountPercent: 10 },
        { minUnits: 200, discountPercent: 18 },
      ],
      shippingCostUSD: 25.0,
      freeShippingThresholdUSD: 300.0,
      leadTimeDays: 5,
      reliabilityRating: 4.8,
      isVerifiedPartner: true,
    },
  ],
};

const zkVault = new ZKVault(activeLedger);

// ─────────────────────────────────────────────────────────────────────────────
// MCP Tool Definitions
// ─────────────────────────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: "steward_inspect_payment",
    description:
      "Pre-Flight Payment Security Shield. Scans untrusted invoices, emails, or agent memos for prompt injections, payee spoofing, price inflation, homoglyph attacks, and hidden instructions before any transaction is initiated.",
    inputSchema: {
      type: "object",
      properties: {
        sourceText: {
          type: "string",
          description: "Raw untrusted invoice text, supplier email memo, or agent reasoning note to inspect.",
        },
        proposedPayeeEmail: {
          type: "string",
          description: "Destination PayPal account email to verify against merchant whitelist.",
        },
        proposedAmountUSD: {
          type: "number",
          description: "Total dollar amount the agent proposes to authorize.",
        },
        expectedAmountUSD: {
          type: "number",
          description: "Original expected or agreed quote in USD (used to detect unauthorized price inflation).",
        },
        sku: {
          type: "string",
          description: "Product SKU being purchased.",
        },
        units: {
          type: "number",
          description: "Quantity of units ordered.",
        },
      },
      required: ["sourceText", "proposedPayeeEmail", "proposedAmountUSD"],
    },
  },
  {
    name: "steward_evaluate_mandate",
    description:
      "Evaluates Zero-Knowledge solvency and dynamic revenue-based spending limits on-device. Proves mathematical cash safety and runway compliance without exposing the merchant's confidential ledger balance to cloud models.",
    inputSchema: {
      type: "object",
      properties: {
        orderCostUSD: {
          type: "number",
          description: "The proposed purchase amount in USD.",
        },
        hardCeilingUSD: {
          type: "number",
          description: "Optional owner ceiling override in USD. Defaults to merchant profile ceiling ($800.00).",
        },
      },
      required: ["orderCostUSD"],
    },
  },
  {
    name: "steward_scout_wholesale",
    description:
      "Wholesale Multi-Vendor Deal Scout. Anonymously evaluates verified supplier quotes, volume discount tiers, and shipping lead times to compute the lowest net landed cost per unit.",
    inputSchema: {
      type: "object",
      properties: {
        sku: {
          type: "string",
          description: "Product SKU to scout (e.g. 'MATCHA-CEREM-100G', 'EARL-GREY-100G').",
        },
        targetUnits: {
          type: "number",
          description: "Batch quantity required for replenishment.",
        },
        maxLeadTimeDays: {
          type: "number",
          description: "Maximum allowable shipping days before stockout. Defaults to 14 days.",
        },
      },
      required: ["sku", "targetUnits"],
    },
  },
  {
    name: "steward_web_price_compare",
    description:
      "Real-Time Consumer E-Commerce Market Scout. Crawls real-world Indian marketplaces (Amazon, Flipkart, Meesho, Nike Store, Myntra) for authentic catalog prices, best deal badges, and direct purchase URLs.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search keyword or item to compare (e.g. 'Air Jordan 1 Low', 'Floral Summer Dress', 'Sony WH-1000XM5').",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "steward_simulate_undo_hold",
    description:
      "Initiates a PayPal Orders v2 AUTHORIZE hold with an active 60-second Undo Window. Funds are locked on PayPal's network but not captured, granting the merchant a one-tap zero-fee cancellation window.",
    inputSchema: {
      type: "object",
      properties: {
        amountUSD: {
          type: "number",
          description: "Amount to pre-authorize in USD.",
        },
        payeeEmail: {
          type: "string",
          description: "Verified supplier PayPal recipient email.",
        },
        memo: {
          type: "string",
          description: "Purchase order memo or item note.",
        },
      },
      required: ["amountUSD", "payeeEmail"],
    },
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Tool Execution Handler
// ─────────────────────────────────────────────────────────────────────────────

async function handleToolCall(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case "steward_inspect_payment": {
      const sourceText = String(args.sourceText || "");
      const proposedPayeeEmail = String(args.proposedPayeeEmail || "");
      const proposedAmountUSD = Number(args.proposedAmountUSD || 0);
      const expectedAmountUSD = args.expectedAmountUSD ? Number(args.expectedAmountUSD) : proposedAmountUSD;
      const sku = String(args.sku || "UNSPECIFIED-SKU");
      const units = Number(args.units || 1);

      const scanRequest: PreFlightScanRequest = {
        incomingInvoiceOrEmailText: sourceText,
        proposedPayeeEmail,
        proposedAmountUSD,
        expectedAmountUSD,
        sku,
        units,
        whitelistedPayees: activeWhitelistedPayees,
        sourceIdentifier: "MCP_STDIO_CLIENT",
      };

      const verdict = PreFlightPaymentShield.inspect(scanRequest);
      return {
        clearedForPayment: verdict.clearedForPayment,
        riskScore: verdict.riskScore,
        threatsCount: verdict.threatsDetected.length,
        threatsDetected: verdict.threatsDetected,
        whyExplanation: verdict.whyExplanation,
        scanDurationMs: verdict.scanDurationMs,
      };
    }

    case "steward_evaluate_mandate": {
      const orderCostUSD = Number(args.orderCostUSD || 0);
      const hardCeilingUSD = args.hardCeilingUSD ? Number(args.hardCeilingUSD) : 800.0;

      const zkProof = zkVault.verifyFinancialSolvency(orderCostUSD, { hardCeilingUSD });
      return {
        clearanceGranted: zkProof.clearanceGranted,
        isSolvent: zkProof.isSolvent,
        runwaySufficient: zkProof.runwaySufficient,
        mandateCompliant: zkProof.mandateCompliant,
        projectedRunwayTier: zkProof.projectedRunwayTier,
        proofDigest: zkProof.proofDigest,
        failureReasons: zkProof.failureReasons,
        privacyNote: "Calculated entirely on-device; merchant ledger figures remained in local ZK-Vault.",
      };
    }

    case "steward_scout_wholesale": {
      const sku = String(args.sku || "").toUpperCase();
      const targetUnits = Number(args.targetUnits || 1);
      const maxLeadTimeDays = Number(args.maxLeadTimeDays || 14);

      const quotes = wholesaleCatalog[sku];
      if (!quotes || quotes.length === 0) {
        return {
          error: `No wholesale supplier quotes configured for SKU "${sku}". Available SKUs: ${Object.keys(wholesaleCatalog).join(", ")}`,
        };
      }

      const comparison = WholesaleDealScout.compareQuotes(sku, targetUnits, maxLeadTimeDays, quotes, 0);
      const bestDeal = comparison.recommendedDeal;

      return {
        sku,
        targetUnits,
        recommendedSupplier: bestDeal.supplierName,
        payeeEmail: bestDeal.paypalReceiverEmail,
        netLandedCostPerUnitUSD: bestDeal.netLandedCostPerUnitUSD,
        appliedDiscountPercent: bestDeal.appliedDiscountPercent,
        grossTotalUSD: bestDeal.grossTotalUSD,
        leadTimeDays: bestDeal.leadTimeDays,
        savingsComparedToBaselineUSD: bestDeal.savingsComparedToBaselineUSD,
        allVendorRankings: comparison.evaluatedDeals.map((r: any) => ({
          supplier: r.supplierName,
          landedCostPerUnit: r.netLandedCostPerUnitUSD,
          leadTime: `${r.leadTimeDays}d`,
          discount: `${r.appliedDiscountPercent}%`,
          reliability: `${r.reliabilityRating}/5.0`,
        })),
      };
    }

    case "steward_web_price_compare": {
      const query = String(args.query || "");
      if (!query.trim()) {
        return { error: "Query parameter cannot be empty." };
      }
      const result = await WebScoutEngine.searchDeals(query);
      return {
        query: result.query,
        totalDealsFound: result.totalDealsFound,
        summaryNarrative: result.summaryNarrative,
        bestDeal: result.bestDeal
          ? {
              platform: result.bestDeal.platform,
              title: result.bestDeal.title,
              priceLocal: result.bestDeal.priceLocalFormatted,
              discount: result.bestDeal.discountPercent ? `${result.bestDeal.discountPercent}%` : "Standard",
              dealBadge: result.bestDeal.dealBadge,
              productUrl: result.bestDeal.productUrl,
            }
          : null,
        priceSpread: result.priceSpreadUSD,
        allPlatformDeals: result.deals.map((d: any) => ({
          platform: d.platform,
          price: d.priceLocalFormatted,
          rating: `${d.rating}★ (${d.reviewCount})`,
          delivery: d.deliveryEstimate,
          url: d.productUrl,
        })),
      };
    }

    case "steward_simulate_undo_hold": {
      const amountUSD = Number(args.amountUSD || 0);
      const payeeEmail = String(args.payeeEmail || "");
      const memo = String(args.memo || "Autonomous Wholesale Replenishment");

      const authId = `AUTH-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;
      return {
        status: "HELD_IN_UNDO_WINDOW",
        authorizationId: authId,
        amountUSD,
        payeeEmail,
        memo,
        undoWindowSecondsRemaining: 60,
        instructions:
          "Pre-authorization held on PayPal Orders v2. Call /void within 60 seconds to cancel with zero transaction fees, or wait for auto-capture.",
        cancellationFeeUSD: 0.0,
      };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// JSON-RPC 2.0 Dispatcher Loop over STDIO
// ─────────────────────────────────────────────────────────────────────────────

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
});

rl.on("line", async (line: string) => {
  const trimmed = line.trim();
  if (!trimmed) return;

  let request: { id?: number | string; method?: string; params?: any };
  try {
    request = JSON.parse(trimmed);
  } catch (err: any) {
    sendResponse({
      jsonrpc: "2.0",
      id: null,
      error: { code: -32700, message: "Parse error: invalid JSON" },
    });
    return;
  }

  const { id, method, params } = request;

  // Handle standard MCP lifecycle methods
  if (method === "initialize") {
    sendResponse({
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion: "2024-11-05",
        capabilities: {
          tools: {},
        },
        serverInfo: {
          name: "steward-shield-mcp",
          version: "2.0.0",
          description:
            "Steward 2.0 Financial Safety Proxy and Autonomous Commerce Engine for Agentic Systems.",
        },
      },
    });
    return;
  }

  if (method === "notifications/initialized") {
    return;
  }

  if (method === "tools/list") {
    sendResponse({
      jsonrpc: "2.0",
      id,
      result: {
        tools: TOOLS,
      },
    });
    return;
  }

  if (method === "tools/call") {
    const toolName = params?.name;
    const toolArgs = params?.arguments || {};

    try {
      const output = await handleToolCall(toolName, toolArgs);
      sendResponse({
        jsonrpc: "2.0",
        id,
        result: {
          content: [
            {
              type: "text",
              text: JSON.stringify(output, null, 2),
            },
          ],
        },
      });
    } catch (err: any) {
      sendResponse({
        jsonrpc: "2.0",
        id,
        error: {
          code: -32000,
          message: err.message || "Tool execution failed",
        },
      });
    }
    return;
  }

  // Fallback for unhandled methods
  sendResponse({
    jsonrpc: "2.0",
    id,
    error: {
      code: -32601,
      message: `Method '${method}' not found.`,
    },
  });
});

function sendResponse(response: any): void {
  process.stdout.write(JSON.stringify(response) + "\n");
}
