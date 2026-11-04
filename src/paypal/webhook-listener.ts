//webhook listener: verifies PayPal signatures, dedupes events, maps to PaymentState
import http from "node:http";
import { IncomingHttpHeaders } from "node:http";
import { PaymentState } from "../contracts/index.js";
import { PayPalClient } from "./client.js";

export interface PayPalWebhookEvent {
  id: string;
  event_type: string;
  resource: Record<string, unknown>;
}

const EVENT_STATE_MAP: Record<string, PaymentState> = {
  "PAYMENT.AUTHORIZATION.CREATED": "AUTHORIZED_HELD_IN_UNDO",
  "PAYMENT.AUTHORIZATION.VOIDED": "VOIDED_BY_USER",
  "PAYMENT.CAPTURE.COMPLETED": "CAPTURED",
  "PAYMENT.CAPTURE.DENIED": "FAILED",
  "PAYMENT.PAYOUTS-ITEM.SUCCEEDED": "CAPTURED",
  "PAYMENT.PAYOUTS-ITEM.FAILED": "FAILED",
  "PAYMENT.PAYOUTS-ITEM.DENIED": "FAILED",
  "PAYMENT.PAYOUTS-ITEM.BLOCKED": "FAILED",
};

export function mapEventToPaymentState(eventType: string): PaymentState | null {
  return EVENT_STATE_MAP[eventType] ?? null;
}

const header = (h: IncomingHttpHeaders, name: string): string => {
  const v = h[name];
  return Array.isArray(v) ? v[0] : v ?? "";
};

export class PayPalWebhookListener {
  private readonly seen = new Set<string>();

  constructor(
    private readonly client: PayPalClient,
    private readonly webhookId: string,
    private readonly onEvent: (event: PayPalWebhookEvent, state: PaymentState | null) => void | Promise<void>
  ) {}

  /** Asks PayPal to verify the signature. Any error counts as NOT verified. */
  public async verify(headers: IncomingHttpHeaders, event: PayPalWebhookEvent): Promise<boolean> {
    try {
      const res = (await this.client.request("POST", "/v1/notifications/verify-webhook-signature", {
        auth_algo: header(headers, "paypal-auth-algo"),
        cert_url: header(headers, "paypal-cert-url"),
        transmission_id: header(headers, "paypal-transmission-id"),
        transmission_sig: header(headers, "paypal-transmission-sig"),
        transmission_time: header(headers, "paypal-transmission-time"),
        webhook_id: this.webhookId,
        webhook_event: event,
      })) as { verification_status?: string };
      return res.verification_status === "SUCCESS";
    } catch {
      return false;
    }
  }

  public start(port: number): Promise<{ port: number; close: () => Promise<void> }> {
    const server = http.createServer((req, res) => {
      if (req.method !== "POST" || req.url !== "/webhooks/paypal") {
        res.writeHead(404).end();
        return;
      }
      const chunks: Buffer[] = [];
      let size = 0;
      req.on("data", (c: Buffer) => {
        size += c.length;
        if (size > 1_000_000) req.destroy();
        else chunks.push(c);
      });
      req.on("end", async () => {
        let event: PayPalWebhookEvent;
        try {
          event = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        } catch {
          res.writeHead(400).end();
          return;
        }
        if (!(await this.verify(req.headers, event))) {
          res.writeHead(400).end();
          return;
        }
        if (this.seen.has(event.id)) {
          res.writeHead(200).end();
          return;
        }
        try {
          await this.onEvent(event, mapEventToPaymentState(event.event_type));
          this.seen.add(event.id);
          res.writeHead(200).end();
        } catch {
          res.writeHead(500).end(); // PayPal retries on non-2xx
        }
      });
    });
    return new Promise((resolve) => {
      server.listen(port, () => {
        const addr = server.address() as { port: number };
        resolve({ port: addr.port, close: () => new Promise((r) => server.close(() => r())) });
      });
    });
  }
}
