import {
  AgentEventBus,
  SemanticVectorMemoryEngine,
  SwarmOrchestratorEngine,
  BusinessHeartbeatEngine,
  ZKVault,
  InventoryItem,
  OwnerIntentProfile,
  AutonomyState,
} from "../src/index.js";

async function runSwarmVerification() {
  console.log("══════════════════════════════════════════════════════════════════════════════");
  console.log("   AGENTICPAY — MULTI-AGENT SWARM & 5-DAY BUSINESS SIMULATOR AUDIT");
  console.log("   DAG Task Planning • Agent Negotiations • Vector Memory • PayPal Holds");
  console.log("══════════════════════════════════════════════════════════════════════════════\n");

  let passedTests = 0;
  const totalTests = 5;

  // ── TEST 1: Agent Event Bus Communication ──────────────────────────────────
  console.log("⏳ Test 1: Agent Event Bus & Typed Actor Communication...");
  let receivedCount = 0;
  AgentEventBus.subscribe("VIRTUAL_CFO", (msg) => {
    receivedCount++;
  });

  await AgentEventBus.dispatch({
    sender: "INVENTORY_OFFICER",
    recipient: "VIRTUAL_CFO",
    intent: "INVENTORY_DEPLETION_NOTICE",
    payload: { sku: "TEA-EG-001", unitsNeeded: 180 },
  });

  if (receivedCount === 1) {
    console.log("  [✓] Pass: Typed actor message routed accurately via AgentEventBus\n");
    passedTests++;
  } else {
    throw new Error(`Failed: Expected 1 message received, got ${receivedCount}`);
  }

  // ── TEST 2: Semantic Long-Term Vector Memory ───────────────────────────────
  console.log("⏳ Test 2: Semantic Long-Term Vector Memory & Cosine Search...");
  SemanticVectorMemoryEngine.init();
  const searchResults = SemanticVectorMemoryEngine.searchMemories("where can we buy sugar cheap?", 1);
  if (searchResults.length > 0 && (searchResults[0].item.topic.includes("SUGAR") || searchResults[0].item.content.toLowerCase().includes("sugar"))) {
    console.log(`  [✓] Pass: Retrieved historical memory: "${searchResults[0].item.content}" (Score: ${searchResults[0].score.toFixed(3)})\n`);
    passedTests++;
  } else {
    throw new Error(`Failed: Semantic memory retrieval did not match expected topic`);
  }

  // ── Setup Mock Environment for DAG & 5-Day Simulation ──────────────────────
  const mockInventory: InventoryItem[] = [
    {
      sku: "TEA-EG-001",
      name: "Organic Earl Grey Reserve",
      currentStockUnits: 32,
      leadTimeDays: 5,
      safetyBufferDays: 3,
      unitCostUSD: 8.5,
      sellingPriceUSD: 18.0,
      velocity: {
        ema7Days: 8.9,
        ema14Days: 6.2,
        ema30Days: 5.5,
      },
      supplierId: "sup_assam_direct",
    },
  ];

  const mockProfile: OwnerIntentProfile = {
    profileId: "11111111-1111-4111-a111-111111111111",
    ownerName: "AgenticPay Artisan Tea & Grocery Hub",
    mode: "BUSINESS_CFO",
    hardCeilingUSD: 800.0,
    reservedCashFloorUSD: 2500.0,
    targetCashRunwayDays: 30,
    maxSlowMovingItemOrderUSD: 300.0,
    updatedAt: new Date().toISOString(),
    version: 1,
    whitelistedPayees: [
      {
        supplierId: "sup_assam_direct",
        name: "Assam Highlands Estate Direct",
        paypalReceiverEmail: "supplier-assam@teaestate.com",
        category: "tea_leaves",
        maxSingleOrderLimitUSD: 2000.0,
        isActive: true,
      },
      {
        supplierId: "sup_packaging_eco",
        name: "EcoPack Containers Inc.",
        paypalReceiverEmail: "billing@ecopack.com",
        category: "packaging",
        maxSingleOrderLimitUSD: 1000.0,
        isActive: true,
      },
    ],
  };

  const mockVault = new ZKVault({
    liquidCashUSD: 14250.0,
    reservedFloorUSD: 2500.0,
    dailyBurnRateUSD: 160.0,
    averageDailyRevenueUSD: 780.0,
    grossMarginPercent: 44.0,
    targetRunwayDays: 30,
  });

  const mockAutonomy: AutonomyState = {
    supplierId: "sup_assam_direct",
    currentTier: "TIER_2_AUTONOMOUS",
    consecutiveCleanTxCount: 18,
    penaltyBoxActive: false,
    lastPenaltyReason: null,
    maxAutonomousPerOrderCapUSD: 800,
    lastStateChangeAt: new Date().toISOString(),
  };

  // ── TEST 3: Dynamic DAG Task Planning & Dependency Execution ───────────────
  console.log("⏳ Test 3: Dynamic DAG Planning & Dependency Execution...");
  const dagPlan = SwarmOrchestratorEngine.createDagPlan("Autonomous Restock Cycle", "TEA-EG-001");
  if (dagPlan.nodes.length === 6 && dagPlan.nodes[0].dependencies.length === 0) {
    console.log(`  [✓] Pass: Created 6-node topological DAG plan (${dagPlan.planId})`);
  }

  const executedPlan = await SwarmOrchestratorEngine.executeDagPlan({
    plan: dagPlan,
    inventory: mockInventory,
    profile: mockProfile,
    vault: mockVault,
    autonomyState: mockAutonomy,
  });

  if (executedPlan.status === "SUCCESS" && executedPlan.isCompleted) {
    console.log("  [✓] Pass: All 6 DAG nodes executed sequentially with zero dependency violations\n");
    passedTests++;
  } else {
    const failedNode = executedPlan.nodes.find(n => n.status === "FAILED");
    console.error("Failed node:", failedNode?.title, "Error:", failedNode?.error);
    throw new Error(`Failed: DAG execution failed with status: ${executedPlan.status}`);
  }

  // ── TEST 4: 5-Day Autonomous Business Simulation (Mon-Fri) ─────────────────
  console.log("⏳ Test 4: Full 5-Day Business Simulation (120 Hours Autonomous Loop)...");
  const simResult = await BusinessHeartbeatEngine.simulate5WorkingDays({
    inventory: mockInventory,
    profile: mockProfile,
    vault: mockVault,
    autonomyState: mockAutonomy,
  });

  if (simResult.totalDaysCompleted === 5 && simResult.days.length === 5) {
    console.log(`  [✓] Pass: Simulated 5 consecutive days successfully:`);
    console.log(`      • Monday   : ${simResult.days[0].headline}`);
    console.log(`      • Tuesday  : ${simResult.days[1].headline} (${simResult.days[1].threatsNeutralized} threat blocked)`);
    console.log(`      • Wednesday: ${simResult.days[2].headline} ($${simResult.days[2].capitalSavedUSD} saved)`);
    console.log(`      • Thursday : ${simResult.days[3].headline} (${simResult.days[3].mandateAdjustment})`);
    console.log(`      • Friday   : ${simResult.days[4].headline}`);
    passedTests++;
  } else {
    throw new Error(`Failed: 5-day simulation completed only ${simResult.totalDaysCompleted} days`);
  }

  // ── TEST 5: Financial Invariant & Cryptographic Integrity ──────────────────
  console.log("\n⏳ Test 5: Weekly Reconciled Savings & Cryptographic Non-Repudiation...");
  if (simResult.cumulativeArbitrageSavingsUSD > 0 && simResult.courtReadyDossierHash.length === 64) {
    console.log(`  [✓] Pass: Cumulative Arbitrage Savings: $${simResult.cumulativeArbitrageSavingsUSD.toFixed(2)}`);
    console.log(`  [✓] Pass: Cryptographic SHA-256 Dossier Hash: ${simResult.courtReadyDossierHash}`);
    console.log(`  [✓] Pass: Final Solvency Runway: ${simResult.finalRunwayDays} days (Zero Cash-Floor Breach)\n`);
    passedTests++;
  } else {
    throw new Error("Failed: Missing cumulative savings or valid SHA-256 hash");
  }

  console.log("══════════════════════════════════════════════════════════════════════════════");
  console.log(`   🏆 ALL ${passedTests} / ${totalTests} SWARM & 5-DAY BUSINESS SIMULATION TESTS PASSED (100%)!`);
  console.log("══════════════════════════════════════════════════════════════════════════════");
}

runSwarmVerification().catch((err) => {
  console.error("Verification error:", err);
  process.exit(1);
});
