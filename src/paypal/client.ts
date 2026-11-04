//paypal rest client: oauth token caching, idempotent requests, typed errors
import crypto from "node:crypto";

export const PAYPAL_SANDBOX_URL = "https://api-m.sandbox.paypal.com";

export class PayPalApiError extends Error {
  constructor(public readonly status: number, public readonly debugId: string | null, message: string) {
    super(message);
    this.name = "PayPalApiError";
  }
}

export interface PayPalConfig {
  clientId: string;
  clientSecret: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  now?: () => number;
}

export class PayPalClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly now: () => number;
  private token: { value: string; expiresAt: number } | null = null;

  constructor(private readonly config: PayPalConfig) {
    this.baseUrl = config.baseUrl ?? PAYPAL_SANDBOX_URL;
    this.fetchImpl = config.fetchImpl ?? fetch;
    this.now = config.now ?? Date.now;
  }

  /** Reads PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET from the environment. Secrets are never hardcoded. */
  public static fromEnv(): PayPalClient {
    const clientId = process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw new Error("Missing PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET in environment.");
    }
    return new PayPalClient({ clientId, clientSecret });
  }

  private async getAccessToken(): Promise<string> {
    if (this.token && this.now() < this.token.expiresAt - 60_000) return this.token.value;
    const basic = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString("base64");
    const res = await this.fetchImpl(`${this.baseUrl}/v1/oauth2/token`, {
      method: "POST",
      headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: "grant_type=client_credentials",
    });
    if (!res.ok) throw new PayPalApiError(res.status, res.headers.get("paypal-debug-id"), "PayPal OAuth failed");
    const data = (await res.json()) as { access_token: string; expires_in: number };
    this.token = { value: data.access_token, expiresAt: this.now() + data.expires_in * 1000 };
    return this.token.value;
  }

  /** POSTs carry a PayPal-Request-Id (idempotency key). Pass the same id when retrying. */
  public async request(method: "GET" | "POST", path: string, body?: unknown, requestId?: string): Promise<unknown> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${await this.getAccessToken()}`,
      "Content-Type": "application/json",
    };
    if (method === "POST") headers["PayPal-Request-Id"] = requestId ?? crypto.randomUUID();
    const res = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    if (!res.ok) {
      throw new PayPalApiError(res.status, res.headers.get("paypal-debug-id"), `PayPal ${method} ${path} failed (${res.status}): ${text.slice(0, 300)}`);
    }
    return text ? JSON.parse(text) : null;
  }
}
