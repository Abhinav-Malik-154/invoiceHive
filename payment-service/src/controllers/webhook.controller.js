import axios from "axios";
import stripe from "../config/stripe.js";
import Payment from "../models/payment.model.js";
import { publish } from "../config/rabbitmq.js";

// ── POST /payments/webhook ────────────────────────────────────────────────────
// Stripe sends ALL events here — we filter for the ones we care about
//
// CRITICAL: Express must receive the RAW body buffer here (not parsed JSON)
// That's why this route uses express.raw() — see app.js
// If you use express.json() on this route, signature verification WILL fail

export const stripeWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];

  if (!sig) {
    console.error("❌ Webhook received without stripe-signature header");
    return res.status(400).json({ error: "Missing stripe-signature" });
  }

  // ── 1. Verify the webhook signature ───────────────────
  // This confirms the event came from Stripe, not from someone faking it
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,                              // Raw buffer — NOT req.body parsed JSON
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("❌ Webhook signature verification failed:", err.message);
    // Return 400 — Stripe will retry if it gets a non-2xx response
    return res.status(400).json({ error: `Webhook signature failed: ${err.message}` });
  }

  console.log(`📨 Stripe webhook received: ${event.type} [${event.id}]`);

  // ── 2. Idempotency check ───────────────────────────────
  // Stripe can send the same event multiple times — we must handle it gracefully
  // Check if we already processed this event
  const alreadyProcessed = await Payment.findOne({ stripeEventId: event.id });
  if (alreadyProcessed) {
    console.log(`⏭️  Event ${event.id} already processed — skipping`);
    return res.json({ received: true, status: "already_processed" });
  }

  // ── 3. Route to correct handler ───────────────────────
  try {
    switch (event.type) {
      case "payment_intent.succeeded":
        await handlePaymentSucceeded(event);
        break;

      case "payment_intent.payment_failed":
        await handlePaymentFailed(event);
        break;

      case "charge.refunded":
        await handleChargeRefunded(event);
        break;

      case "payment_link.created":
        console.log(`📎 Payment link created: ${event.data.object.id}`);
        break;

      default:
        // Log unhandled events — useful for debugging
        console.log(`⏭️  Unhandled event type: ${event.type}`);
    }

    // Always return 200 quickly — Stripe retries if it times out (30s)
    res.json({ received: true });
  } catch (err) {
    console.error(`❌ Webhook handler error for ${event.type}:`, err.message);
    // Return 500 — Stripe will retry this event later
    res.status(500).json({ error: "Webhook processing failed" });
  }
};

// ── Handler: payment succeeded ────────────────────────────────────────────────
const handlePaymentSucceeded = async (event) => {
  const paymentIntent = event.data.object;

  // Extract our IDs from Stripe metadata
  const { invoiceId, userId, clientId } = paymentIntent.metadata;

  if (!invoiceId) {
    console.warn("payment_intent.succeeded has no invoiceId in metadata — skipping");
    return;
  }

  // Extract payment method details for our records
  const charges        = paymentIntent.charges?.data || [];
  const charge         = charges[0];
  const paymentMethod  = charge?.payment_method_details;
  const cardDetails    = paymentMethod?.card;

  // ── Update or create payment record ───────────────────
  await Payment.findOneAndUpdate(
    { invoiceId }, // Match by invoice
    {
      $set: {
        status:                "succeeded",
        stripePaymentIntentId: paymentIntent.id,
        stripeEventId:         event.id,
        stripeEventType:       event.type,
        paidAt:                new Date(paymentIntent.created * 1000),
        paymentMethodType:     paymentMethod?.type || null,
        cardLast4:             cardDetails?.last4 || null,
        cardBrand:             cardDetails?.brand || null,
        amount:                paymentIntent.amount_received / 100,
      },
    },
    { upsert: true, new: true } // Create if doesn't exist (edge case)
  );

  console.log(`✅ Payment succeeded for invoice ${invoiceId} — $${paymentIntent.amount_received / 100}`);

  // ── Tell Invoice Service to mark invoice as paid ───────
  await notifyInvoicePaid(invoiceId, {
    stripePaymentIntentId: paymentIntent.id,
    amount:                paymentIntent.amount_received / 100,
  });

  // ── Publish payment.succeeded event → Notification Service ─
  await publish("invoice.paid", {
    invoiceId,
    userId,
    clientId,
    amount:   paymentIntent.amount_received / 100,
    currency: paymentIntent.currency.toUpperCase(),
    method:   "stripe",
    paidAt:   new Date(paymentIntent.created * 1000),
    cardLast4: cardDetails?.last4 || null,
    cardBrand: cardDetails?.brand || null,
  });
};

// ── Handler: payment failed ───────────────────────────────────────────────────
const handlePaymentFailed = async (event) => {
  const paymentIntent = event.data.object;
  const { invoiceId, userId } = paymentIntent.metadata;

  if (!invoiceId) return;

  await Payment.findOneAndUpdate(
    { invoiceId },
    {
      $set: {
        status:          "failed",
        stripeEventId:   event.id,
        stripeEventType: event.type,
      },
    },
    { upsert: true }
  );

  const failureReason = paymentIntent.last_payment_error?.message || "Unknown reason";
  console.log(`❌ Payment failed for invoice ${invoiceId}: ${failureReason}`);

  // Notify freelancer that payment failed
  await publish("payment.failed", {
    invoiceId,
    userId,
    failureReason,
  });
};

// ── Handler: charge refunded ──────────────────────────────────────────────────
const handleChargeRefunded = async (event) => {
  const charge = event.data.object;

  await Payment.findOneAndUpdate(
    { stripePaymentIntentId: charge.payment_intent },
    {
      $set: {
        status:          "refunded",
        refundedAt:      new Date(),
        stripeEventId:   event.id,
        stripeEventType: event.type,
      },
    }
  );

  console.log(`↩️  Charge refunded: ${charge.id}`);
};

// ── Helper: tell Invoice Service a payment came in ────────────────────────────
const notifyInvoicePaid = async (invoiceId, data) => {
  try {
    await axios.post(
      `${process.env.INVOICE_SERVICE_URL}/invoices/internal/${invoiceId}/stripe-paid`,
      data,
      {
        headers: { "x-internal-secret": process.env.INTERNAL_SECRET },
        timeout: 5000,
      }
    );
  } catch (err) {
    // Log but don't throw — the payment IS recorded in our DB
    // Invoice Service can be synced later if needed
    console.error("❌ Could not notify Invoice Service of payment:", err.message);
  }
};