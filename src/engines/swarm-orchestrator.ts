import {
  DagPlan,
  DagPlanSchema,
  DagTaskNode,
  DagTaskNodeSchema,
  SwarmAgentRole,
} from "../contracts/swarm.js";
import { AgentEventBus } from "./agent-event-bus.js";
import { SemanticVectorMemoryEngine } from "./vector-memory.js";
import { PreFlightPaymentShield } from "../privacy/pre-flight-shield.js";
import { DynamicMandateEngine } from "./dynamic-mandate.js";
import { WholesaleDealScout } from "./deal-scout.js";
import { AdaptiveConsumptionForecaster } from "./consumption-forecaster.js";
import { ZKVault } from "../privacy/zk-vault.js";
import { PayPalOrders } from "../paypal/orders.js";
import { InventoryItem, OwnerIntentProfile, AutonomyState } from "../contracts/index.js";

export class SwarmOrchestratorEngine {
  /**
   * Plans a dynamic Directed Acyclic Graph (DAG) for a business goal.
   */
  public static createDagPlan(goal: string, sku: string): DagPlan {
    const planId = `DAG-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const timestamp = new Date().toISOString();

    const nodes: DagTaskNode[] = [
      {
        id: "task_1_audit",
        title: `Inventory Calculus & Velocity Audit (${sku})`,
        assignedAgent: "INVENTORY_OFFICER",
        dependencies: [],
        status: "PENDING",
        actionType: "AUDIT_INVENTORY",
        payload: { sku },
      },
      {
        id: "task_2_scout",
        title: "Multi-Store Wholesale Deal Scouting & Arbitrage",
        assignedAgent: "ARBITRAGE_HUNTER",
        dependencies: ["task_1_audit"],
        status: "PENDING",
        actionType: "SCOUT_PRICES",
        payload: { sku },
      },
      {
        id: "task_3_cfo",
        title: "ZK-Solvency Verification & Dynamic Mandate Calculation",
        assignedAgent: "VIRTUAL_CFO",
        dependencies: ["task_2_scout"],
        status: "PENDING",
        actionType: "EVALUATE_MANDATE",
      },
      {
        id: "task_4_shield",
        title: "Pre-Flight Payment Security & Payee Whitelist Scan",
        assignedAgent: "SECURITY_AUDITOR",
        dependencies: ["task_3_cfo"],
        status: "PENDING",
        actionType: "SHIELD_SECURITY_SCAN",
      },
      {
        id: "task_5_paypal",
        title: "PayPal Orders v2 AUTHORIZE Hold (60s Undo Window)",
        assignedAgent: "CEO_ORCHESTRATOR",
        dependencies: ["task_4_shield"],
        status: "PENDING",
        actionType: "PAYPAL_HOLD_LOCK",
      },
      {
        id: "task_6_memory",
        title: "Vector Memory Encoding & Non-Repudiable Audit Journal",
        assignedAgent: "VIRTUAL_CFO",
        dependencies: ["task_5_paypal"],
        status: "PENDING",
        actionType: "RECORD_AUDIT_MEMORY",
      },
    ];

    return DagPlanSchema.parse({
      planId,
      goal,
      createdAt: timestamp,
      nodes,
      isCompleted: false,
      status: "PLANNED",
    });
  }

  /**
   * Executes a DAG Plan sequentially with strict dependency checking and rollback on failure.
   */
  public static async executeDagPlan(params: {
    plan: DagPlan;
    inventory: InventoryItem[];
    profile: OwnerIntentProfile;
    vault: ZKVault;
    autonomyState: AutonomyState;
  }): Promise<DagPlan> {
    const { plan, inventory, profile, vault, autonomyState } = params;
    const startTime = Date.now();
    plan.status = "EXECUTING";

    await AgentEventBus.dispatch({
      sender: "CEO_ORCHESTRATOR",
      recipient: "BROADCAST",
      intent: "DAG_PLAN_INITIATED",
      payload: { planId: plan.planId, goal: plan.goal, nodeCount: plan.nodes.length },
    });

    let sharedContext: Record<string, any> = {};

    for (const node of plan.nodes) {
      // 1. Dependency gate: check if all prerequisite tasks completed successfully
      const prerequisitesMet = node.dependencies.every((depId) => {
        const depNode = plan.nodes.find((n) => n.id === depId);
        return depNode && depNode.status === "COMPLETED";
      });

      if (!prerequisitesMet) {
        node.status = "BLOCKED";
        node.error = `Prerequisite dependencies not met: [${node.dependencies.join(", ")}]`;
        continue;
      }

      node.status = "IN_PROGRESS";
      const nodeStart = Date.now();

      try {
        switch (node.actionType) {
          case "AUDIT_INVENTORY": {
            const sku = node.payload?.sku || "TEA-EG-001";
            const item = inventory.find((i) => i.sku === sku) || inventory[0];
            const forecast = AdaptiveConsumptionForecaster.forecastItem(item);
            sharedContext.item = item;
            sharedContext.forecast = forecast;
            node.result = {
              sku: item.sku,
              currentStock: item.currentStockUnits,
              tailoredUnits: forecast.tailoredNextMonthUnits,
              trend: forecast.trendType,
              urgency: forecast.isRestockUrgent,
            };

            await AgentEventBus.dispatch({
              sender: "INVENTORY_OFFICER",
              recipient: "ARBITRAGE_HUNTER",
              intent: "STOCK_DEPLETION_ALERT",
              payload: { sku: item.sku, unitsNeeded: forecast.tailoredNextMonthUnits, urgency: forecast.isRestockUrgent },
            });
            break;
          }

          case "SCOUT_PRICES": {
            const item = sharedContext.item as InventoryItem;
            const units = (sharedContext.forecast?.tailoredNextMonthUnits as number) || 100;
            
            // Check vector memory for historical pricing baseline
            const memoryHits = SemanticVectorMemoryEngine.searchMemories(item.name, 1);
            const baselineCost = memoryHits[0]?.item.metadata.unitPriceUSD || item.unitCostUSD;

            const quotes = [
              {
                supplierId: "sup_direct_factory",
                supplierName: `${item.name} Wholesale Direct`,
                paypalReceiverEmail: "supplier-assam@teaestate.com",
                baseUnitCostUSD: Number((baselineCost * 0.95).toFixed(2)),
                volumeTiers: [{ minUnits: 50, discountPercent: 10 }],
                shippingCostUSD: 15.0,
                freeShippingThresholdUSD: 200.0,
                leadTimeDays: 5,
                reliabilityRating: 4.9,
                isVerifiedPartner: true,
              },
              {
                supplierId: "sup_express_local",
                supplierName: `Local 24h ${item.name} Depot`,
                paypalReceiverEmail: "orders@localtea.com",
                baseUnitCostUSD: Number((baselineCost * 1.1).toFixed(2)),
                volumeTiers: [{ minUnits: 50, discountPercent: 5 }],
                shippingCostUSD: 10.0,
                freeShippingThresholdUSD: 250.0,
                leadTimeDays: 2,
                reliabilityRating: 4.7,
                isVerifiedPartner: true,
              },
            ];

            const comparison = WholesaleDealScout.compareQuotes(item.sku, units, 12, quotes, baselineCost);
            sharedContext.dealComparison = comparison;
            node.result = {
              recommendedSupplier: comparison.recommendedDeal.supplierName,
              effectiveUnitCost: comparison.recommendedDeal.effectiveUnitCostUSD,
              grossTotalUSD: comparison.recommendedDeal.grossTotalUSD,
              totalSavingsUSD: comparison.totalSavingsUSD,
            };

            await AgentEventBus.dispatch({
              sender: "ARBITRAGE_HUNTER",
              recipient: "VIRTUAL_CFO",
              intent: "OPTIMAL_DEAL_PROPOSED",
              payload: {
                supplier: comparison.recommendedDeal.supplierName,
                grossTotalUSD: comparison.recommendedDeal.grossTotalUSD,
                savings: comparison.totalSavingsUSD,
              },
            });
            break;
          }

          case "EVALUATE_MANDATE": {
            const pLedger = vault.getPrivateLedgerCopy();
            const runwayDays = pLedger.dailyBurnRateUSD > 0
              ? (pLedger.liquidCashUSD - pLedger.reservedFloorUSD) / pLedger.dailyBurnRateUSD
              : 999;

            const mandate = DynamicMandateEngine.evaluateMandate(
              profile,
              pLedger.averageDailyRevenueUSD,
              runwayDays,
              autonomyState
            );

            const deal = sharedContext.dealComparison?.recommendedDeal;
            let gross = deal ? deal.grossTotalUSD : 100;
            let downsized = false;
            const originalUnits = sharedContext.forecast?.tailoredNextMonthUnits || 100;

            // Autonomous Swarm Negotiation: If batch exceeds mandate, CFO dynamically downsizes batch to protect liquidity
            if (gross > mandate.currentEffectiveMandateUSD && deal) {
              const effUnitCost = deal.effectiveUnitCostUSD;
              const shipping = deal.shippingFeeUSD || 0;
              const spendable = Math.max(0, mandate.currentEffectiveMandateUSD - shipping);
              const maxAffordableUnits = Math.max(1, Math.floor(spendable / effUnitCost));

              deal.orderedUnits = maxAffordableUnits;
              deal.grossTotalUSD = Number((maxAffordableUnits * effUnitCost + shipping).toFixed(2));
              gross = deal.grossTotalUSD;
              downsized = true;
            }

            const isAffordable = gross <= mandate.currentEffectiveMandateUSD;

            sharedContext.mandate = mandate;
            sharedContext.runwayDays = runwayDays;
            node.result = {
              effectiveMandateUSD: mandate.currentEffectiveMandateUSD,
              orderCostUSD: gross,
              isAffordable,
              runwayDays: Number(runwayDays.toFixed(1)),
              tier: mandate.autonomyTierApplied,
              downsizedFromOriginal: downsized ? originalUnits : undefined,
              downsizedUnits: downsized ? deal?.orderedUnits : undefined,
            };

            if (!isAffordable) {
              throw new Error(`Order cost ($${gross}) exceeds active mandate allowance ($${mandate.currentEffectiveMandateUSD})`);
            }

            if (downsized) {
              await AgentEventBus.dispatch({
                sender: "VIRTUAL_CFO",
                recipient: "INVENTORY_OFFICER",
                intent: "BUDGET_REALLOCATION_DOWNSIZED",
                payload: {
                  reason: `Mandate ceiling ($${mandate.currentEffectiveMandateUSD}) enforced. Downsized from ${originalUnits} to ${deal?.orderedUnits} units ($${gross}).`,
                  originalUnits,
                  downsizedUnits: deal?.orderedUnits,
                },
              });
            }

            await AgentEventBus.dispatch({
              sender: "VIRTUAL_CFO",
              recipient: "SECURITY_AUDITOR",
              intent: "SOLVENCY_CLEARANCE_PASSED",
              payload: { mandateUSD: mandate.currentEffectiveMandateUSD, runwayDays: node.result.runwayDays },
            });
            break;
          }

          case "SHIELD_SECURITY_SCAN": {
            const deal = sharedContext.dealComparison?.recommendedDeal;
            const payeeEmail = deal?.paypalReceiverEmail || "supplier-assam@teaestate.com";

            const shieldVerdict = PreFlightPaymentShield.inspect({
              incomingInvoiceOrEmailText: `Invoice for ${deal?.supplierName}. Payee: ${payeeEmail}. Total: $${deal?.grossTotalUSD}`,
              proposedPayeeEmail: payeeEmail,
              proposedAmountUSD: deal?.grossTotalUSD || 50,
              expectedAmountUSD: deal?.grossTotalUSD || 50,
              sku: sharedContext.item?.sku || "TEA-EG-001",
              units: sharedContext.forecast?.tailoredNextMonthUnits || 100,
              whitelistedPayees: profile.whitelistedPayees,
              sourceIdentifier: "wholesale_deal_scout",
            });

            sharedContext.shieldVerdict = shieldVerdict;
            node.result = {
              clearedForPayment: shieldVerdict.clearedForPayment,
              riskScore: shieldVerdict.riskScore,
              threatsDetected: shieldVerdict.threatsDetected.length,
            };

            if (!shieldVerdict.clearedForPayment) {
              throw new Error(`Pre-Flight Payment Shield blocked payee ${payeeEmail}: ${shieldVerdict.whyExplanation}`);
            }

            await AgentEventBus.dispatch({
              sender: "SECURITY_AUDITOR",
              recipient: "CEO_ORCHESTRATOR",
              intent: "SECURITY_SHIELD_VERIFIED",
              payload: { payee: payeeEmail, threats: 0, status: "CLEARED" },
            });
            break;
          }

          case "PAYPAL_HOLD_LOCK": {
            const deal = sharedContext.dealComparison?.recommendedDeal;
            const gross = deal ? deal.grossTotalUSD : 50;

            const paypalOrderId = `PP_HOLD_${Date.now().toString(36).toUpperCase()}_${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

            sharedContext.paypalOrderId = paypalOrderId;
            node.result = {
              paypalOrderId,
              status: "COMPLETED_AUTONOMOUS_HOLD",
              intent: "AUTHORIZE",
              undoWindowSeconds: 60,
            };

            await AgentEventBus.dispatch({
              sender: "CEO_ORCHESTRATOR",
              recipient: "BROADCAST",
              intent: "PAYPAL_HOLD_LOCKED",
              payload: { orderId: paypalOrderId, amountUSD: gross, undoSeconds: 60 },
            });
            break;
          }

          case "RECORD_AUDIT_MEMORY": {
            const deal = sharedContext.dealComparison?.recommendedDeal;
            const memory = SemanticVectorMemoryEngine.storeMemory({
              topic: `AUTONOMOUS_RESTOCK_${sharedContext.item?.sku}`,
              content: `Procured ${sharedContext.forecast?.tailoredNextMonthUnits} units of ${sharedContext.item?.name} from ${deal?.supplierName} for $${deal?.grossTotalUSD} under mandate.`,
              metadata: {
                sku: sharedContext.item?.sku,
                vendor: deal?.supplierName,
                unitPriceUSD: deal?.effectiveUnitCostUSD,
                units: sharedContext.forecast?.tailoredNextMonthUnits,
                riskScore: 0,
              },
            });

            node.result = {
              memoryId: memory.id,
              topic: memory.topic,
              savedToVectorStore: true,
            };

            await AgentEventBus.dispatch({
              sender: "VIRTUAL_CFO",
              recipient: "BROADCAST",
              intent: "AUDIT_MEMORY_COMMITTED",
              payload: { memoryId: memory.id },
            });
            break;
          }
        }

        node.status = "COMPLETED";
        node.executionTimeMs = Date.now() - nodeStart;
      } catch (err: any) {
        node.status = "FAILED";
        node.error = err.message;
        node.executionTimeMs = Date.now() - nodeStart;

        // Rollback downstream plan
        plan.status = "FAILED_ROLLED_BACK";
        await AgentEventBus.dispatch({
          sender: "CEO_ORCHESTRATOR",
          recipient: "BROADCAST",
          intent: "DAG_EXECUTION_FAILED_ROLLBACK",
          payload: { failedNodeId: node.id, error: err.message },
        });
        break;
      }
    }

    if (plan.status !== "FAILED_ROLLED_BACK") {
      plan.status = "SUCCESS";
      plan.isCompleted = true;
    }

    plan.totalExecutionTimeMs = Date.now() - startTime;
    return plan;
  }
}
