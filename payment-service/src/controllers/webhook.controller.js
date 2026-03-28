import crypto from "crypto";
import axios from "axios";
import Payment from "../models/payment.model.js";
import { publish } from "../config/rabbitmq.js";

// ── POST /payments/webhook ────────────────────────────────────────────────────
// Razorpay sends ALL events here
//
// Razorpay webhook signature verification:
//   HMAC-SHA256(rawBody, RAZORPAY_WEBHOOK_SECRET)
//   compared against "x-razorpay-signature" header
//
// Unlike Stripe, Razorpay sends JSON (not raw buffer) — so express.json()
// is fine here. We use the raw body string for HMAC verification.
// See app.js — no special express.raw() needed for this route.

export const razorpayWebhook = async (req, res) => {
  const receivedSig = req.headers["x-razorpay-signature"];

  if (!receivedSig) {
    console.error("Webhook received without x-razorpay-signature header");
    return res.status(400).json({ error: "Missing x-razorpay-signature" });
  }

  // ── 1. Verify signature ────────────────────────────
  // Razorpay signs the raw JSON body string with your webhook secret
  const expectedSig = crypto
    .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(req.rawBody)           // raw body string — see app.js for how we capture it
    .digest("hex");

  const isValid = crypto.timingSafeEqual(
    Buffer.from(expectedSig, "hex"),
    Buffer.from(receivedSig,  "hex")
  );

  if (!isValid) {
    console.error("Webhook signature verification failed");
    return res.status(400).json({ error: "Invalid webhook signature" });
  }

  const event = req.body;
  console.log(`Razorpay webhook received: ${event.event} [${event.payload?.payment?.entity?.id || ""}]`);

  // ── 2. Idempotency check ───────────────────────────
  // Razorpay can retry events — use razorpayPaymentId as the idempotency key
  const paymentEntity = event.payload?.payment?.entity;
  const paymentId     = paymentEntity?.id;

  if (paymentId) {
    const alreadyProcessed = await Payment.findOne({ razorpayPaymentId: paymentId });
    if (alreadyProcessed && alreadyProcessed.status !== "pending") {
      console.log(`Event for payment ${paymentId} already processed — skipping`);
      return res.json({ received: true, status: "already_processed" });
    }
  }

  // ── 3. Route to handler ────────────────────────────
  try {
    switch (event.event) {
      case "payment.captured":
        await handlePaymentCaptured(event);
        break;

      case "payment.failed":
        await handlePaymentFailed(event);
        break;

      case "refund.processed":
        await handleRefundProcessed(event);
        break;

      case "payment_link.paid":
        // Payment Link paid event — the payment.captured event fires too,
        // so we just log this one to avoid double-processing
        console.log(`Payment link paid: ${event.payload?.payment_link?.entity?.id}`);
        break;

      default:
        console.log(`Unhandled Razorpay event: ${event.event}`);
    }

    // Always 200 quickly — Razorpay retries on non-2xx (up to 3 times over 24h)
    res.json({ received: true });
  } catch (err) {
    console.error(`Webhook handler error for ${event.event}:`, err.message);
    // 500 tells Razorpay to retry
    res.status(500).json({ error: "Webhook processing failed" });
  }
};

// ── Handler: payment.captured ─────────────────────────────────────────────────
// Fired when a payment is successfully authorized AND captured
const handlePaymentCaptured = async (event) => {
  const payment = event.payload.payment.entity;

  // Extract our IDs from Razorpay notes (set during order/payment-link creation)
  const { invoiceId, userId, clientId } = payment.notes || {};

  if (!invoiceId) {
    console.warn("payment.captured has no invoiceId in notes — skipping");
    return;
  }

  // ── Extract payment method details ────────────────
  const methodType = payment.method; // "card" | "upi" | "netbanking" | "wallet" | "emi"
  const cardDetails = payment.card;  // present only when method === "card"

  await Payment.findOneAndUpdate(
    { invoiceId },
    {
      $set: {
        status:            "succeeded",
        razorpayPaymentId: payment.id,
        razorpaySignature: null,          // signature verified in webhook; not in captured event
        razorpayEventType: event.event,
        paidAt:            new Date(payment.created_at * 1000),
        paymentMethodType: methodType || null,
        cardLast4:         cardDetails?.last4     || null,
        cardBrand:         cardDetails?.network   || null,  // "Visa", "MasterCard" etc.
        upiId:             payment.vpa            || null,  // VPA = UPI ID
        bank:              payment.bank           || null,
      },
    },
    { upsert: true, new: true }
  );

  console.log(`Payment captured for invoice ${invoiceId} — ${payment.currency} ${payment.amount / 100}`);

  // ── Notify Invoice Service ─────────────────────────
  await notifyInvoicePaid(invoiceId, {
    razorpayPaymentId: payment.id,
    amount:            payment.amount / 100,
  });

  // ── Publish invoice.paid event → Notification Service ─
  await publish("invoice.paid", {
    invoiceId,
    userId,
    clientId,
    amount:   payment.amount / 100,
    currency: payment.currency.toUpperCase(),
    method:   methodType || "razorpay",
    paidAt:   new Date(payment.created_at * 1000),
    cardLast4: cardDetails?.last4   || null,
    cardBrand: cardDetails?.network || null,
    upiId:     payment.vpa          || null,
  });
};

// ── Handler: payment.failed ───────────────────────────────────────────────────
const handlePaymentFailed = async (event) => {
  const payment = event.payload.payment.entity;
  const { invoiceId, userId } = payment.notes || {};

  if (!invoiceId) return;

  await Payment.findOneAndUpdate(
    { invoiceId },
    {
      $set: {
        status:            "failed",
        razorpayPaymentId: payment.id,
        razorpayEventType: event.event,
      },
    },
    { upsert: true }
  );

  const failureReason =
    payment.error_description ||
    payment.error_reason      ||
    "Unknown reason";

  console.log(`Payment failed for invoice ${invoiceId}: ${failureReason}`);

  await publish("payment.failed", {
    invoiceId,
    userId,
    failureReason,
  });
};

// ── Handler: refund.processed ─────────────────────────────────────────────────
const handleRefundProcessed = async (event) => {
  const refund = event.payload.refund.entity;

  await Payment.findOneAndUpdate(
    { razorpayPaymentId: refund.payment_id },
    {
      $set: {
        status:           "refunded",
        refundedAt:       new Date(),
        razorpayRefundId: refund.id,
        razorpayEventType: event.event,
      },
    }
  );

  console.log(`Refund processed: ${refund.id} for payment ${refund.payment_id}`);
};

// ── Helper: notify Invoice Service a payment came in ─────────────────────────
const notifyInvoicePaid = async (invoiceId, data) => {
  try {
    await axios.post(
      `${process.env.INVOICE_SERVICE_URL}/invoices/internal/${invoiceId}/razorpay-paid`,
      data,
      {
        headers: { "x-internal-secret": process.env.INTERNAL_SECRET },
        timeout: 5000,
      }
    );
  } catch (err) {
    // Non-fatal — payment IS recorded in our DB; invoice service can sync later
    console.error("Could not notify Invoice Service of payment:", err.message);
  }
};