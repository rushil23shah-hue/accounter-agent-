#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  PriceSentinelEngine,
  OwnerIntentProfile,
  ZKVault,
} from "../src/index.js";

console.log("══════════════════════════════════════════════════════════════════════════════");
console.log("   STEWARD 2.0: AUTONOMOUS PRICE SENTINEL & DROP SNIPER VERIFICATION          ");
console.log("   24/7 Standing Intent • Asymmetric Ceiling Invariant • ZK-Vault Solvency    ");
console.log("══════════════════════════════════════════════════════════════════════════════\n");

async function runTests() {
  const profile: OwnerIntentProfile = {
    businessName: "Global Intent Retailer",
    defaultMandateUSD: 500,
    hardCeilingUSD: 1000,
    lowStockReorderFloorUnits: 15,
    maxSlowMovingItemOrderUSD: 300,
    whitelistedPayees: [
      {
        supplierId: "sup_assam_direct",
        name: "Verified Ticket & Goods Partner",
        paypalReceiverEmail: "supplier-assam@teaestate.com",
        category: "tickets",
        maxSingleOrderLimitUSD: 1000,
        isActive: true,
      },
    ],
    updatedAt: new Date().toISOString(),
    version: 1,
  };

  const vault = new ZKVault({
    liquidCashUSD: 5000,
    reservedFloorUSD: 2000,
    dailyBurnRateUSD: 50,
    averageDailyRevenueUSD: 400,
    grossMarginPercent: 45,
    targetRunwayDays: 30,
  });

  // ── TEST 1: Natural Language Parsing of Concert Tickets (INR) ──────────────
  console.log("▶ [Test 1] Parse Natural Language Standing Intent: Concert Tickets (INR)");
  const prompt1 = "Watch Coldplay concert tickets on BookMyShow. If listed under ₹7,500, buy 2 tickets immediately.";
  const watcher1 = PriceSentinelEngine.createFromPrompt({ naturalPrompt: prompt1 });

  assert.equal(watcher1.category, "TICKETS_EVENTS", "Must classify as TICKETS_EVENTS");
  assert.equal(watcher1.quantity, 2, "Must extract 2 tickets");
  assert.equal(watcher1.targetPriceINR, 7500, "Target INR must be 7500");
  assert.ok(watcher1.targetPriceUSD > 80 && watcher1.targetPriceUSD < 95, "Converted target USD must match exchange rate");
  assert.ok(watcher1.maxCeilingUSD > watcher1.targetPriceUSD, "Ceiling must enforce asymmetric limit");
  assert.equal(watcher1.status, "WATCHING", "Must start in WATCHING status");
  console.log(`  ✓ Successfully compiled: "${watcher1.name}" (Target: $${watcher1.targetPriceUSD.toFixed(2)}, Qty: ${watcher1.quantity})`);

  // ── TEST 2: Natural Language Parsing of Consumer Electronics (USD) ─────────
  console.log("\n▶ [Test 2] Parse Natural Language Standing Intent: Electronics (USD)");
  const prompt2 = "Watch Sony WH-1000XM5 headphones on Amazon. If price drops below $250, buy 1.";
  const watcher2 = PriceSentinelEngine.createFromPrompt({ naturalPrompt: prompt2 });

  assert.equal(watcher2.category, "ELECTRONICS", "Must classify as ELECTRONICS");
  assert.equal(watcher2.quantity, 1, "Must extract 1 unit");
  assert.equal(watcher2.targetPriceUSD, 250, "Target USD must be 250");
  assert.equal(watcher2.maxCeilingUSD, 287.5, "Ceiling must be 15% above target ($287.50)");
  console.log(`  ✓ Successfully compiled: "${watcher2.name}" (Ceiling: $${watcher2.maxCeilingUSD.toFixed(2)})`);

  // ── TEST 3: Evaluator Rejection when Price Above Target ────────────────────
  console.log("\n▶ [Test 3] Evaluator Invariant: Refuse trigger when price exceeds target");
  const evalAbove = await PriceSentinelEngine.evaluateWatcher({
    watcherId: watcher1.id,
    profile,
    vault,
    simulatedDropPriceUSD: 110.0, // Above target ~$86
  });

  assert.equal(evalAbove.triggered, false, "Must not trigger when price > target");
  assert.equal(evalAbove.paypalHoldCreated, false, "No PayPal hold should be created");
  assert.equal(evalAbove.watcher.status, "WATCHING", "Watcher must remain WATCHING");
  console.log("  ✓ Correctly remained in WATCHING mode when market price was above target.");

  // ── TEST 4: Asymmetric Limit Invariant: Block when Price Exceeds Hard Ceiling
  console.log("\n▶ [Test 4] Asymmetric Limit Invariant: Block purchase if scalper price > ceiling");
  // Force a watcher with a small ceiling
  const watcherTight = PriceSentinelEngine.createFromPrompt({
    name: "Tight Ceiling Item",
    query: "Rare Item",
    category: "GENERAL",
    targetPriceUSD: 100,
    maxCeilingUSD: 105,
    quantity: 1,
  });

  // Simulate a price that satisfies condition if loose, but breaches ceiling
  // (e.g. simulateDropPrice = 110 when ceiling is 105)
  const evalCeiling = await PriceSentinelEngine.evaluateWatcher({
    watcherId: watcherTight.id,
    profile,
    vault,
    simulatedDropPriceUSD: 108.0,
  });

  assert.equal(evalCeiling.paypalHoldCreated, false, "Must block purchase above hard ceiling");
  console.log("  ✓ Asymmetric Limit Invariant successfully blocked scalper price above ceiling.");

  // ── TEST 5: Autonomous Trigger, ZK Solvency & PayPal Hold Activation ───────
  console.log("\n▶ [Test 5] Autonomous Snipe Trigger: Flash Drop Below Target");
  const evalTrigger = await PriceSentinelEngine.evaluateWatcher({
    watcherId: watcher1.id,
    profile,
    vault,
    simulatedDropPriceUSD: 78.5, // Well below target ~$86
    simulatedMarketplace: "BookMyShow Verified Flash Drop",
  });

  assert.equal(evalTrigger.triggered, true, "Must trigger when price <= target");
  assert.equal(evalTrigger.paypalHoldCreated, true, "Must create PayPal hold");
  assert.equal(evalTrigger.watcher.status, "TRIGGERED_HOLD_ACTIVE", "Status must be TRIGGERED_HOLD_ACTIVE");
  assert.ok(evalTrigger.watcher.paypalOrderId?.startsWith("ORDER_SNIPE_"), "Must generate PayPal order ID");
  assert.ok(evalTrigger.watcher.undoExpiresAt! > Date.now(), "Undo window must be active in future");
  assert.ok(evalTrigger.watcher.whyTrail.length >= 4, "Must record why-trail audit");
  console.log(`  ✓ Autonomously sniped! PayPal Order: ${evalTrigger.watcher.paypalOrderId} (Undo: 60s active)`);

  // ── TEST 6: ZK-Vault Solvency Gate Protection ──────────────────────────────
  console.log("\n▶ [Test 6] ZK-Vault Solvency Gate: Refuse purchase when cash would breach floor");
  const brokeVault = new ZKVault({
    liquidCashUSD: 2050,
    reservedFloorUSD: 2000, // Only $50 available cash!
    dailyBurnRateUSD: 50,
    averageDailyRevenueUSD: 200,
    grossMarginPercent: 40,
    targetRunwayDays: 30,
  });

  const watcherExpensive = PriceSentinelEngine.createFromPrompt({
    name: "Expensive Luxury Restock",
    query: "Bulk Titanium Alloy",
    category: "COMMODITY_RESTOCK",
    targetPriceUSD: 250,
    maxCeilingUSD: 300,
    quantity: 1,
  });

  const evalSolvency = await PriceSentinelEngine.evaluateWatcher({
    watcherId: watcherExpensive.id,
    profile,
    vault: brokeVault,
    simulatedDropPriceUSD: 220, // Price is good, but merchant only has $50 free cash!
  });

  assert.equal(evalSolvency.paypalHoldCreated, false, "Must block purchase when solvency fails");
  assert.ok(evalSolvency.reason.includes("Solvency"), "Reason must mention Solvency Gate");
  console.log("  ✓ ZK-Vault successfully prevented bank account breach while owner was sleeping!");

  console.log("\n══════════════════════════════════════════════════════════════════════════════");
  console.log("   🏆 ALL 6 AUTONOMOUS PRICE SENTINEL & SNIPER TESTS PASSED (100%)!           ");
  console.log("══════════════════════════════════════════════════════════════════════════════\n");
}

runTests().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
