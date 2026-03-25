import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    // ── Links ──────────────────────────────────────────
    invoiceId: { type: String, required: true, index: true },
    userId:    { type: String, required: true, index: true },
    clientId:  { type: String, required: true },

    // ── Stripe identifiers ─────────────────────────────
    stripePaymentLinkId:   { type: String, default: null },
    stripePaymentLinkUrl:  { type: String, default: null },
    stripePaymentIntentId: { type: String, default: null, unique: true, sparse: true },
    stripeSessionId:       { type: String, default: null },

    // ── Amount ────────────────────────────────────────
    amount:   { type: Number, required: true }, // in major units (dollars not cents)
    currency: { type: String, required: true, uppercase: true },

    // ── Status ────────────────────────────────────────
    // pending   — Payment Link created, client hasn't paid yet
    // succeeded — Stripe webhook confirmed payment
    // failed    — Payment attempt failed
    // refunded  — Payment was refunded
    status: {
      type:    String,
      enum:    ["pending", "succeeded", "failed", "refunded"],
      default: "pending",
      index:   true,
    },

    // ── Timestamps from Stripe ─────────────────────────
    paidAt:     { type: Date, default: null },
    refundedAt: { type: Date, default: null },

    // ── Raw Stripe event (for debugging/audit) ─────────
    // Store the last relevant Stripe event payload
    stripeEventId:   { type: String, default: null }, // For idempotency check
    stripeEventType: { type: String, default: null },

    // ── Payment method details (from Stripe) ──────────
    paymentMethodType: { type: String, default: null }, // "card", "bank_transfer" etc.
    cardLast4:         { type: String, default: null },
    cardBrand:         { type: String, default: null }, // "visa", "mastercard" etc.
  },
  {
    timestamps: true,
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Compound indexes ──────────────────────────────────────────────────────────
paymentSchema.index({ userId: 1, createdAt: -1 });
paymentSchema.index({ invoiceId: 1, status: 1 });
paymentSchema.index({ stripeEventId: 1 }, { unique: true, sparse: true }); // Idempotency

const Payment = mongoose.model("Payment", paymentSchema);
export default Payment;