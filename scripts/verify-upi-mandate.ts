#!/usr/bin/env node
import assert from "node:assert/strict";
import { UPIMandateEngine } from "../src/index.js";

console.log("══════════════════════════════════════════════════════════════════════════════");
console.log("   STEWARD 2.0: AGENTIC UPI AUTOPAY MANDATE PROTOCOL VERIFICATION             ");
console.log("   NPCI Compliance • Scannable QR • Asymmetric Ceiling • 1-Tap Revocation     ");
console.log("══════════════════════════════════════════════════════════════════════════════\n");

function runMandateTests() {
  // ── TEST 1: Default Mandate Initialization & NPCI Structure ───────────────
  console.log("▶ [Test 1] Validate Default NPCI Mandate Structure");
  const mandate = UPIMandateEngine.getMandate();

  assert.ok(mandate.umn.startsWith("UMN-IND-2026-"), "Must have cryptographic NPCI UMN prefix");
  assert.equal(mandate.agentVpa, "steward.autopilot@paypal", "Agent VPA must be steward.autopilot@paypal");
  assert.equal(mandate.status, "ACTIVE", "Default mandate must be ACTIVE");
  assert.equal(mandate.maxAmountINR, 15000, "Default single cap must be ₹15,000");
  assert.ok(mandate.maxAmountUSD > 150 && mandate.maxAmountUSD < 190, "Calculated USD cap must match FX rate");
  assert.ok(mandate.qrPayloadUri.startsWith("upi://mandate?"), "QR payload must be valid NPCI UPI intent URI");
  console.log(`  ✓ Validated UMN: ${mandate.umn} (Single Cap: ₹${mandate.maxAmountINR.toLocaleString("en-IN")})`);

  // ── TEST 2: Valid Order within Mandate Limits ──────────────────────────────
  console.log("\n▶ [Test 2] Payment Validation: Legitimate Order Under Single Cap");
  const validOrder = UPIMandateEngine.validatePayment({ amountUSD: 50 }); // ₹4,325 < ₹15,000
  assert.equal(validOrder.allowed, true, "Legitimate order must be allowed");
  assert.equal(validOrder.mandateStatus, "ACTIVE", "Status must be ACTIVE");
  console.log(`  ✓ Payment approved: ${validOrder.reason}`);

  // ── TEST 3: Asymmetric Invariant: Reject Order Exceeding Single Cap ────────
  console.log("\n▶ [Test 3] Asymmetric Limit Invariant: Reject Order Above ₹15,000 Cap");
  const inflatedOrder = UPIMandateEngine.validatePayment({ amountUSD: 250 }); // ₹21,625 > ₹15,000
  assert.equal(inflatedOrder.allowed, false, "Order exceeding cap must be blocked");
  assert.ok(inflatedOrder.reason.includes("breaches single-transaction mandate cap"), "Must state breach");
  console.log("  ✓ Asymmetric ceiling protected funds from exceeding authorized single mandate.");

  // ── TEST 4: 1-Tap NPCI Mandate Pause Kill-Switch ───────────────────────────
  console.log("\n▶ [Test 4] 1-Tap NPCI Mandate Pause Kill-Switch");
  const pausedMandate = UPIMandateEngine.pauseMandate();
  assert.equal(pausedMandate.status, "PAUSED", "Status must transition to PAUSED");

  const blockedWhilePaused = UPIMandateEngine.validatePayment({ amountUSD: 10 }); // Even $10 should fail!
  assert.equal(blockedWhilePaused.allowed, false, "All payments must be blocked while PAUSED");
  assert.ok(blockedWhilePaused.reason.includes("PAUSED"), "Must cite PAUSED status");
  console.log("  ✓ 1-Tap Pause successfully halted all autonomous transactions.");

  // Resume mandate
  UPIMandateEngine.resumeMandate();
  assert.equal(UPIMandateEngine.getMandate().status, "ACTIVE", "Status must resume to ACTIVE");
  console.log("  ✓ Mandate successfully resumed to ACTIVE.");

  // ── TEST 5: Asymmetric Limit Tightening ────────────────────────────────────
  console.log("\n▶ [Test 5] Dynamic Mandate Tightening Invariant");
  const tightened = UPIMandateEngine.tightenMandateCap(10000, "Cash runway contracted below 30 days");
  assert.equal(tightened.maxAmountINR, 10000, "Cap must contract to ₹10,000");

  // Attempt to loosen above owner cap should throw
  assert.throws(
    () => UPIMandateEngine.tightenMandateCap(25000, "Rogue AI attempting to increase limit"),
    /Asymmetric Limit Invariant violation/,
    "AI cannot increase limits above owner authorization"
  );
  console.log("  ✓ Invariant verified: AI can dynamically tighten limits downwards, but never loosen.");

  // ── TEST 6: SVG QR Code Generation ─────────────────────────────────────────
  console.log("\n▶ [Test 6] Scannable SVG QR Code Generation");
  const qrSvg = UPIMandateEngine.generateMandateQRCodeSVG(mandate.qrPayloadUri);
  assert.ok(qrSvg.startsWith("<svg"), "Must return valid SVG markup");
  assert.ok(qrSvg.includes("viewBox=\"0 0 250 250\""), "Must have standard viewBox");
  assert.ok(qrSvg.includes("rect"), "Must contain QR modules");
  console.log(`  ✓ Generated authentic ${qrSvg.length}-byte scannable SVG QR Code.`);

  console.log("\n══════════════════════════════════════════════════════════════════════════════");
  console.log("   🏆 ALL 6 AGENTIC UPI AUTOPAY MANDATE TESTS PASSED (100%)!                  ");
  console.log("══════════════════════════════════════════════════════════════════════════════\n");
}

runMandateTests();
