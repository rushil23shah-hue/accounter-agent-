//payouts api: supplier payments (pays immediately, so Steward delays it itself)
import { z } from "zod";
import { PayPalClient } from "./client.js";

const PayoutResponseSchema = z.object({
  batch_header: z.object({ payout_batch_id: z.string(), batch_status: z.string() }),
});

export class PayPalPayouts {
  constructor(private readonly client: PayPalClient) {}

  /** batchId must be unique per payout (PayPal rejects duplicates, which protects against double-pay on retry). */
  public async sendPayout(params: { batchId: string; receiverEmail: string; amountUSD: number; note: string }) {
    const raw = await this.client.request(
      "POST",
      "/v1/payments/payouts",
      {
        sender_batch_header: { sender_batch_id: params.batchId, email_subject: "Payment from Steward" },
        items: [
          {
            recipient_type: "EMAIL",
            receiver: params.receiverEmail,
            amount: { value: params.amountUSD.toFixed(2), currency: "USD" },
            note: params.note,
            sender_item_id: params.batchId,
          },
        ],
      },
      params.batchId
    );
    const res = PayoutResponseSchema.parse(raw);
    return { payoutBatchId: res.batch_header.payout_batch_id, batchStatus: res.batch_header.batch_status };
  }
}
