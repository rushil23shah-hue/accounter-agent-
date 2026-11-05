//orders v2 (intent AUTHORIZE) + payments v2 (capture / void)
import { z } from "zod";
import { PayPalClient } from "./client.js";

const OrderResponseSchema = z.object({
  id: z.string(),
  status: z.string(),
  links: z.array(z.object({ rel: z.string(), href: z.string() })).optional(),
});

const AuthorizeResponseSchema = z.object({
  id: z.string(),
  status: z.string(),
  purchase_units: z.array(
    z.object({ payments: z.object({ authorizations: z.array(z.object({ id: z.string(), status: z.string() })).min(1) }) })
  ).min(1),
});

const CaptureResponseSchema = z.object({ id: z.string(), status: z.string() });

export class PayPalOrders {
  constructor(private readonly client: PayPalClient) {}

  /** Creates an AUTHORIZE order. The buyer must approve at approveUrl before authorizeOrder can succeed. */
  public async createOrder(amountUSD: number, payeeEmail?: string, requestId?: string) {
    const raw = await this.client.request(
      "POST",
      "/v2/checkout/orders",
      {
        intent: "AUTHORIZE",
        payment_source: {
          paypal: {
            experience_context: {
              return_url: "https://example.com/return",
              cancel_url: "https://example.com/cancel",
              user_action: "CONTINUE",
            },
          },
        },
        purchase_units: [
          {
            amount: { currency_code: "USD", value: amountUSD.toFixed(2) },
            ...(payeeEmail ? { payee: { email_address: payeeEmail } } : {}),
          },
        ],
      },
      requestId
    );
    const order = OrderResponseSchema.parse(raw);
    const approveUrl = order.links?.find((l) => l.rel === "payer-action" || l.rel === "approve")?.href ?? null;
    return { orderId: order.id, status: order.status, approveUrl };
  }

  public async authorizeOrder(orderId: string, requestId?: string) {
    const raw = await this.client.request("POST", `/v2/checkout/orders/${orderId}/authorize`, {}, requestId);
    const res = AuthorizeResponseSchema.parse(raw);
    const auth = res.purchase_units[0].payments.authorizations[0];
    return { authorizationId: auth.id, status: auth.status };
  }

  public async captureAuthorization(authorizationId: string, requestId?: string) {
    const raw = await this.client.request("POST", `/v2/payments/authorizations/${authorizationId}/capture`, { final_capture: true }, requestId);
    const res = CaptureResponseSchema.parse(raw);
    return { captureId: res.id, status: res.status };
  }

  /** Releases the held funds. PayPal returns 204 with no body. */
  public async voidAuthorization(authorizationId: string, requestId?: string): Promise<void> {
    await this.client.request("POST", `/v2/payments/authorizations/${authorizationId}/void`, undefined, requestId);
  }
}