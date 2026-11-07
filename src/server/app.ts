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

  quotes: [
    {
      supplierId: "sup_local_distro",
      supplierName: "Local Express Tea Distro",
      paypalReceiverEmail: "orders@localtea.com",
      baseUnitCostUSD: 4.8,
      volumeTiers: [],
      shippingCostUSD: 18.0,
      freeShippingThresholdUSD: 600.0,
      leadTimeDays: 2,
      reliabilityRating: 4.8,
      isVerifiedPartner: true,
    },
    {
      supplierId: "sup_assam_direct",
      supplierName: "Assam Highlands Estate Direct",
      paypalReceiverEmail: "supplier-assam@teaestate.com",
      baseUnitCostUSD: 4.2,
      volumeTiers: [
        { minUnits: 50, discountPercent: 8 },
        { minUnits: 80, discountPercent: 15 },
      ],
      shippingCostUSD: 25.0,
      freeShippingThresholdUSD: 300.0,
      leadTimeDays: 6,
      reliabilityRating: 4.9,
      isVerifiedPartner: true,
    },
    {
      supplierId: "sup_overseas_bulk",
      supplierName: "Overseas Cargo Bulk Exporters",
      paypalReceiverEmail: "cargo@overseas-tea.com",
      baseUnitCostUSD: 3.2,
      volumeTiers: [{ minUnits: 100, discountPercent: 20 }],
      shippingCostUSD: 50.0,
      freeShippingThresholdUSD: 1000.0,
      leadTimeDays: 18,
      reliabilityRating: 4.1,
      isVerifiedPartner: false,
    },
  ] as WholesaleSupplierQuote[],

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

  // ── 5. API: Deal Scout Comparison ────────────────────────────────────────
  if (req.method === "POST" && url.pathname === "/api/scout/compare") {
    try {
      const body = await parseJsonBody(req);
      const units = Number(body.units) || 100;
      const sku = body.sku || "TEA-EG-001";
      const maxLeadTime = Number(body.maxLeadTimeDays) || 11;

      const comparison = WholesaleDealScout.compareQuotes(
        sku,
        units,
        maxLeadTime,
        state.quotes,
        4.5
      );

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(comparison));
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
