import axios from "axios";
import stripe from "../config/stripe.js";
import Payment from "../models/payment.model.js";
import { publish } from "../config/rabbitmq.js";

// Currency → Stripe currency code (lowercase)
const CURRENCY_MAP = {
  USD: "usd", EUR: "eur", GBP: "gbp", CAD: "cad",
  AUD: "aud", INR: "inr", JPY: "jpy", SGD: "sgd", AED: "aed",
};

// ── POST /payments/create-link ────────────────────────────────────────────────
// Called by frontend when freelancer clicks "Send Invoice"
// Creates a Stripe Payment Link and stores it on the invoice
export const createPaymentLink = async (req, res, next) => {
  try {
    const { invoiceId, invoiceNumber, amount, currency, clientName, clientEmail } = req.body;

    // Check if a Payment Link already exists for this invoice
    const existing = await Payment.findOne({ invoiceId, status: "pending" });
    if (existing?.stripePaymentLinkUrl) {
      return res.json({
        success: true,
        message: "Payment link already exists",
        data: {
          paymentLinkUrl: existing.stripePaymentLinkUrl,
          paymentLinkId:  existing.stripePaymentLinkId,
        },
      });
    }

    const stripeCurrency = CURRENCY_MAP[currency?.toUpperCase()] || "usd";

    // ── Create Stripe Price object ─────────────────────
    // Stripe works in smallest currency unit — multiply by 100 for USD/EUR/GBP
    // Exception: JPY and a few others don't use decimals
    const zeroDecimalCurrencies = ["jpy", "krw", "vnd", "clp"];
    const unitAmount = zeroDecimalCurrencies.includes(stripeCurrency)
      ? Math.round(amount)
      : Math.round(amount * 100);

    // ── Create Stripe Payment Link ─────────────────────
    const paymentLink = await stripe.paymentLinks.create({
      line_items: [
        {
          price_data: {
            currency:     stripeCurrency,
            product_data: {
              name:        `Invoice ${invoiceNumber}`,
              description: `Payment to ${req.user?.name || "Freelancer"} via InvoiceHive`,
            },
            unit_amount: unitAmount,
          },
          quantity: 1,
        },
      ],
      // Store our IDs in Stripe metadata — we get them back in webhooks
      metadata: {
        invoiceId,
        userId:   req.userId,
        clientId: req.body.clientId || "",
      },
      // Pre-fill client email on Stripe checkout
      ...(clientEmail && {
        customer_creation: "always",
        automatic_tax:     { enabled: false },
      }),
      // Where to redirect after payment
      after_completion: {
        type:     "redirect",
        redirect: {
          url: `${process.env.CLIENT_URL}/pay/success?invoice=${invoiceId}`,
        },
      },
      // Collect billing address
      billing_address_collection: "auto",
    });

    // ── Save payment record ────────────────────────────
    const payment = await Payment.create({
      invoiceId,
      userId:   req.userId,
      clientId: req.body.clientId || "",
      stripePaymentLinkId:  paymentLink.id,
      stripePaymentLinkUrl: paymentLink.url,
      amount,
      currency: currency?.toUpperCase() || "USD",
      status:   "pending",
    });

    // ── Tell Invoice Service about the link ───────────
    // So it can embed the URL in the PDF and email
    await notifyInvoiceService(invoiceId, {
      stripePaymentLinkId:  paymentLink.id,
      stripePaymentLinkUrl: paymentLink.url,
    });

    res.status(201).json({
      success: true,
      message: "Payment link created",
      data: {
        paymentLinkUrl: paymentLink.url,
        paymentLinkId:  paymentLink.id,
        paymentId:      payment._id,
      },
    });
  } catch (err) {
    // Stripe errors have a specific shape
    if (err.type?.startsWith("Stripe")) {
      return res.status(400).json({
        success: false,
        message: `Stripe error: ${err.message}`,
        code:    err.code,
      });
    }
    next(err);
  }
};

// ── GET /payments ─────────────────────────────────────────────────────────────
export const listPayments = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, invoiceId } = req.query;

    const filter = { userId: req.userId };
    if (status)    filter.status    = status;
    if (invoiceId) filter.invoiceId = invoiceId;

    const skip  = (page - 1) * limit;
    const total = await Payment.countDocuments(filter);

    const payments = await Payment.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    res.json({
      success: true,
      data:    payments,
      pagination: {
        total,
        page:    Number(page),
        pages:   Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /payments/stats ───────────────────────────────────────────────────────
export const getPaymentStats = async (req, res, next) => {
  try {
    const [stats] = await Payment.aggregate([
      { $match: { userId: req.userId } },
      {
        $group: {
          _id:           null,
          totalReceived: { $sum: { $cond: [{ $eq: ["$status", "succeeded"] }, "$amount", 0] } },
          totalPending:  { $sum: { $cond: [{ $eq: ["$status", "pending"]   }, "$amount", 0] } },
          countSucceeded: { $sum: { $cond: [{ $eq: ["$status", "succeeded"] }, 1, 0] } },
          countPending:   { $sum: { $cond: [{ $eq: ["$status", "pending"]   }, 1, 0] } },
          countFailed:    { $sum: { $cond: [{ $eq: ["$status", "failed"]    }, 1, 0] } },
        },
      },
    ]);

    res.json({
      success: true,
      data: stats || {
        totalReceived: 0, totalPending: 0,
        countSucceeded: 0, countPending: 0, countFailed: 0,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /payments/:invoiceId ──────────────────────────────────────────────────
export const getPaymentByInvoice = async (req, res, next) => {
  try {
    const payment = await Payment.findOne({
      invoiceId: req.params.invoiceId,
      userId:    req.userId,
    }).lean();

    if (!payment) {
      return res.status(404).json({ success: false, message: "No payment found for this invoice" });
    }

    res.json({ success: true, data: payment });
  } catch (err) {
    next(err);
  }
};

// ── POST /payments/:paymentId/refund ──────────────────────────────────────────
export const refundPayment = async (req, res, next) => {
  try {
    const payment = await Payment.findOne({
      _id:    req.params.paymentId,
      userId: req.userId,
    });

    if (!payment) {
      return res.status(404).json({ success: false, message: "Payment not found" });
    }

    if (payment.status !== "succeeded") {
      return res.status(400).json({
        success: false,
        message: `Cannot refund a payment with status: ${payment.status}`,
      });
    }

    if (!payment.stripePaymentIntentId) {
      return res.status(400).json({
        success: false,
        message: "No Stripe payment intent found — cannot refund",
      });
    }

    // Create Stripe refund
    const refund = await stripe.refunds.create({
      payment_intent: payment.stripePaymentIntentId,
      reason:         req.body.reason || "requested_by_customer",
    });

    // Update payment record
    payment.status     = "refunded";
    payment.refundedAt = new Date();
    await payment.save();

    // Publish refund event
    await publish("payment.refunded", {
      invoiceId: payment.invoiceId,
      userId:    payment.userId,
      amount:    payment.amount,
      currency:  payment.currency,
      refundId:  refund.id,
    });

    res.json({ success: true, message: "Refund processed", data: { refundId: refund.id } });
  } catch (err) {
    if (err.type?.startsWith("Stripe")) {
      return res.status(400).json({ success: false, message: `Stripe error: ${err.message}` });
    }
    next(err);
  }
};

// ── Helper: notify invoice service of payment link ────────────────────────────
const notifyInvoiceService = async (invoiceId, linkData) => {
  try {
    await axios.post(
      `${process.env.INVOICE_SERVICE_URL}/invoices/internal/${invoiceId}/payment-link`,
      linkData,
      {
        headers: { "x-internal-secret": process.env.INTERNAL_SECRET },
        timeout: 3000,
      }
    );
  } catch (err) {
    console.warn("Could not update invoice with payment link:", err.message);
  }
};