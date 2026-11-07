import { performance } from "node:perf_hooks";
import { BENCHMARK_CASES, BENCHMARK_WHITELIST } from "../src/benchmark/cases.js";
import { PreFlightPaymentShield, PreFlightScanRequest } from "../src/privacy/pre-flight-shield.js";

interface BenchmarkResult {
  caseId: string;
  name: string;
  category: "BENIGN" | "ADVERSARIAL";
  attackVector: string;
  expectedBlocked: boolean;
  actualBlocked: boolean;
  passed: boolean;
  latencyMs: number;
  threatsDetected: string[];
  notes: string;
}

console.log("\n================================================================================");
console.log(`STEWARD — ${BENCHMARK_CASES.length}-CASE ADVERSARIAL STRESS-TEST BENCHMARK`);
console.log("    Evaluating Pre-Flight Payment Security Shield against all known attack vectors");
console.log("================================================================================\n");

const results: BenchmarkResult[] = [];
let totalLatencyMs = 0;

for (const testCase of BENCHMARK_CASES) {
  const request: PreFlightScanRequest = {
    incomingInvoiceOrEmailText: testCase.invoiceMemo,
    proposedPayeeEmail: testCase.proposedPayeeEmail,
    proposedAmountUSD: testCase.proposedAmountUSD,
    expectedAmountUSD: testCase.expectedAmountUSD,
    sku: testCase.sku,
    units: testCase.units,
    whitelistedPayees: BENCHMARK_WHITELIST,
    sourceIdentifier: `benchmark_${testCase.id}`,
  };

  const start = performance.now();
  const verdict = PreFlightPaymentShield.inspect(request);
  const latency = performance.now() - start;
  totalLatencyMs += latency;

  const actualBlocked = !verdict.clearedForPayment;
  const passed = actualBlocked === testCase.expectedBlocked;

  results.push({
    caseId: testCase.id,
    name: testCase.name,
    category: testCase.category,
    attackVector: testCase.attackVector,
    expectedBlocked: testCase.expectedBlocked,
    actualBlocked,
    passed,
    latencyMs: Number(latency.toFixed(2)),
    threatsDetected: verdict.threatsDetected.map((t) => t.type),
    notes: testCase.notes,
  });

  const icon = passed ? "✅" : "❌";
  const outcome = actualBlocked ? "BLOCKED (Threat neutralized)" : "CLEARED (Passed gate)";
  console.log(`${icon} [${testCase.id}] ${testCase.name.padEnd(52)} ➔ ${outcome} (${latency.toFixed(2)}ms)`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Metrics Aggregation
// ─────────────────────────────────────────────────────────────────────────────
const totalCases = results.length;
const benignCases = results.filter((r) => r.category === "BENIGN");
const adversarialCases = results.filter((r) => r.category === "ADVERSARIAL");

const truePositives = adversarialCases.filter((r) => r.actualBlocked).length;
const falseNegatives = adversarialCases.filter((r) => !r.actualBlocked).length;
const trueNegatives = benignCases.filter((r) => !r.actualBlocked).length;
const falsePositives = benignCases.filter((r) => r.actualBlocked).length;

const attackBlockRate = (truePositives / adversarialCases.length) * 100;
const falsePositiveRate = (falsePositives / benignCases.length) * 100;
const avgLatencyMs = totalLatencyMs / totalCases;
const allPassed = results.every((r) => r.passed);

console.log("\n================================================================================");
console.log("📊 RED-TEAM EMPIRICAL SCORECARD");
console.log("================================================================================");
console.log(`Total Evaluated Cases       : ${totalCases} (${benignCases.length} Benign Controls, ${adversarialCases.length} Adversarial Attacks)`);
console.log(`Attacks Successfully Blocked: ${truePositives} / ${adversarialCases.length} (${attackBlockRate.toFixed(1)}%)`);
console.log(`False Positives (Nuisance)  : ${falsePositives} / ${benignCases.length} (${falsePositiveRate.toFixed(1)}%)`);
console.log(`Average Shield Gate Latency : ${avgLatencyMs.toFixed(2)} ms (Target: < 250 ms)`);
console.log("================================================================================");

// ─────────────────────────────────────────────────────────────────────────────
// Detailed Failure Breakdown (Shows exact vulnerabilities)
// ─────────────────────────────────────────────────────────────────────────────
const failedAttacks = results.filter((r) => r.category === "ADVERSARIAL" && !r.actualBlocked);

if (failedAttacks.length > 0) {
  console.log(`\n⚠️  RED-TEAM VULNERABILITY AUDIT: ${failedAttacks.length} ATTACKS BYPASSED THE SHIELD:\n`);
  failedAttacks.forEach((f, idx) => {
    console.log(`  ${idx + 1}. [${f.caseId}] ${f.name}`);
    console.log(`     Vector: ${f.attackVector}`);
    console.log(`     Reason: ${f.notes}`);
    console.log("");
  });
}

if (allPassed && attackBlockRate === 100 && falsePositiveRate === 0) {
  console.log("VERDICT: 100% GOLD-STANDARD PASS — ALL 65 ATTACKS & CONTROLS VALIDATED!\n");
} else {
  console.log("❌ VERDICT: SHIELD REQUIRES HARDENING TO COVER THE UNBLOCKED VECTORS.\n");
  process.exit(1);
}