import {
  PayPalClient,
  PayPalApiError,
  PayPalOrders,
  PayPalPayouts,
  UndoWindow,
  PayPalWebhookListener,
  mapEventToPaymentState,
} from "../src/paypal/index.js";

console.log("Verifying Milestone 3 PayPal Sandbox Integration (mocked HTTP, no network)...\n");
const check = (ok: boolean, msg: string) => {
  if (!ok) throw new Error(`❌ ${msg}`);
  console.log(`✅ ${msg}`);
};

// ---- mock PayPal ----
type Call = { method: string; path: string; headers: Record<string, string>; body: any };
const calls: Call[] = [];
let verifyStatus = "SUCCESS";
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json" } });
const mockFetch = (async (url: string, init: RequestInit) => {
  const path = new URL(url).pathname;
  const headers = init.headers as Record<string, string>;
  const body = init.body && path !== "/v1/oauth2/token" ? JSON.parse(init.body as string) : init.body;
  calls.push({ method: init.method ?? "GET", path, headers, body });
  if (path === "/v1/oauth2/token") return json({ access_token: "tok-123", expires_in: 32400 });
  if (path === "/v2/checkout/orders") return json({ id: "ORD-1", status: "CREATED", links: [{ rel: "payer-action", href: "https://sandbox.paypal.com/approve?token=ORD-1" }] }, 201);
  if (path === "/v2/checkout/orders/ORD-1/authorize") return json({ id: "ORD-1", status: "COMPLETED", purchase_units: [{ payments: { authorizations: [{ id: "AUTH-1", status: "CREATED" }] } }] }, 201);
  if (path === "/v2/payments/authorizations/AUTH-1/capture") return json({ id: "CAP-1", status: "COMPLETED" }, 201);
  if (path === "/v2/payments/authorizations/AUTH-1/void") return new Response(null, { status: 204 });
  if (path === "/v1/payments/payouts") return json({ batch_header: { payout_batch_id: "PB-1", batch_status: "PENDING" } }, 201);
  if (path === "/v1/notifications/verify-webhook-signature") return json({ verification_status: verifyStatus });
  if (path === "/v2/payments/authorizations/BAD/capture") return json({ name: "RESOURCE_NOT_FOUND" }, 404);
  return json({}, 500);
}) as unknown as typeof fetch;

const client = new PayPalClient({ clientId: "id", clientSecret: "secret", fetchImpl: mockFetch });
const orders = new PayPalOrders(client);
const payouts = new PayPalPayouts(client);

// 1. Orders v2
const order = await orders.createOrder(450, "supplier-assam@example.com");
const createCall = calls.find((c) => c.path === "/v2/checkout/orders")!;
check(createCall.body.intent === "AUTHORIZE" && createCall.body.purchase_units[0].amount.value === "450.00", "1a. Order created with intent AUTHORIZE and amount '450.00'");
check(createCall.body.purchase_units[0].payee.email_address === "supplier-assam@example.com", "1b. Payee email set on the order");
check(order.approveUrl?.includes("approve") === true, "1c. Buyer approval URL extracted");
check(!!createCall.headers["PayPal-Request-Id"] && createCall.headers.Authorization === "Bearer tok-123", "1d. POST carries idempotency key + bearer token");
const auth = await orders.authorizeOrder(order.orderId);
check(auth.authorizationId === "AUTH-1", "1e. Authorization id parsed");
const cap = await orders.captureAuthorization("AUTH-1");
check(cap.captureId === "CAP-1" && calls.at(-1)!.body.final_capture === true, "1f. Capture returns capture id (final_capture true)");
await orders.voidAuthorization("AUTH-1");
check(calls.at(-1)!.path.endsWith("/void"), "1g. Void handles 204 empty response");
check(calls.filter((c) => c.path === "/v1/oauth2/token").length === 1, "1h. OAuth token fetched once and cached");
let apiErr: unknown;
try { await orders.captureAuthorization("BAD"); } catch (e) { apiErr = e; }
check(apiErr instanceof PayPalApiError && (apiErr as PayPalApiError).status === 404, "1i. API failure surfaces as PayPalApiError with status");

// 2. Payouts
const payout = await payouts.sendPayout({ batchId: "steward-001", receiverEmail: "supplier-assam@example.com", amountUSD: 450, note: "Reorder" });
const pc = calls.find((c) => c.path === "/v1/payments/payouts")!;
check(payout.payoutBatchId === "PB-1" && pc.body.items[0].amount.value === "450.00" && pc.headers["PayPal-Request-Id"] === "steward-001", "2. Payout sent with unique batch id as idempotency key");

// 3. Undo window (fake timers)
let fire: (() => void) | null = null;
const fakeTimers = { set: (fn: () => void) => { fire = fn; return 1; }, clear: () => { fire = null; } };
const win = new UndoWindow(fakeTimers);
let captured = 0, voided = 0;
const hold = win.start("AUTH-1", async () => { captured++; });
check(hold.windowSeconds === 60 && hold.isVoidable, "3a. Undo hold opened (60s, voidable)");
check(await win.cancel("AUTH-1", async () => { voided++; }) === true && voided === 1 && captured === 0, "3b. Cancel inside window voids and does NOT capture");
win.start("AUTH-2", async () => { captured++; });
(fire as unknown as () => void)();
check(captured === 1, "3c. Window expiry runs capture");
check(await win.cancel("AUTH-2", async () => { voided++; }) === false && voided === 1, "3d. Cancel after expiry is refused (no void)");

// 4. Webhook listener (real local http server, mocked PayPal verification)
const received: string[] = [];
const listener = new PayPalWebhookListener(client, "WH-1", (e) => { received.push(e.event_type); });
const srv = await listener.start(0);
const post = (event: object) => fetch(`http://127.0.0.1:${srv.port}/webhooks/paypal`, { method: "POST", headers: { "paypal-transmission-id": "t1", "paypal-auth-algo": "a", "paypal-cert-url": "c", "paypal-transmission-sig": "s", "paypal-transmission-time": "now" }, body: JSON.stringify(event) });
const ev = { id: "EVT-1", event_type: "PAYMENT.CAPTURE.COMPLETED", resource: {} };
check((await post(ev)).status === 200 && received.length === 1, "4a. Verified event accepted and handled");
check((await post(ev)).status === 200 && received.length === 1, "4b. Duplicate event id not processed twice");
verifyStatus = "FAILURE";
check((await post({ ...ev, id: "EVT-2" })).status === 400 && received.length === 1, "4c. Failed signature -> 400, handler not called");
verifyStatus = "SUCCESS";
check((await fetch(`http://127.0.0.1:${srv.port}/webhooks/paypal`, { method: "POST", body: "not json" })).status === 400, "4d. Malformed body -> 400");
await srv.close();
check(mapEventToPaymentState("PAYMENT.AUTHORIZATION.VOIDED") === "VOIDED_BY_USER" && mapEventToPaymentState("PAYMENT.CAPTURE.COMPLETED") === "CAPTURED" && mapEventToPaymentState("SOMETHING.ELSE") === null, "4e. Events map to PaymentState (unknown -> null)");

console.log("\nALL MILESTONE 3 CHECKS PASSED (mocked). Live sandbox still needs to be tested with your credentials.");
