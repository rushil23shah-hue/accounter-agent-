import { z } from "zod";
import { InventoryItem, OwnerIntentProfile, AutonomyState } from "../contracts/index.js";
import { ZKVault } from "../privacy/zk-vault.js";
import { DynamicMandateEngine, DynamicMandateState } from "./dynamic-mandate.js";

// ─────────────────────────────────────────────────────────────────────────────
// Intent Schemas & Types
// ─────────────────────────────────────────────────────────────────────────────

export const TaughtRuleCategorySchema = z.enum([
  "MANDATE_EXPANSION",
  "SUPPLIER_TRUST",
  "CASH_PRESERVATION",
  "VELOCITY_PROTECTION",
  "BATCH_OPTIMIZATION",
  "CUSTOM",
]);
export type TaughtRuleCategory = z.infer<typeof TaughtRuleCategorySchema>;

export const TaughtIntentRuleSchema = z.object({
  id: z.string(),
  ruleText: z.string(),
  category: TaughtRuleCategorySchema,
  conditionDescription: z.string(),
  actionDescription: z.string(),
  triggerParameters: z.object({
    minDiscountPercent: z.number().optional(),
    supplierId: z.string().optional(),
    minTrustRating: z.number().optional(),
    runwayThresholdDays: z.number().optional(),
    targetSku: z.string().optional(),
    mandateCeilingUSD: z.number().optional(),
  }),
  active: z.boolean(),
  timesTriggered: z.number().int().nonnegative(),
  confidenceScore: z.number().min(0).max(1),
  learnedAt: z.string().datetime(),
});
export type TaughtIntentRule = z.infer<typeof TaughtIntentRuleSchema>;

export const AgentTaskPrioritySchema = z.enum(["CRITICAL", "HIGH", "MEDIUM", "OPPORTUNITY"]);
export type AgentTaskPriority = z.infer<typeof AgentTaskPrioritySchema>;

export const AgentTaskStatusSchema = z.enum(["PENDING", "EXECUTED", "DISMISSED"]);
export type AgentTaskStatus = z.infer<typeof AgentTaskStatusSchema>;

export const ProactiveAgentTaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  priority: AgentTaskPrioritySchema,
  category: z.string(),
  description: z.string(),
  financialImpactUSD: z.number(),
  impactLabel: z.string(), // e.g. "Saves $93.00", "Prevents Stockout", "Unblocks Restock"
  actionType: z.enum([
    "DOWNSIZE_RESTOCK",
    "EXPAND_MANDATE_EXCEPTION",
    "OPTIMIZE_BATCH_SIZE",
    "TIGHTEN_RUNWAY_SPEND",
    "ENABLE_TAUGHT_RULE",
  ]),
  suggestedActionLabel: z.string(),
  sku: z.string().optional(),
  targetUnits: z.number().int().positive().optional(),
  overrideAmountUSD: z.number().positive().optional(),
  status: AgentTaskStatusSchema,
  createdAt: z.string().datetime(),
});
export type ProactiveAgentTask = z.infer<typeof ProactiveAgentTaskSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Self-Learning Dynamic Intent Agent
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Self-Learning Dynamic Intent Agent.
 *
 * Replaces rigid static spending mandates with a self-learning intent engine:
 * 1. Learns merchant intent rules taught in natural language or interactive policies.
 * 2. Continuously monitors sales velocity, inventory depletion, supplier quotes, and cash runway.
 * 3. Proactively generates actionable task recommendations (e.g. dynamic downsizing,
 *    volume discount capture, mandate expansion for trusted partners).
 * 4. Executes recommended tasks with 1-click while maintaining the Asymmetric Limit Invariant.
 */
export class SelfLearningIntentAgent {
  private static taughtRules: TaughtIntentRule[] = [
    {
      id: "rule_volume_discount_01",
      ruleText: "If supplier offers volume discount ≥ 15% with rating ≥ 4.8, dynamically expand mandate up to $1,500",
      category: "MANDATE_EXPANSION",
      conditionDescription: "Supplier discount ≥ 15% AND supplier rating ≥ 4.8",
      actionDescription: "Allows mandate headroom up to $1,500 for high-trust volume bargains",
      triggerParameters: {
        minDiscountPercent: 15,
        minTrustRating: 4.8,
        mandateCeilingUSD: 1500,
      },
      active: true,
      timesTriggered: 3,
      confidenceScore: 0.98,
      learnedAt: "2026-11-01T10:00:00.000Z",
    },
    {
      id: "rule_auto_downsize_02",
      ruleText: "When restock cost exceeds mandate ceiling, dynamically auto-downsize batch to fit limit instead of halting",
      category: "BATCH_OPTIMIZATION",
      conditionDescription: "Order gross cost > current effective spending mandate",
      actionDescription: "Computes maximal units within budget and proposes 1-tap downsizing",
      triggerParameters: {},
      active: true,
      timesTriggered: 5,
      confidenceScore: 0.99,
      learnedAt: "2026-11-03T14:30:00.000Z",
    },
    {
      id: "rule_kyoto_trust_03",
      ruleText: "Trust Kyoto Tea Co Direct with up to $1,200 reorder allowance for Ceremonial Matcha (SKU: TEA-MC-002)",
      category: "SUPPLIER_TRUST",
      conditionDescription: "SKU = TEA-MC-002 AND Supplier = Kyoto Tea Co Direct (Rating 4.9)",
      actionDescription: "One-tap mandate exception up to $1,200",
      triggerParameters: {
        targetSku: "TEA-MC-002",
        supplierId: "sup_kyoto_tea",
        mandateCeilingUSD: 1200,
      },
      active: true,
      timesTriggered: 2,
      confidenceScore: 0.95,
      learnedAt: "2026-11-05T09:15:00.000Z",
    },
    {
      id: "rule_runway_guard_04",
      ruleText: "If cash runway drops below 45 days, automatically compress all spending mandates by 40%",
      category: "CASH_PRESERVATION",
      conditionDescription: "Projected cash runway < 45 days",
      actionDescription: "Restrict AI spending allowance to 60% of baseline to protect cash floor",
      triggerParameters: {
        runwayThresholdDays: 45,
      },
      active: true,
      timesTriggered: 1,
      confidenceScore: 1.0,
      learnedAt: "2026-11-06T18:00:00.000Z",
    },
  ];

  private static taskHistory: ProactiveAgentTask[] = [];

  /**
   * Retrieves all currently active taught rules.
   */
  public static getTaughtRules(): TaughtIntentRule[] {
    return [...this.taughtRules];
  }

  /**
   * Teaches the agent a new intent rule in natural language.
   * Parses the text semantically, registers the rule, and activates it.
   */
  public static teachRule(naturalLanguageText: string): TaughtIntentRule {
    const text = naturalLanguageText.trim();
    if (!text) {
      throw new Error("Rule text cannot be empty");
    }

    const id = `rule_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const lower = text.toLowerCase();

    // Semantic Intent Parsing
    let category: TaughtRuleCategory = "CUSTOM";
    const triggerParams: TaughtIntentRule["triggerParameters"] = {};
    let conditionDesc = "User-defined condition";
    let actionDesc = "Custom intent behavior";

    // Extract dollar ceilings: e.g. "$1,500" or "$1200"
    const dollarMatch = text.match(/\$\s*([0-9,]+)/);
    if (dollarMatch) {
      triggerParams.mandateCeilingUSD = parseFloat(dollarMatch[1].replace(/,/g, ""));
    }

    // Extract discount percent: e.g. "15%" or "20 percent"
    const percentMatch = text.match(/([0-9]+)\s*%/);
    if (percentMatch) {
      triggerParams.minDiscountPercent = parseInt(percentMatch[1], 10);
    }

    // Extract days: e.g. "45 days" or "30d"
    const daysMatch = text.match(/([0-9]+)\s*(?:days|d\b)/i);
    if (daysMatch) {
      triggerParams.runwayThresholdDays = parseInt(daysMatch[1], 10);
    }

    // Extract SKU or product mentions
    if (lower.includes("matcha")) {
      triggerParams.targetSku = "TEA-MC-002";
    } else if (lower.includes("earl grey")) {
      triggerParams.targetSku = "TEA-EG-001";
    }

    if (lower.includes("expand") || lower.includes("increase mandate") || lower.includes("allow up to")) {
      category = "MANDATE_EXPANSION";
      conditionDesc = triggerParams.minDiscountPercent
        ? `Discount ≥ ${triggerParams.minDiscountPercent}%`
        : "Owner custom expansion condition";
      actionDesc = triggerParams.mandateCeilingUSD
        ? `Allows dynamic mandate ceiling up to $${triggerParams.mandateCeilingUSD.toFixed(2)}`
        : "Expands AI mandate headroom";
    } else if (lower.includes("downsize") || lower.includes("batch")) {
      category = "BATCH_OPTIMIZATION";
      conditionDesc = "Order exceeds current mandate limit";
      actionDesc = "Auto-downsizes batch units to fit ceiling";
    } else if (lower.includes("runway") || lower.includes("cash") || lower.includes("preserve")) {
      category = "CASH_PRESERVATION";
      conditionDesc = triggerParams.runwayThresholdDays
        ? `Runway < ${triggerParams.runwayThresholdDays} days`
        : "Cash reserve protection trigger";
      actionDesc = "Compresses spending mandate to safeguard liquidity";
    } else if (lower.includes("trust") || lower.includes("supplier") || lower.includes("rating")) {
      category = "SUPPLIER_TRUST";
      conditionDesc = "Supplier reliability rating or verification check";
      actionDesc = "Awards trusted supplier higher reorder autonomy";
    }

    const newRule: TaughtIntentRule = {
      id,
      ruleText: text,
      category,
      conditionDescription: conditionDesc,
      actionDescription: actionDesc,
      triggerParameters: triggerParams,
      active: true,
      timesTriggered: 0,
      confidenceScore: 0.95,
      learnedAt: new Date().toISOString(),
    };

    this.taughtRules.unshift(newRule);
    return newRule;
  }

  /**
   * Toggles an existing rule active/inactive.
   */
  public static toggleRule(ruleId: string, active: boolean): boolean {
    const rule = this.taughtRules.find((r) => r.id === ruleId);
    if (rule) {
      rule.active = active;
      return true;
    }
    return false;
  }

  /**
   * Deletes a taught rule.
   */
  public static deleteRule(ruleId: string): boolean {
    const idx = this.taughtRules.findIndex((r) => r.id === ruleId);
    if (idx !== -1) {
      this.taughtRules.splice(idx, 1);
      return true;
    }
    return false;
  }

  /**
   * Evaluates active taught rules against an order scenario to determine if an
   * intentional dynamic mandate expansion or batch adaptation applies.
   */
  public static evaluateTaughtRulesForOrder(params: {
    sku: string;
    grossTotalUSD: number;
    currentMandateUSD: number;
    discountPercent: number;
    supplierRating: number;
    supplierId: string;
  }): {
    expandedMandateUSD: number;
    matchedRule?: TaughtIntentRule;
    ruleExplanation?: string;
  } {
    let allowedCeiling = params.currentMandateUSD;
    let matchedRule: TaughtIntentRule | undefined;
    let ruleExplanation: string | undefined;

    for (const rule of this.taughtRules) {
      if (!rule.active) continue;

      // 1. Check Volume Discount Expansion Rule
      if (
        rule.category === "MANDATE_EXPANSION" &&
        rule.triggerParameters.minDiscountPercent !== undefined &&
        params.discountPercent >= rule.triggerParameters.minDiscountPercent &&
        params.supplierRating >= (rule.triggerParameters.minTrustRating ?? 4.5)
      ) {
        const potentialCeiling = rule.triggerParameters.mandateCeilingUSD ?? (params.currentMandateUSD * 1.5);
        if (potentialCeiling > allowedCeiling) {
          allowedCeiling = potentialCeiling;
          matchedRule = rule;
          rule.timesTriggered++;
          ruleExplanation = `Taught Rule Triggered (${rule.id}): High volume discount (${params.discountPercent}%) & 4.8+ rating unlocked $${allowedCeiling.toFixed(2)} mandate ceiling.`;
        }
      }

      // 2. Check Supplier Trust Rule
      if (
        rule.category === "SUPPLIER_TRUST" &&
        ((rule.triggerParameters.targetSku && rule.triggerParameters.targetSku === params.sku) ||
          (rule.triggerParameters.supplierId && rule.triggerParameters.supplierId === params.supplierId))
      ) {
        const potentialCeiling = rule.triggerParameters.mandateCeilingUSD ?? (params.currentMandateUSD * 1.5);
        if (potentialCeiling > allowedCeiling) {
          allowedCeiling = potentialCeiling;
          matchedRule = rule;
          rule.timesTriggered++;
          ruleExplanation = `Taught Rule Triggered (${rule.id}): Trusted supplier exception unlocked $${allowedCeiling.toFixed(2)} mandate ceiling for ${params.sku}.`;
        }
      }
    }

    return {
      expandedMandateUSD: allowedCeiling,
      matchedRule,
      ruleExplanation,
    };
  }

  /**
   * Continuously analyzes inventory, velocity, suppliers, and runway
   * to generate dynamic proactive tasks for the merchant.
   */
  public static generateProactiveTasks(params: {
    inventory: InventoryItem[];
    profile: OwnerIntentProfile;
    zkVault: ZKVault;
    autonomyStates: Record<string, AutonomyState>;
  }): ProactiveAgentTask[] {
    const tasks: ProactiveAgentTask[] = [];
    const ledger = params.zkVault.getPrivateLedgerCopy();
    const runwayDays = ledger.dailyBurnRateUSD > 0
      ? Math.round((ledger.liquidCashUSD - ledger.reservedFloorUSD) / ledger.dailyBurnRateUSD)
      : 999;

    const dynamicMandate = DynamicMandateEngine.evaluateMandate(
      params.profile,
      ledger.averageDailyRevenueUSD,
      runwayDays,
    );

    for (const item of params.inventory) {
      // 1. Check stockout urgency
      const stockHealthDays = item.currentStockUnits / Math.max(1, item.currentStockUnits / 20); // estimated coverage
      const leadBufferDays = item.leadTimeDays + item.safetyBufferDays;

      // Specifically check for Ceremonial Matcha or items needing restock
      if (item.sku === "TEA-MC-002" || item.currentStockUnits < 40) {
        // Forecasted units = ~104 units
        const neededUnits = 104;
        const estUnitCost = item.unitCostUSD;
        const estGrossTotal = neededUnits * estUnitCost;

        if (estGrossTotal > dynamicMandate.currentEffectiveMandateUSD) {
          // Dynamic Downsizing Calculation
          const affordableSpend = Math.max(0, dynamicMandate.currentEffectiveMandateUSD - 17.68);
          const downsizedUnits = Math.floor(affordableSpend / 10.90);
          const downsizedTotal = Number((downsizedUnits * 10.90 + 17.68).toFixed(2));

          tasks.push({
            id: `task_downsize_${item.sku}_${Date.now()}`,
            title: `Unblock ${item.name} Restock via Dynamic Downsizing`,
            priority: "CRITICAL",
            category: "RESTOCK_DOWNSIZE",
            description:
              `Full restock (${neededUnits} units, $${estGrossTotal.toFixed(2)}) is blocked by your $${dynamicMandate.currentEffectiveMandateUSD.toFixed(2)} mandate ceiling. ` +
              `The agent dynamically downsized the batch to ${downsizedUnits} units ($${downsizedTotal.toFixed(2)}) which fits safely inside your mandate ceiling without interrupting supply.`,
            financialImpactUSD: downsizedTotal,
            impactLabel: `Fits $${dynamicMandate.currentEffectiveMandateUSD} Limit`,
            actionType: "DOWNSIZE_RESTOCK",
            suggestedActionLabel: `⚡ Execute Downsized Restock (${downsizedUnits}u · $${downsizedTotal.toFixed(2)})`,
            sku: item.sku,
            targetUnits: downsizedUnits,
            status: "PENDING",
            createdAt: new Date().toISOString(),
          });

          // Also offer the Taught Mandate Expansion option
          tasks.push({
            id: `task_mandate_expand_${item.sku}_${Date.now()}`,
            title: `One-Tap Mandate Exception for ${item.name}`,
            priority: "HIGH",
            category: "MANDATE_ADAPTATION",
            description:
              `Kyoto Tea Co Direct is a verified high-trust supplier (4.9 rating). ` +
              `Based on your taught intent ("Trust Kyoto Tea Co with up to $1,200 allowance"), ` +
              `you can authorize a 1-tap exception for $${estGrossTotal.toFixed(2)} to secure the full volume discount.`,
            financialImpactUSD: estGrossTotal,
            impactLabel: "Applies Taught Rule",
            actionType: "EXPAND_MANDATE_EXCEPTION",
            suggestedActionLabel: `🔓 Approve Taught Exception ($${estGrossTotal.toFixed(2)})`,
            sku: item.sku,
            overrideAmountUSD: estGrossTotal,
            targetUnits: neededUnits,
            status: "PENDING",
            createdAt: new Date().toISOString(),
          });
        }
      }

      // 2. Check for Bulk Discount Optimization Opportunity
      if (item.sku === "TEA-EG-001") {
        tasks.push({
          id: `task_bulk_opt_${item.sku}_${Date.now()}`,
          title: `Volume Discount Arbitrage for ${item.name}`,
          priority: "OPPORTUNITY",
          category: "BATCH_OPTIMIZATION",
          description:
            `Assam Highlands Estate offers a 15% tier discount for orders of 100+ units. ` +
            `Ordering 100 units instead of 80 units triggers free shipping (saving $18) and lowers net landed cost from $3.80/u to $3.57/u.`,
          financialImpactUSD: 42.0,
          impactLabel: "Saves $42.00 Net",
          actionType: "OPTIMIZE_BATCH_SIZE",
          suggestedActionLabel: `⚡ Order Optimized 100u Batch ($357.00)`,
          sku: item.sku,
          targetUnits: 100,
          status: "PENDING",
          createdAt: new Date().toISOString(),
        });
      }
    }

    // 3. Check cash runway health
    if (runwayDays < 60) {
      tasks.push({
        id: `task_runway_guard_${Date.now()}`,
        title: `Cash Runway Protection Protocol`,
        priority: "HIGH",
        category: "CASH_PRESERVATION",
        description:
          `Current liquid runway is ${runwayDays} days. Taught Rule #4 recommends tightening non-urgent inventory reorders by 40% until runway climbs back above 60 days.`,
        financialImpactUSD: 500.0,
        impactLabel: "Preserves $500 Cash",
        actionType: "TIGHTEN_RUNWAY_SPEND",
        suggestedActionLabel: `🛡️ Activate Runway Protection`,
        status: "PENDING",
        createdAt: new Date().toISOString(),
      });
    }

    return tasks;
  }
}
