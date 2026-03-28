import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    // ── Links ──────────────────────────────────────────
    invoiceId: { type: String, required: true, index: true },
    userId:    { type: String, required: true, index: true },
    clientId:  { type: String, required: true },

    // ── Razorpay identifiers ───────────────────────────
    // razorpayOrderId   — created when freelancer clicks "Send Invoice"
    // razorpayPaymentId — filled by webhook after client pays
    // razorpaySignature — stored for audit; verified in webhook
    razorpayOrderId:   { type: String, default: null, index: true },
    razorpayPaymentId: { type: String, default: null, unique: true, sparse: true },
    razorpaySignature: { type: String, default: null },

    // Hosted checkout URL we send to the client
    // Built from key_id + order_id — no separate "payment link" API needed
    checkoutUrl: { type: String, default: null },

    // ── Amount ────────────────────────────────────────
    // Stored in MAJOR units (rupees, dollars — NOT paise/cents)
    amount:   { type: Number, required: true },
    currency: { type: String, required: true, uppercase: true },

    // ── Status ────────────────────────────────────────
    // pending   — Order created, client hasn't paid yet
    // succeeded — Razorpay webhook confirmed payment
    // failed    — Payment attempt failed
    // refunded  — Payment was refunded
    status: {
      type:    String,
      enum:    ["pending", "succeeded", "failed", "refunded"],
      default: "pending",
      index:   true,
    },

    // ── Timestamps ────────────────────────────────────
    paidAt:     { type: Date, default: null },
    refundedAt: { type: Date, default: null },

    // ── Razorpay event (for debugging/audit) ──────────
    // razorpayEventId is used for idempotency — Razorpay sends the
    // payment.captured event; we store razorpayPaymentId as the idempotency key
    razorpayEventId:   { type: String, default: null },
    razorpayEventType: { type: String, default: null },

    // ── Payment method details (from Razorpay) ────────
    paymentMethodType: { type: String, default: null }, // "card", "upi", "netbanking", "wallet"
    cardLast4:         { type: String, default: null },
    cardBrand:         { type: String, default: null }, // "Visa", "Mastercard" etc.
    upiId:             { type: String, default: null }, // filled for UPI payments
    bank:              { type: String, default: null }, // filled for netbanking

    // ── Refund tracking ────────────────────────────────
    razorpayRefundId: { type: String, default: null },
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
// razorpayPaymentId has unique:true + sparse:true above — acts as idempotency key

const Payment = mongoose.model("Payment", paymentSchema);
export default Payment;