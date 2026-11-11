import { z } from "zod";

export const DeliveryAddressSchema = z.object({
  recipientName: z.string().default("Rushil Shah"),
  phone: z.string().default("+91 98765 43210"),
  street: z.string().default("Flat 402, Skyline Residency, 100ft Road, Indiranagar"),
  city: z.string().default("Bengaluru"),
  state: z.string().default("Karnataka"),
  postalCode: z.string().default("560038"),
  landmark: z.string().default("Near Metro Station"),
});
export type DeliveryAddress = z.infer<typeof DeliveryAddressSchema>;

export const TrackingMilestoneSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  timestamp: z.string(),
  completed: z.boolean(),
});
export type TrackingMilestone = z.infer<typeof TrackingMilestoneSchema>;

export const AutonomousOrderStatusSchema = z.enum([
  "PLACED",
  "PACKED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
]);
export type AutonomousOrderStatus = z.infer<typeof AutonomousOrderStatusSchema>;

export const AutonomousOrderSchema = z.object({
  orderId: z.string(),
  originalPrompt: z.string(),
  productName: z.string(),
  brand: z.string(),
  quantity: stringOrNumber(),
  unitsCount: z.number(),
  platform: z.string(),
  platformLogoUrl: z.string().optional(),
  unitPriceINR: z.number(),
  unitPriceUSD: z.number(),
  totalPriceINR: z.number(),
  totalPriceUSD: z.number(),
  arbitrageSavingsINR: z.number(),
  arbitrageSavingsUSD: z.number(),
  crossWebComparisonSummary: z.string(),
  deliveryAddress: DeliveryAddressSchema,
  riderInfo: z.object({
    name: z.string(),
    vehicle: z.string(),
    phone: z.string(),
    deliveryPin: z.string(),
  }),
  status: AutonomousOrderStatusSchema,
  initialEtaMinutes: z.number(),
  remainingMinutes: z.number(),
  distanceKm: z.number(),
  createdAt: z.string(),
  deliveredAt: z.string().optional(),
  paypalOrderId: z.string(),
  paypalPaymentStatus: z.string(),
  undoWindowExpiresAt: z.string(),
  canCancel: z.boolean(),
  milestones: z.array(TrackingMilestoneSchema),
  auditDossierHash: z.string(),
  aiRationale: z.string(),
});
export type AutonomousOrder = z.infer<typeof AutonomousOrderSchema>;

function stringOrNumber() {
  return z.union([z.string(), z.number()]).transform((val) => String(val));
}
