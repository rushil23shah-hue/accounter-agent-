import { z } from "zod";

export const PayPalOrderIntentSchema = z.literal("AUTHORIZE");

export const PaymentStateSchema = z.enum([
  "INITIATED",
  "AUTHORIZED_HELD_IN_UNDO",
  "VOIDED_BY_USER",
  "CAPTURED",
  "BLOCKED_BY_POLICY",
  "FAILED",
]);
export type PaymentState = z.infer<typeof PaymentStateSchema>;

export const UndoHoldWindowSchema = z.object({
  windowSeconds: z.literal(60),
  holdExpiresAt: z.string().datetime(),
  isVoidable: z.boolean(),
});
export type UndoHoldWindow = z.infer<typeof UndoHoldWindowSchema>;

export const PayPalTransactionRecordSchema = z.object({
  transactionId: z.string().uuid(),
  paypalOrderId: z.string().min(1),
  authorizationId: z.string().nullable(),
  captureId: z.string().nullable(),
  status: PaymentStateSchema,
  amountUSD: z.number().positive(),
  payeeEmail: z.string().email(),
  undoWindow: UndoHoldWindowSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type PayPalTransactionRecord = z.infer<typeof PayPalTransactionRecordSchema>;