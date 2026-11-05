// Live PayPal SANDBOX smoke test. Uses real HTTP with your PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET.
// Usage: npm run live:m3            (auth + order + authorize + void)
//        npm run live:m3 -- --capture   (capture instead of void)
//        npm run live:m3 -- --payout    (also try the Payouts API)
import readline from "node:readline/promises";
import { PayPalClient, PayPalApiError, PayPalOrders, PayPalPayouts } from "../src/paypal/index.js";

const args = new Set(process.argv.slice(2));
const client = PayPalClient.fromEnv(); // sandbox base URL by default
const orders = new PayPalOrders(client);
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

const step = (s: string) => console.log(`\n=== ${s}`);
const fail = (e: unknown): never => {
  if (e instanceof PayPalApiError) console.error(`❌ HTTP ${e.status} (paypal-debug-id: ${e.debugId})\n${e.message}`);
  else console.error("❌", e);
  process.exit(1);
};

try {
  if (args.has("--payout-only")) {
    step("Payout only (no browser/buyer approval needed)");
    const to = process.env.PAYPAL_PAYOUT_TO;
    if (!to) throw new Error("Set PAYPAL_PAYOUT_TO to a sandbox account email.");
    console.log("✅ payout", await new PayPalPayouts(client).sendPayout({ batchId: `live-${Date.now()}`, receiverEmail: to, amountUSD: 1, note: "sandbox test" }));
    rl.close();
    process.exit(0);
  }
  step("1. OAuth + create AUTHORIZE order");
  // Optional: if unset, PayPal pays the app's default sandbox business account.
  const payee = process.env.PAYPAL_PAYEE_EMAIL || undefined;
  const order = await orders.createOrder(5, payee);
  console.log("✅ order", order.orderId, order.status);
  console.log("\nOpen this URL, log in with a sandbox PERSONAL (buyer) account, and approve:\n" + order.approveUrl);
  await rl.question("\nPress Enter once approved... ");

  step("2. Authorize");
  const auth = await orders.authorizeOrder(order.orderId);
  console.log("✅ authorization", auth.authorizationId, auth.status);

  if (args.has("--capture")) {
    step("3. Capture");
    console.log("✅ capture", await orders.captureAuthorization(auth.authorizationId));
  } else {
    step("3. Void (undo path)");
    await orders.voidAuthorization(auth.authorizationId);
    console.log("✅ voided");
  }

  if (args.has("--payout")) {
    step("4. Payout");
    const to = process.env.PAYPAL_PAYOUT_TO ?? payee;
    if (!to) throw new Error("Set PAYPAL_PAYOUT_TO to a sandbox account email for --payout.");
    console.log("✅ payout", await new PayPalPayouts(client).sendPayout({ batchId: `live-${Date.now()}`, receiverEmail: to, amountUSD: 1, note: "sandbox test" }));
  }
  console.log("\nALL LIVE STEPS PASSED");
} catch (e) {
  fail(e);
} finally {
  rl.close();
}