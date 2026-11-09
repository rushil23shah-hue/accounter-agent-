import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
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
  DisputeDossierGenerator,
  InventoryItem,
  OwnerIntentProfile,
  AutonomyState,
  WebScoutEngine,
  SelfLearningIntentAgent,
  PayPalClient,
  PayPalOrders,
  mapEventToPaymentState,
  PayPalWebhookListener,
  HighTrustKnowledgeBase,
  IntentGroundingEngine,
  ProposedIntentDraft,
  ProposedIntentDraftSchema,
} from "../index.js";
import { BENCHMARK_CASES, BENCHMARK_WHITELIST } from "../benchmark/cases.js";

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
    authorizationId?: string;
    amountUSD: number;
    supplier: string;
    sku?: string;
    units?: number;
    expiresAt: number;
    status: "ACTIVE" | "VOIDED" | "CAPTURED";
  } | null,

  webhookEvents: [
    {
      id: "WH_BOOT_001",
      eventType: "PAYMENT.AUTHORIZATION.CREATED",
      paymentState: "AUTHORIZED_HELD_IN_UNDO",
      resourceId: "AUTH_INIT_SANDBOX",
      amountUSD: 357.0,
      receivedAt: new Date(Date.now() - 120_000).toISOString(),
      verified: true,
    },
    {
      id: "WH_BOOT_002",
      eventType: "PAYMENT.CAPTURE.COMPLETED",
      paymentState: "CAPTURED",
      resourceId: "CAPT_INIT_SANDBOX",
      amountUSD: 357.0,
      receivedAt: new Date(Date.now() - 60_000).toISOString(),
      verified: true,
    },
  ] as Array<{
    id: string;
    eventType: string;
    paymentState: string | null;
    resourceId?: string;
    amountUSD?: number;
    receivedAt: string;
    verified: boolean;
  }>,

  knowledgeBase: new HighTrustKnowledgeBase([
    {
      id: "kb_init_01",
      sku: "TEA-EG-001",
      aliases: ["earl grey reserve", "organic earl grey", "best selling earl grey"],
      text: "Organic Earl Grey Reserve (SKU: TEA-EG-001). Single-Estate Assam black tea infused with natural Calabrian bergamot oil.",
      preferredSupplierId: "sup_assam_direct",
      defaultOrderUnits: 100,
      maxBudgetUSD: 800.0,
      tags: ["tea", "earl-grey", "catalog"],
    },
    {
      id: "kb_init_02",
      sku: "MATCHA-CEREM-100G",
      aliases: ["ceremonial matcha", "popular matcha", "matcha ceremonial grade"],
      text: "Matcha Ceremonial Grade Uji 100g (SKU: MATCHA-CEREM-100G). High margin morning item from Uji, Kyoto.",
      preferredSupplierId: "sup_pac_tea",
      defaultOrderUnits: 60,
      maxBudgetUSD: 900.0,
      tags: ["tea", "matcha", "japan"],
    },
    {
      id: "kb_init_03",
      sku: "PKG-KRAFT-250",
      aliases: ["kraft pouches", "stand up pouches", "eco packaging"],
      text: "Eco-Friendly Kraft Stand-Up Pouches 250g (SKU: PKG-KRAFT-250). Degassing valve packaging for dry goods.",
      preferredSupplierId: "sup_packaging_eco",
      defaultOrderUnits: 200,
      maxBudgetUSD: 400.0,
      tags: ["packaging", "eco", "pouches"],
    },
    {
      id: "kb_init_04",
      sku: "TEA-SENCHA-002",
      aliases: ["organic sencha fukamushi", "japanese green tea sencha"],
      text: "Organic Sencha Fukamushi Green Tea (SKU: TEA-SENCHA-002). Deep-steamed Japanese sencha.",
      preferredSupplierId: "sup_pac_tea",
      defaultOrderUnits: 50,
      maxBudgetUSD: 600.0,
      tags: ["tea", "green-tea", "sencha"],
    },
  ]),
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
      let matchedItem = state.inventory.find((i) => i.sku === sku);
      if (!matchedItem) {
        const kbItem = state.knowledgeBase.getItemBySku(sku);
        if (kbItem && kbItem.sku) {
          const defaultUnits = kbItem.defaultOrderUnits || 50;
          const estimatedUnitCost = kbItem.maxBudgetUSD ? Math.round((kbItem.maxBudgetUSD / defaultUnits) * 100) / 100 : 12.5;
          matchedItem = {
            sku: kbItem.sku,
            name: kbItem.text.split(".")[0] || kbItem.sku,
            currentStockUnits: 12,
            leadTimeDays: 5,
            safetyBufferDays: 3,
            unitCostUSD: estimatedUnitCost,
            sellingPriceUSD: Number((estimatedUnitCost * 2.2).toFixed(2)),
            velocity: {
              ema7Days: 5.0,
              ema14Days: 4.5,
              ema30Days: 4.0,
            },
            supplierId: kbItem.preferredSupplierId || "sup_assam_direct",
          };
          state.inventory.push(matchedItem);
        }
      }
      const item = matchedItem || state.inventory[0];

      const dynamicQuotes = generateWholesaleQuotesForQuery(item.name).quotes;

      const customUnits = body.customUnits !== undefined && Number(body.customUnits) > 0
        ? Number(body.customUnits)
        : undefined;

      const oneTimeMandateOverrideUSD = body.oneTimeMandateOverrideUSD !== undefined && Number(body.oneTimeMandateOverrideUSD) > 0
        ? Number(body.oneTimeMandateOverrideUSD)
        : undefined;

      const result = await RestockingAutopilotOrchestrator.runCycle({
        item,
        profile: state.profile,
        zkVault: state.vault,
        availableWholesaleQuotes: dynamicQuotes,
        supplierAutonomyState: state.autonomyState,
        customUnits,
        oneTimeMandateOverrideUSD,
      });

      if (result.status === "COMPLETED_AUTONOMOUS_HOLD" && result.paypalOrderId) {
        const orderUnits = customUnits || result.forecast?.tailoredNextMonthUnits || 100;
        state.activeHold = {
          orderId: result.paypalOrderId,
          authorizationId: result.paypalAuthorizationId || `AUTH_SANDBOX_${Date.now()}`,
          amountUSD: result.dealComparison?.recommendedDeal.grossTotalUSD || 0,
          supplier: result.dealComparison?.recommendedDeal.supplierName || "Assam Highlands",
          sku: item.sku,
          units: orderUnits,
          expiresAt: Date.now() + 60_000,
          status: "ACTIVE",
        };

        // Record real webhook event into live event log
        state.webhookEvents.unshift({
          id: `WH_EVT_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          eventType: "PAYMENT.AUTHORIZATION.CREATED",
          paymentState: "AUTHORIZED_HELD_IN_UNDO",
          resourceId: state.activeHold.authorizationId,
          amountUSD: state.activeHold.amountUSD,
          receivedAt: new Date().toISOString(),
          verified: true,
        });
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

      // If live PayPal credentials exist, execute live void call on PayPal Orders API
      let liveVoided = false;
      if (process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET) {
        try {
          const client = PayPalClient.fromEnv();
          const orders = new PayPalOrders(client);
          if (state.activeHold.authorizationId && !state.activeHold.authorizationId.startsWith("mock_") && !state.activeHold.authorizationId.startsWith("AUTH_SANDBOX_")) {
            await orders.voidAuthorization(state.activeHold.authorizationId);
            liveVoided = true;
          }
        } catch (e: any) {
          console.warn("Live PayPal void note:", e.message);
        }
      }

      // Record webhook event into live event log
      state.webhookEvents.unshift({
        id: `WH_EVT_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        eventType: "PAYMENT.AUTHORIZATION.VOIDED",
        paymentState: "VOIDED_BY_USER",
        resourceId: state.activeHold.authorizationId || state.activeHold.orderId,
        amountUSD: state.activeHold.amountUSD,
        receivedAt: new Date().toISOString(),
        verified: true,
      });

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          success: true,
          liveVoided,
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

  // ── 7. API: Capture Active Undo Hold (Auto-Settle & Restock) ───────────────
  if (req.method === "POST" && url.pathname === "/api/undo/capture") {
    if (state.activeHold && state.activeHold.status === "ACTIVE") {
      state.activeHold.status = "CAPTURED";
      state.vault.recordSettlement(state.activeHold.amountUSD);

      // Add restocked units to inventory
      let restockedItemName = "";
      if (state.activeHold.sku) {
        const item = state.inventory.find((i) => i.sku === state.activeHold!.sku);
        if (item && state.activeHold.units) {
          item.currentStockUnits += state.activeHold.units;
          restockedItemName = item.name;
        }
      }

      // Advance supplier earned autonomy
      state.autonomyState.consecutiveCleanTxCount += 1;
      if (state.autonomyState.consecutiveCleanTxCount >= 15 && state.autonomyState.currentTier !== "TIER_2_AUTONOMOUS") {
        state.autonomyState.currentTier = "TIER_2_AUTONOMOUS";
      }

      // If live PayPal credentials exist, execute live capture call
      let liveCaptured = false;
      if (process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET) {
        try {
          const client = PayPalClient.fromEnv();
          const orders = new PayPalOrders(client);
          if (state.activeHold.authorizationId && !state.activeHold.authorizationId.startsWith("mock_") && !state.activeHold.authorizationId.startsWith("AUTH_SANDBOX_")) {
            await orders.captureAuthorization(state.activeHold.authorizationId);
            liveCaptured = true;
          }
        } catch (e: any) {
          console.warn("Live PayPal capture note:", e.message);
        }
      }

      // Record webhook event into live event log
      state.webhookEvents.unshift({
        id: `WH_EVT_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        eventType: "PAYMENT.CAPTURE.COMPLETED",
        paymentState: "CAPTURED",
        resourceId: state.activeHold.authorizationId || state.activeHold.orderId,
        amountUSD: state.activeHold.amountUSD,
        receivedAt: new Date().toISOString(),
        verified: true,
      });

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          success: true,
          liveCaptured,
          restockedUnits: state.activeHold.units,
          productName: restockedItemName,
          message: `Order ${state.activeHold.orderId} CAPTURED! $${state.activeHold.amountUSD.toFixed(2)} settled from ZK-Vault. ${state.activeHold.units || 0} units added to stock.`,
          activeHold: state.activeHold,
        })
      );
    } else {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "No active undo hold to capture." }));
    }
    return;
  }

  // ── 8. API: Dynamic Sales Ingestion & Real-Time Rhythm Update ───────────
  if (req.method === "POST" && url.pathname === "/api/inventory/sale") {
    try {
      const body = await parseJsonBody(req);
      const sku = body.sku;
      const unitsSold = Number(body.unitsSold) || 1;

      const itemIndex = state.inventory.findIndex((i) => i.sku === sku);
      if (itemIndex === -1) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: `SKU ${sku} not found.` }));
        return;
      }

      const item = state.inventory[itemIndex];
      const { updatedItem, isSpikeDetected, spikeRatio } =
        AdaptiveConsumptionForecaster.recordSaleEvent(item, unitsSold);

      // Ingest revenue into ZK-Vault locally (unitsSold * sellingPrice)
      const revenueUSD = unitsSold * item.sellingPriceUSD;
      state.vault.recordRevenue(revenueUSD);

      // Save updated item in state
      state.inventory[itemIndex] = updatedItem;

      // Compute new forecast dynamically
      const newForecast = AdaptiveConsumptionForecaster.forecastItem(updatedItem);

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          success: true,
          updatedItem,
          isSpikeDetected,
          spikeRatio,
          revenueGeneratedUSD: revenueUSD,
          newForecast,
        })
      );
    } catch (err: any) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // ── 9. API: Dynamically Add New Inventory Item ───────────────────────────
  if (req.method === "POST" && url.pathname === "/api/inventory/add") {
    try {
      const body = await parseJsonBody(req);
      const newItem: InventoryItem = {
        sku: (body.sku || `SKU-${Date.now().toString(36).toUpperCase()}`).trim(),
        name: (body.name || "Custom Inventory Item").trim(),
        currentStockUnits: Number(body.currentStockUnits) || 50,
        leadTimeDays: Number(body.leadTimeDays) || 7,
        safetyBufferDays: Number(body.safetyBufferDays) || 3,
        unitCostUSD: Number(body.unitCostUSD) || 5.0,
        sellingPriceUSD: Number(body.sellingPriceUSD) || 15.0,
        velocity: {
          ema7Days: Number(body.ema7Days) || 4.0,
          ema14Days: Number(body.ema14Days) || 4.0,
          ema30Days: Number(body.ema30Days) || 4.0,
        },
        supplierId: body.supplierId || "sup_assam_direct",
      };

      state.inventory.push(newItem);

      // Dynamically index new item into RAG High-Trust Knowledge Base
      state.knowledgeBase.addItem({
        id: `kb_item_${newItem.sku.toLowerCase()}`,
        sku: newItem.sku,
        text: `${newItem.name} (SKU: ${newItem.sku}). Baseline cost: $${newItem.unitCostUSD.toFixed(2)}. Lead time: ${newItem.leadTimeDays}d.`,
        aliases: [
          newItem.name.toLowerCase(),
          newItem.name.toLowerCase().replace(/[^a-z0-9]/g, " ").trim(),
        ],
        preferredSupplierId: newItem.supplierId,
        defaultOrderUnits: Math.max(25, Math.round(newItem.leadTimeDays * newItem.velocity.ema14Days)),
        maxBudgetUSD: state.profile.hardCeilingUSD,
        tags: ["catalog", "inventory"],
      });

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true, item: newItem }));
    } catch (err: any) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // ── 10. API: Dynamically Update Owner Intent Profile ─────────────────────
  if (req.method === "POST" && url.pathname === "/api/profile/update") {
    try {
      const body = await parseJsonBody(req);

      if (body.hardCeilingUSD !== undefined) {
        state.profile.hardCeilingUSD = Number(body.hardCeilingUSD);
      }
      if (body.reservedCashFloorUSD !== undefined) {
        state.profile.reservedCashFloorUSD = Number(body.reservedCashFloorUSD);
        // Sync floor to ZK-Vault
        const copy = state.vault.getPrivateLedgerCopy();
        state.vault = new ZKVault({
          ...copy,
          reservedFloorUSD: state.profile.reservedCashFloorUSD,
        });
      }
      if (body.targetCashRunwayDays !== undefined) {
        state.profile.targetCashRunwayDays = Number(body.targetCashRunwayDays);
      }
      if (body.mode !== undefined) {
        state.profile.mode = body.mode;
      }
      if (body.whitelistedPayees !== undefined) {
        state.profile.whitelistedPayees = body.whitelistedPayees;
      }

      state.profile.updatedAt = new Date().toISOString();
      state.profile.version += 1;

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true, profile: state.profile }));
    } catch (err: any) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // ── 11. API: Generate 1-Click Forensic Dispute Dossier (Layer 6) ───────────
  if (req.method === "POST" && url.pathname === "/api/dossier/generate") {
    try {
      const body = await parseJsonBody(req);
      const authId = body.authorizationId || state.activeHold?.orderId || `AUTH_${Date.now()}`;
      const captureId = body.captureId || (state.activeHold?.status === "CAPTURED" ? `CAPT_${Date.now()}` : null);

      const dossier = DisputeDossierGenerator.generateDossier({
        paypalAuthorizationId: authId,
        paypalCaptureId: captureId,
        ownerProfile: state.profile,
        provenanceTrail: [
          {
            rawContent: body.invoiceMemo || "Wholesale Restock Invoice memo audited.",
            tag: "UNTRUSTED_SUPPLIER_INVOICE",
            sourceIdentifier: body.sourceId || "vendor_inbound_stream",
            ingestedAt: new Date().toISOString(),
            isQuarantined: true,
            sha256Hash: crypto
              .createHash("sha256")
              .update(body.invoiceMemo || "Wholesale Restock Invoice memo audited.")
              .digest("hex"),
          },
        ],
        deterministicGateResult: {
          allowed: body.allowed ?? true,
          effectiveLimitUSD: state.profile.hardCeilingUSD,
          decisionReason: body.decisionReason || "Compliant with owner intent profile",
          violations: body.violations || [],
          requiresHumanMfa: false,
          evaluatedAt: new Date().toISOString(),
        },
        flaggedAttackType: body.flaggedAttackType || null,
        incidentDescription: body.incidentDescription || "Automated transaction dossier for PayPal Resolution Center.",
      });

      const auditReport = DisputeDossierGenerator.toAuditReport(dossier);

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true, dossier, auditReport }));
    } catch (err: any) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // ── 12. API: Get 65-Case Benchmark Catalog ────────────────────────────────
  if (req.method === "GET" && url.pathname === "/api/benchmark/cases") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        totalCases: BENCHMARK_CASES.length,
        cases: BENCHMARK_CASES,
      })
    );
    return;
  }

  // ── 13. API: Run Full 65-Case Benchmark & Return Empirical Scorecard ──────
  if (req.method === "POST" && url.pathname === "/api/benchmark/run") {
    try {
      let totalLatency = 0;
      let blockedCount = 0;
      let falsePositives = 0;
      const details = [];

      for (const tc of BENCHMARK_CASES) {
        const start = performance.now();
        const verdict = PreFlightPaymentShield.inspect({
          incomingInvoiceOrEmailText: tc.invoiceMemo,
          proposedPayeeEmail: tc.proposedPayeeEmail,
          proposedAmountUSD: tc.proposedAmountUSD,
          expectedAmountUSD: tc.expectedAmountUSD,
          sku: tc.sku,
          units: tc.units,
          whitelistedPayees: BENCHMARK_WHITELIST,
          sourceIdentifier: `api_benchmark_${tc.id}`,
        });
        const lat = performance.now() - start;
        totalLatency += lat;

        const isBlocked = !verdict.clearedForPayment;
        const passed = isBlocked === tc.expectedBlocked;

        if (tc.expectedBlocked && isBlocked) blockedCount++;
        if (!tc.expectedBlocked && isBlocked) falsePositives++;

        details.push({
          id: tc.id,
          name: tc.name,
          category: tc.category,
          attackVector: tc.attackVector,
          passed,
          isBlocked,
          latencyMs: Number(lat.toFixed(2)),
          threats: verdict.threatsDetected.map((t) => t.type),
        });
      }

      const adversarialTotal = BENCHMARK_CASES.filter((c) => c.expectedBlocked).length;
      const benignTotal = BENCHMARK_CASES.filter((c) => !c.expectedBlocked).length;

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          success: true,
          totalCases: BENCHMARK_CASES.length,
          adversarialTotal,
          benignTotal,
          attacksBlocked: blockedCount,
          attackBlockRatePercent: Number(((blockedCount / adversarialTotal) * 100).toFixed(1)),
          falsePositiveRatePercent: Number(((falsePositives / benignTotal) * 100).toFixed(1)),
          avgLatencyMs: Number((totalLatency / BENCHMARK_CASES.length).toFixed(3)),
          details,
        })
      );
    } catch (err: any) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // ── 14. API: Real-Time Consumer Web Price Comparer (Amazon, Flipkart, Meesho) ─
  if (req.method === "POST" && url.pathname === "/api/web-scout/search") {
    try {
      const body = await parseJsonBody(req);
      const query = (body.query || "").trim();
      if (!query) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Query parameter is required" }));
        return;
      }

      const result = await WebScoutEngine.searchDeals(query);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
    } catch (err: any) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // ── 15. API: Self-Learning Intent Rules (List & Teach) ────────────────────
  if (req.method === "GET" && url.pathname === "/api/intent/rules") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ rules: SelfLearningIntentAgent.getTaughtRules() }));
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/intent/teach") {
    try {
      const body = await parseJsonBody(req);
      const ruleText = (body.ruleText || "").trim();
      if (!ruleText) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "ruleText is required" }));
        return;
      }

      const newRule = SelfLearningIntentAgent.teachRule(ruleText);

      // Dynamically index newly taught policy into RAG Knowledge Base
      state.knowledgeBase.addItem({
        id: `kb_learned_${newRule.id}`,
        text: newRule.ruleText,
        aliases: [newRule.ruleText.toLowerCase()],
        tags: ["learned_rule", newRule.category],
      });
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true, rule: newRule }));
    } catch (err: any) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/intent/rule/toggle") {
    try {
      const body = await parseJsonBody(req);
      const success = SelfLearningIntentAgent.toggleRule(body.ruleId, Boolean(body.active));
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success }));
    } catch (err: any) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // ── 16. API: Intent Proactive Tasks & Autopilot Execution ─────────────────
  if (req.method === "GET" && url.pathname === "/api/intent/tasks") {
    try {
      const tasks = SelfLearningIntentAgent.generateProactiveTasks({
        inventory: state.inventory,
        profile: state.profile,
        zkVault: state.vault,
        autonomyStates: { [state.autonomyState.supplierId]: state.autonomyState },
      });
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ tasks }));
    } catch (err: any) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/intent/task/execute") {
    try {
      const body = await parseJsonBody(req);
      const sku = body.sku || "TEA-MC-002";
      const item = state.inventory.find((i) => i.sku === sku) || state.inventory[0];
      const dynamicQuotes = generateWholesaleQuotesForQuery(item.name).quotes;

      const taskUnits = body.targetUnits ? Number(body.targetUnits) : undefined;
      const result = await RestockingAutopilotOrchestrator.runCycle({
        item,
        profile: state.profile,
        zkVault: state.vault,
        availableWholesaleQuotes: dynamicQuotes,
        supplierAutonomyState: state.autonomyState,
        customUnits: taskUnits,
        oneTimeMandateOverrideUSD: body.overrideAmountUSD ? Number(body.overrideAmountUSD) : undefined,
      });

      if (result.status === "COMPLETED_AUTONOMOUS_HOLD" && result.paypalOrderId) {
        const orderUnits = taskUnits || result.forecast?.tailoredNextMonthUnits || 100;
        state.activeHold = {
          orderId: result.paypalOrderId,
          authorizationId: result.paypalAuthorizationId || `AUTH_SANDBOX_${Date.now()}`,
          amountUSD: result.dealComparison?.recommendedDeal.grossTotalUSD || 0,
          supplier: result.dealComparison?.recommendedDeal.supplierName || "Assam Highlands",
          sku: item.sku,
          units: orderUnits,
          expiresAt: Date.now() + 60_000,
          status: "ACTIVE",
        };

        // Record real webhook event into live event log
        state.webhookEvents.unshift({
          id: `WH_EVT_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          eventType: "PAYMENT.AUTHORIZATION.CREATED",
          paymentState: "AUTHORIZED_HELD_IN_UNDO",
          resourceId: state.activeHold.authorizationId,
          amountUSD: state.activeHold.amountUSD,
          receivedAt: new Date().toISOString(),
          verified: true,
        });
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true, result }));
    } catch (err: any) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // ── 17. API: Real & Sandbox PayPal Webhook Receiver (Layer 5) ──────────────
  if (req.method === "POST" && (url.pathname === "/api/webhooks/paypal" || url.pathname === "/webhooks/paypal")) {
    try {
      const body = await parseJsonBody(req);
      const eventType = body.event_type || "UNKNOWN";
      const eventId = body.id || `EVT_${Date.now()}`;
      const mappedState = mapEventToPaymentState(eventType);

      let verified = true;
      if (process.env.PAYPAL_WEBHOOK_ID && process.env.PAYPAL_CLIENT_ID) {
        try {
          const client = PayPalClient.fromEnv();
          const listener = new PayPalWebhookListener(client, process.env.PAYPAL_WEBHOOK_ID, () => {});
          verified = await listener.verify(req.headers, body);
        } catch {
          verified = false;
        }
      }

      let actionTaken = "EVENT_LOGGED";
      if (eventType === "PAYMENT.CAPTURE.COMPLETED") {
        if (state.activeHold && state.activeHold.status === "ACTIVE") {
          state.activeHold.status = "CAPTURED";
          state.vault.recordSettlement(state.activeHold.amountUSD);
          if (state.activeHold.sku) {
            const item = state.inventory.find((i) => i.sku === state.activeHold!.sku);
            if (item && state.activeHold.units) {
              item.currentStockUnits += state.activeHold.units;
            }
          }
          state.autonomyState.consecutiveCleanTxCount += 1;
          actionTaken = "CAPTURED_AND_RESTOCKED";
        }
      } else if (eventType === "PAYMENT.AUTHORIZATION.VOIDED") {
        if (state.activeHold && state.activeHold.status === "ACTIVE") {
          state.activeHold.status = "VOIDED";
          actionTaken = "VOIDED_BY_WEBHOOK";
        }
      } else if (eventType === "PAYMENT.AUTHORIZATION.CREATED") {
        actionTaken = "AUTHORIZATION_HELD_IN_UNDO";
      }

      const resource = body.resource || {};
      const amountUSD = resource.amount?.value ? parseFloat(resource.amount.value) : (state.activeHold?.amountUSD || 357.0);
      const resourceId = resource.id || state.activeHold?.authorizationId || state.activeHold?.orderId || "RES_SANDBOX";

      state.webhookEvents.unshift({
        id: eventId,
        eventType,
        paymentState: mappedState,
        resourceId,
        amountUSD,
        receivedAt: new Date().toISOString(),
        verified,
      });

      if (state.webhookEvents.length > 50) {
        state.webhookEvents.pop();
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          success: true,
          eventId,
          eventType,
          mappedState,
          verified,
          actionTaken,
          activeHold: state.activeHold,
        })
      );
    } catch (err: any) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // ── 18. API: Get Live Webhook Events Stream ────────────────────────────────
  if (req.method === "GET" && url.pathname === "/api/webhooks/events") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        total: state.webhookEvents.length,
        events: state.webhookEvents,
        activeHold: state.activeHold,
      })
    );
    return;
  }

  // ── 19. API: 1-Click PayPal Webhook Simulator (For Hackathon Testing) ──────
  if (req.method === "POST" && url.pathname === "/api/webhooks/simulate") {
    try {
      const body = await parseJsonBody(req);
      const eventType = body.eventType || "PAYMENT.CAPTURE.COMPLETED";
      const eventId = `WH_SIM_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const mappedState = mapEventToPaymentState(eventType);

      let actionTaken = "EVENT_LOGGED";
      if (eventType === "PAYMENT.CAPTURE.COMPLETED") {
        if (state.activeHold && state.activeHold.status === "ACTIVE") {
          state.activeHold.status = "CAPTURED";
          state.vault.recordSettlement(state.activeHold.amountUSD);
          if (state.activeHold.sku) {
            const item = state.inventory.find((i) => i.sku === state.activeHold!.sku);
            if (item && state.activeHold.units) {
              item.currentStockUnits += state.activeHold.units;
            }
          }
          state.autonomyState.consecutiveCleanTxCount += 1;
          actionTaken = "CAPTURED_AND_RESTOCKED";
        }
      } else if (eventType === "PAYMENT.AUTHORIZATION.VOIDED") {
        if (state.activeHold && state.activeHold.status === "ACTIVE") {
          state.activeHold.status = "VOIDED";
          actionTaken = "VOIDED_BY_SIMULATED_WEBHOOK";
        }
      } else if (eventType === "PAYMENT.AUTHORIZATION.CREATED") {
        actionTaken = "AUTHORIZATION_HELD_IN_UNDO";
      }

      const amountUSD = Number(body.amountUSD) || state.activeHold?.amountUSD || 357.0;
      const resourceId = body.resourceId || state.activeHold?.authorizationId || `AUTH_${Date.now()}`;

      state.webhookEvents.unshift({
        id: eventId,
        eventType,
        paymentState: mappedState,
        resourceId,
        amountUSD,
        receivedAt: new Date().toISOString(),
        verified: true,
      });

      if (state.webhookEvents.length > 50) {
        state.webhookEvents.pop();
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          success: true,
          eventId,
          eventType,
          mappedState,
          verified: true,
          actionTaken,
          activeHold: state.activeHold,
        })
      );
    } catch (err: any) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // ── 20. API: Ground Natural Language Intent via Dynamic Intent-RAG ──────────
  if (req.method === "POST" && url.pathname === "/api/rag/ground") {
    try {
      const body = await parseJsonBody(req);
      const userPrompt = String(body.userPrompt || "");

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

      const result = IntentGroundingEngine.ground({
        userPrompt,
        knowledgeBase: state.knowledgeBase,
        mandateAllowanceCapUSD: mandate.currentEffectiveMandateUSD,
      });

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          ...result,
          mandateEffectiveUSD: mandate.currentEffectiveMandateUSD,
          liquidRunwayDays: Number(runwayDays.toFixed(1)),
        })
      );
    } catch (err: any) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // ── 21. API: Dynamic RAG Knowledge Base (Inspect & Ingest) ─────────────────
  if (req.method === "GET" && url.pathname === "/api/rag/knowledge") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        total: state.knowledgeBase.getItems().length,
        items: state.knowledgeBase.getItems(),
      })
    );
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/rag/knowledge/add") {
    try {
      const body = await parseJsonBody(req);
      const item = {
        id: body.id || `kb_dyn_${Date.now()}`,
        sku: body.sku,
        text: String(body.text || ""),
        aliases: Array.isArray(body.aliases) ? body.aliases : [],
        preferredSupplierId: body.preferredSupplierId,
        defaultOrderUnits: Number(body.defaultOrderUnits) || 50,
        maxBudgetUSD: Number(body.maxBudgetUSD) || state.profile.hardCeilingUSD,
        tags: Array.isArray(body.tags) ? body.tags : ["custom_ingested"],
      };

      state.knowledgeBase.addItem(item);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true, item, totalItems: state.knowledgeBase.getItems().length }));
    } catch (err: any) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
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
