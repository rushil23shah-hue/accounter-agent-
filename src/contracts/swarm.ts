import { z } from "zod";

export const SwarmAgentRoleSchema = z.enum([
  "CEO_ORCHESTRATOR",
  "INVENTORY_OFFICER",
  "ARBITRAGE_HUNTER",
  "SECURITY_AUDITOR",
  "VIRTUAL_CFO",
]);
export type SwarmAgentRole = z.infer<typeof SwarmAgentRoleSchema>;

export const DagTaskStatusSchema = z.enum([
  "PENDING",
  "IN_PROGRESS",
  "COMPLETED",
  "BLOCKED",
  "FAILED",
  "ROLLED_BACK",
]);
export type DagTaskStatus = z.infer<typeof DagTaskStatusSchema>;

export const DagTaskNodeSchema = z.object({
  id: z.string(),
  title: z.string(),
  assignedAgent: SwarmAgentRoleSchema,
  dependencies: z.array(z.string()), // Task IDs that must complete first
  status: DagTaskStatusSchema,
  actionType: z.enum([
    "AUDIT_INVENTORY",
    "SCOUT_PRICES",
    "NEGOTIATE_DEAL",
    "SHIELD_SECURITY_SCAN",
    "EVALUATE_MANDATE",
    "PAYPAL_HOLD_LOCK",
    "RECORD_AUDIT_MEMORY",
  ]),
  payload: z.record(z.string(), z.any()).optional(),
  result: z.record(z.string(), z.any()).optional(),
  executionTimeMs: z.number().nonnegative().optional(),
  error: z.string().optional(),
});
export type DagTaskNode = z.infer<typeof DagTaskNodeSchema>;

export const DagPlanSchema = z.object({
  planId: z.string(),
  goal: z.string(),
  createdAt: z.string().datetime(),
  nodes: z.array(DagTaskNodeSchema),
  totalExecutionTimeMs: z.number().nonnegative().optional(),
  isCompleted: z.boolean(),
  status: z.enum(["PLANNED", "EXECUTING", "SUCCESS", "FAILED_ROLLED_BACK"]),
});
export type DagPlan = z.infer<typeof DagPlanSchema>;

export const SwarmMessageSchema = z.object({
  messageId: z.string(),
  sender: SwarmAgentRoleSchema,
  recipient: z.union([SwarmAgentRoleSchema, z.literal("BROADCAST")]),
  intent: z.string(),
  payload: z.record(z.string(), z.any()),
  timestamp: z.string().datetime(),
});
export type SwarmMessage = z.infer<typeof SwarmMessageSchema>;

export const SimulationDayEventSchema = z.object({
  dayIndex: z.number().int().min(1).max(5),
  dayName: z.enum(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]),
  headline: z.string(),
  businessScenario: z.string(),
  agentsInvolved: z.array(SwarmAgentRoleSchema),
  actionsTaken: z.array(z.string()),
  capitalSpentUSD: z.number().nonnegative(),
  capitalSavedUSD: z.number().nonnegative(),
  threatsNeutralized: z.number().int().nonnegative(),
  paypalOrdersCreated: z.array(z.string()),
  mandateAdjustment: z.string().optional(),
  runwayRemainingDays: z.number().nonnegative(),
  status: z.enum(["SUCCESSFUL_AUTONOMOUS_OPERATIONS", "ATTACK_INTERCEPTED", "PRICE_SNIPED", "BUDGET_CONTRACTED"]),
  timestamp: z.string().datetime(),
});
export type SimulationDayEvent = z.infer<typeof SimulationDayEventSchema>;

export const Simulation5DayResultSchema = z.object({
  simulationId: z.string(),
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime(),
  totalDaysCompleted: z.number().int().min(1).max(5),
  days: z.array(SimulationDayEventSchema),
  cumulativeCapitalSpentUSD: z.number().nonnegative(),
  cumulativeArbitrageSavingsUSD: z.number().nonnegative(),
  totalThreatsBlocked: z.number().int().nonnegative(),
  finalRunwayDays: z.number().nonnegative(),
  weeklyExecutiveBrief: z.string(),
  courtReadyDossierHash: z.string(),
});
export type Simulation5DayResult = z.infer<typeof Simulation5DayResultSchema>;
