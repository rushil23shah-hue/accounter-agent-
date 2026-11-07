import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ZKVault,
  PreFlightPaymentShield,
  WholesaleDealScout,
  WholesaleSupplierQuote,
  AdaptiveConsumptionForecaster,
  DynamicMandateEngine,
  EarnedAutonomyEngine,
  RestockingAutopilotOrchestrator,
  InventoryItem,
  OwnerIntentProfile,
  AutonomyState,
} from "../index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Dynamic Wholesale Marketplace Catalog & Multi-Vendor Generator
function generateWholesaleQuotesForQuery(query: string): { quotes: WholesaleSupplierQuote[]; baselineUnitCostUSD: number; sku: string; name: string } {
  const q = query.toLowerCase().trim();

  if (q.includes("pouch") || q.includes("packag") || q.includes("bag") || q.includes("box")) {
    return {
      sku: "PKG-KRAFT-250",
      name: "Eco-Friendly Kraft Stand-Up Pouches 250g",
      baselineUnitCostUSD: 0.65,
      quotes: [
        {
          supplierId: "sup_packaging_eco",
          supplierName: "EcoPack Containers Direct",
          paypalReceiverEmail: "billing@ecopack.com",
          baseUnitCostUSD: 0.42,
          volumeTiers: [
            { minUnits: 100, discountPercent: 10 },
            { minUnits: 250, discountPercent: 20 },
          ],
          shippingCostUSD: 15.0,
          freeShippingThresholdUSD: 100.0,
          leadTimeDays: 4,
          reliabilityRating: 4.9,
          isVerifiedPartner: true,
        },
        {
          supplierId: "sup_local_pack",
          supplierName: "Metro Packaging Express",
          paypalReceiverEmail: "orders@metropack.com",
          baseUnitCostUSD: 0.55,
          volumeTiers: [{ minUnits: 100, discountPercent: 5 }],
          shippingCostUSD: 12.0,
          freeShippingThresholdUSD: 200.0,
          leadTimeDays: 2,
          reliabilityRating: 4.7,
          isVerifiedPartner: true,
        },
        {
          supplierId: "sup_global_plastic",
          supplierName: "Trans-Pacific Poly Exporters",
          paypalReceiverEmail: "bulk@transpacific-poly.com",
          baseUnitCostUSD: 0.28,
          volumeTiers: [{ minUnits: 500, discountPercent: 25 }],
          shippingCostUSD: 45.0,
          freeShippingThresholdUSD: 500.0,
          leadTimeDays: 19,
          reliabilityRating: 4.0,
          isVerifiedPartner: false,
        },
      ],
    };
  }

  if (q.includes("matcha") || q.includes("ceremonial")) {
    return {
      sku: "TEA-MAT-003",
      name: "Ceremonial Grade Uji Matcha 100g",
      baselineUnitCostUSD: 18.0,
      quotes: [
        {
          supplierId: "sup_kyoto_direct",
          supplierName: "Kyoto Direct Harvest Estate",
          paypalReceiverEmail: "export@kyoto-harvest.jp",
          baseUnitCostUSD: 13.5,
          volumeTiers: [
            { minUnits: 20, discountPercent: 8 },
            { minUnits: 50, discountPercent: 18 },
          ],
          shippingCostUSD: 20.0,
          freeShippingThresholdUSD: 250.0,
          leadTimeDays: 5,
          reliabilityRating: 5.0,
          isVerifiedPartner: true,
        },
        {
          supplierId: "sup_pac_tea",
          supplierName: "Pacific Coast Matcha Distro",
          paypalReceiverEmail: "sales@pacificmatcha.com",
          baseUnitCostUSD: 15.8,
          volumeTiers: [{ minUnits: 30, discountPercent: 6 }],
          shippingCostUSD: 10.0,
          freeShippingThresholdUSD: 300.0,
          leadTimeDays: 2,
          reliabilityRating: 4.8,
          isVerifiedPartner: true,
        },
        {
          supplierId: "sup_cargo_tea",
          supplierName: "East Sea Cargo Wholesalers",
          paypalReceiverEmail: "orders@eastseacargo.com",
          baseUnitCostUSD: 10.0,
          volumeTiers: [{ minUnits: 100, discountPercent: 22 }],
          shippingCostUSD: 60.0,
          freeShippingThresholdUSD: 800.0,
          leadTimeDays: 21,
          reliabilityRating: 4.2,
          isVerifiedPartner: false,
        },
      ],
    };
  }

  if (q.includes("coffee") || q.includes("espresso") || q.includes("bean")) {
    return {
      sku: "COF-COL-001",
      name: "Single-Origin Colombian Huila Beans (1kg)",
      baselineUnitCostUSD: 15.0,
      quotes: [
        {
          supplierId: "sup_huila_estate",
          supplierName: "Huila High-Altitude Estate Direct",
          paypalReceiverEmail: "sales@huilacoffee.co",
          baseUnitCostUSD: 11.2,
          volumeTiers: [
            { minUnits: 25, discountPercent: 10 },
            { minUnits: 50, discountPercent: 16 },
          ],
          shippingCostUSD: 20.0,
          freeShippingThresholdUSD: 250.0,
          leadTimeDays: 6,
          reliabilityRating: 4.9,
          isVerifiedPartner: true,
        },
        {
          supplierId: "sup_local_roast",
          supplierName: "City Roasters Wholesale Hub",
          paypalReceiverEmail: "hub@cityroasters.com",
          baseUnitCostUSD: 13.5,
          volumeTiers: [{ minUnits: 20, discountPercent: 5 }],
          shippingCostUSD: 12.0,
          freeShippingThresholdUSD: 200.0,
          leadTimeDays: 2,
          reliabilityRating: 4.7,
          isVerifiedPartner: true,
        },
        {
          supplierId: "sup_south_cargo",
          supplierName: "Global Green Bean Freight",
          paypalReceiverEmail: "freight@greenbeanbulk.com",
          baseUnitCostUSD: 8.5,
          volumeTiers: [{ minUnits: 100, discountPercent: 20 }],
          shippingCostUSD: 70.0,
          freeShippingThresholdUSD: 1000.0,
          leadTimeDays: 22,
          reliabilityRating: 3.9,
          isVerifiedPartner: false,
        },
      ],
    };
  }

  if (q.includes("cup") || q.includes("lid") || q.includes("takeaway")) {
    return {
      sku: "SUP-CUP-12OZ",
      name: "Compostable Double-Wall Hot Cups 12oz (Case of 500)",
      baselineUnitCostUSD: 52.0,
      quotes: [
        {
          supplierId: "sup_ecoware",
          supplierName: "EcoWare Sustainable Supplies",
          paypalReceiverEmail: "orders@ecoware.com",
          baseUnitCostUSD: 38.0,
          volumeTiers: [
            { minUnits: 5, discountPercent: 8 },
            { minUnits: 15, discountPercent: 15 },
          ],
          shippingCostUSD: 25.0,
          freeShippingThresholdUSD: 300.0,
          leadTimeDays: 4,
          reliabilityRating: 4.9,
          isVerifiedPartner: true,
        },
        {
          supplierId: "sup_local_distro",
          supplierName: "Local Restaurant Depot Express",
          paypalReceiverEmail: "orders@localtea.com",
          baseUnitCostUSD: 46.0,
          volumeTiers: [{ minUnits: 10, discountPercent: 5 }],
          shippingCostUSD: 15.0,
          freeShippingThresholdUSD: 250.0,
          leadTimeDays: 1,
          reliabilityRating: 4.8,
          isVerifiedPartner: true,
        },
        {
          supplierId: "sup_bulk_containers",
          supplierName: "Overseas Container Cup Importers",
          paypalReceiverEmail: "sales@containercups.com",
          baseUnitCostUSD: 26.0,
          volumeTiers: [{ minUnits: 25, discountPercent: 25 }],
          shippingCostUSD: 80.0,
          freeShippingThresholdUSD: 900.0,
          leadTimeDays: 20,
          reliabilityRating: 4.1,
          isVerifiedPartner: false,
        },
      ],
    };
  }

  // Default / Universal Item Generator: Generates realistic quotes for any user query!
  const capitalizedQuery = query.charAt(0).toUpperCase() + query.slice(1);
  const hash = query.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const estimatedUnitCost = Number((3.5 + (hash % 15)).toFixed(2));
  const cleanSku = `SKU-${query.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toUpperCase() || "GEN"}-01`;

  return {
    sku: cleanSku,
    name: capitalizedQuery,
    baselineUnitCostUSD: Number((estimatedUnitCost * 1.35).toFixed(2)),
    quotes: [
      {
        supplierId: "sup_direct_factory",
        supplierName: `${capitalizedQuery} Certified Wholesale Direct`,
        paypalReceiverEmail: "supplier-assam@teaestate.com",
        baseUnitCostUSD: estimatedUnitCost,
        volumeTiers: [
          { minUnits: 50, discountPercent: 8 },
          { minUnits: 100, discountPercent: 15 },
        ],
        shippingCostUSD: 20.0,
        freeShippingThresholdUSD: 250.0,
        leadTimeDays: 5,
        reliabilityRating: 4.9,
        isVerifiedPartner: true,
      },
      {
        supplierId: "sup_express_local",
        supplierName: `Local 24h ${capitalizedQuery} Depot`,
        paypalReceiverEmail: "orders@localtea.com",
        baseUnitCostUSD: Number((estimatedUnitCost * 1.15).toFixed(2)),
        volumeTiers: [{ minUnits: 50, discountPercent: 5 }],
        shippingCostUSD: 14.0,
        freeShippingThresholdUSD: 300.0,
        leadTimeDays: 2,
        reliabilityRating: 4.7,
        isVerifiedPartner: true,
      },
      {
        supplierId: "sup_overseas_bulk",
        supplierName: `Trans-Oceanic ${capitalizedQuery} Cargo`,
        paypalReceiverEmail: "cargo@overseas-tea.com",
        baseUnitCostUSD: Number((estimatedUnitCost * 0.72).toFixed(2)),
        volumeTiers: [{ minUnits: 100, discountPercent: 20 }],
        shippingCostUSD: 60.0,
        freeShippingThresholdUSD: 800.0,
        leadTimeDays: 18,
        reliabilityRating: 4.1,
        isVerifiedPartner: false,
      },
    ],
  };
}

// Shared Mock State for the Interactive Dashboard
const state = {
  profile: {
    profileId: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    ownerName: "Sarah — Tea Haven Co.",
    mode: "BUSINESS_CFO",
    hardCeilingUSD: 800.0,
    reservedCashFloorUSD: 2500.0,
    targetCashRunwayDays: 30,
    maxSlowMovingItemOrderUSD: 300.0,
    whitelistedPayees: [
      {
        supplierId: "sup_assam_direct",
        name: "Assam Highlands Estate Direct",
        paypalReceiverEmail: "supplier-assam@teaestate.com",
        category: "tea_leaves",
        maxSingleOrderLimitUSD: 1000.0,
        isActive: true,
      },
      {
        supplierId: "sup_packaging_eco",
        name: "EcoPack Containers Inc.",
        paypalReceiverEmail: "billing@ecopack.com",
        category: "packaging",
        maxSingleOrderLimitUSD: 500.0,
        isActive: true,
      },
    ],
    updatedAt: new Date().toISOString(),
    version: 2,
  } as OwnerIntentProfile,

  inventory: [
    {
      sku: "TEA-EG-001",
      name: "Organic Earl Grey Reserve",
      currentStockUnits: 32,
      leadTimeDays: 7,
      safetyBufferDays: 4,
      unitCostUSD: 4.5,
      sellingPriceUSD: 12.0,
      velocity: { ema7Days: 6.8, ema14Days: 5.5, ema30Days: 4.2 },
      supplierId: "sup_assam_direct",
    },
    {
      sku: "TEA-CM-002",
      name: "Chamomile Calm",
      currentStockUnits: 280,
      leadTimeDays: 5,
      safetyBufferDays: 3,
      unitCostUSD: 2.5,
      sellingPriceUSD: 7.0,
      velocity: { ema7Days: 2.1, ema14Days: 2.0, ema30Days: 1.9 },
      supplierId: "sup_assam_direct",
    },
    {
      sku: "TEA-MAT-003",
      name: "Ceremonial Grade Matcha",
      currentStockUnits: 18,
      leadTimeDays: 10,
      safetyBufferDays: 5,
      unitCostUSD: 14.0,
      sellingPriceUSD: 35.0,
      velocity: { ema7Days: 3.5, ema14Days: 2.8, ema30Days: 2.0 },
      supplierId: "sup_assam_direct",
    },
  ] as InventoryItem[],

  quotes: generateWholesaleQuotesForQuery("tea").quotes as WholesaleSupplierQuote[],

  vault: new ZKVault({
    liquidCashUSD: 14250.0,
    reservedFloorUSD: 2500.0,
    dailyBurnRateUSD: 160.0,
    averageDailyRevenueUSD: 780.0,
    grossMarginPercent: 44.0,
    targetRunwayDays: 30,
  }),

  autonomyState: {
    supplierId: "sup_assam_direct",
    currentTier: "TIER_2_AUTONOMOUS",
    consecutiveCleanTxCount: 18,
    penaltyBoxActive: false,
    lastPenaltyReason: null,
    maxAutonomousPerOrderCapUSD: 800,
    lastStateChangeAt: new Date().toISOString(),
  } as AutonomyState,

  activeHold: null as {
    orderId: string;
    amountUSD: number;
    supplier: string;
    expiresAt: number;
    status: "ACTIVE" | "VOIDED" | "CAPTURED";
  } | null,
};

function parseJsonBody(req: http.IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host}`);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // ── 1. Serve HTML Web UI ──────────────────────────────────────────────────
  if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) {
    const htmlPath = path.join(__dirname, "ui.html");
    if (fs.existsSync(htmlPath)) {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(fs.readFileSync(htmlPath, "utf-8"));
      return;
    }
  }

  // ── 2. API: Get Current Dashboard State ──────────────────────────────────
  if (req.method === "GET" && url.pathname === "/api/state") {
    const privateLedger = state.vault.getPrivateLedgerCopy();
    const runwayDays =
      privateLedger.dailyBurnRateUSD > 0
        ? (privateLedger.liquidCashUSD - privateLedger.reservedFloorUSD) /
          privateLedger.dailyBurnRateUSD
        : 999;

    const mandate = DynamicMandateEngine.evaluateMandate(
      state.profile,
      privateLedger.averageDailyRevenueUSD,
      runwayDays,
      state.autonomyState
    );

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        profile: state.profile,
        inventory: state.inventory,
        quotes: state.quotes,
        autonomyState: state.autonomyState,
        vaultPublic: {
          liquidCashUSD: privateLedger.liquidCashUSD,
          reservedFloorUSD: privateLedger.reservedFloorUSD,
          dailyBurnRateUSD: privateLedger.dailyBurnRateUSD,
          runwayDays: Number(runwayDays.toFixed(1)),
          targetRunwayDays: privateLedger.targetRunwayDays,
        },
        mandate,
        activeHold: state.activeHold,
      })
    );
    return;
  }

  // ── 3. API: Run Autopilot Cycle ──────────────────────────────────────────
  if (req.method === "POST" && url.pathname === "/api/autopilot/run") {
    try {
      const body = await parseJsonBody(req);
      const sku = body.sku || "TEA-EG-001";
      const item = state.inventory.find((i) => i.sku === sku) || state.inventory[0];

      const result = await RestockingAutopilotOrchestrator.runCycle({
        item,
        profile: state.profile,
        zkVault: state.vault,
        availableWholesaleQuotes: state.quotes,
        supplierAutonomyState: state.autonomyState,
      });

      if (result.status === "COMPLETED_AUTONOMOUS_HOLD" && result.paypalOrderId) {
        state.activeHold = {
          orderId: result.paypalOrderId,
          amountUSD: result.dealComparison?.recommendedDeal.grossTotalUSD || 0,
          supplier: result.dealComparison?.recommendedDeal.supplierName || "Assam Highlands",
          expiresAt: Date.now() + 60_000,
          status: "ACTIVE",
        };
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
    } catch (err: any) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // ── 4. API: Pre-Flight Shield Inbound Scan ────────────────────────────────
  if (req.method === "POST" && url.pathname === "/api/shield/scan") {
    try {
      const body = await parseJsonBody(req);
      const verdict = PreFlightPaymentShield.inspect({
        incomingInvoiceOrEmailText: body.invoiceText || "",
        proposedPayeeEmail: body.payeeEmail || "supplier-assam@teaestate.com",
        proposedAmountUSD: Number(body.amountUSD) || 357.0,
        expectedAmountUSD: Number(body.expectedAmountUSD) || 357.0,
        sku: body.sku || "TEA-EG-001",
        units: Number(body.units) || 100,
        whitelistedPayees: state.profile.whitelistedPayees,
        sourceIdentifier: body.sourceIdentifier || "dashboard_test_feed",
      });

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(verdict));
    } catch (err: any) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // ── 5. API: Deal Scout Comparison & Item Search ─────────────────────────
  if (req.method === "POST" && (url.pathname === "/api/scout/compare" || url.pathname === "/api/scout/search")) {
    try {
      const body = await parseJsonBody(req);
      const query = (body.query || body.sku || "tea").trim();
      const units = Number(body.units) || 100;
      const maxLeadTime = Number(body.maxLeadTimeDays) || 12;

      const sourced = generateWholesaleQuotesForQuery(query);

      const comparison = WholesaleDealScout.compareQuotes(
        sourced.sku,
        units,
        maxLeadTime,
        sourced.quotes,
        sourced.baselineUnitCostUSD
      );

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          query,
          product: {
            sku: sourced.sku,
            name: sourced.name,
            baselineUnitCostUSD: sourced.baselineUnitCostUSD,
          },
          comparison,
        })
      );
    } catch (err: any) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // ── 6. API: Void Active Undo Hold ────────────────────────────────────────
  if (req.method === "POST" && url.pathname === "/api/undo/void") {
    if (state.activeHold && state.activeHold.status === "ACTIVE") {
      state.activeHold.status = "VOIDED";
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          success: true,
          message: `Order ${state.activeHold.orderId} successfully VOIDED inside 60-second window. 0 fees incurred.`,
          activeHold: state.activeHold,
        })
      );
    } else {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "No active undo hold to void." }));
    }
    return;
  }

  // ── 7. API: Capture Active Undo Hold ─────────────────────────────────────
  if (req.method === "POST" && url.pathname === "/api/undo/capture") {
    if (state.activeHold && state.activeHold.status === "ACTIVE") {
      state.activeHold.status = "CAPTURED";
      state.vault.recordSettlement(state.activeHold.amountUSD);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          success: true,
          message: `Order ${state.activeHold.orderId} CAPTURED! $${state.activeHold.amountUSD} settled from vault.`,
          activeHold: state.activeHold,
        })
      );
    } else {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "No active undo hold to capture." }));
    }
    return;
  }

  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not Found");
});

server.listen(PORT, () => {
  console.log(`\n======================================================================`);
  console.log(`🚀 STEWARD 2.0 LIVE INTERACTIVE DASHBOARD RUNNING!`);
  console.log(`👉 Open in your browser: http://localhost:${PORT}`);
  console.log(`======================================================================\n`);
});
