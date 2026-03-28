import axios from "axios";
import razorpay from "../config/razorpay.js";
import Payment from "../models/payment.model.js";
import { publish } from "../config/rabbitmq.js";

// Currency → ISO code (uppercase) — Razorpay supports these natively
// Full list: https://razorpay.com/docs/payments/payments/international/
const SUPPORTED_CURRENCIES = new Set([
  "INR", "USD", "EUR", "GBP", "SGD", "AED", "AUD", "CAD", "JPY",
]);

// Razorpay amounts are always in smallest unit (paise for INR, cents for USD…)
// Exception: JPY has no decimals
const ZERO_DECIMAL_CURRENCIES = new Set(["JPY", "KRW", "VND"]);

const toSmallestUnit = (amount, currency) =>
  ZERO_DECIMAL_CURRENCIES.has(currency.toUpperCase())
    ? Math.round(amount)
    : Math.round(amount * 100);

// ── POST /payments/create-order ───────────────────────────────────────────────
// Called by frontend when freelancer clicks "Send Invoice"
// Creates a Razorpay Order and returns a hosted checkout URL
export const createPaymentOrder = async (req, res, next) => {
  try {
    const {
      invoiceId, invoiceNumber, amount, currency = "INR",
      clientName, clientEmail, clientId,
    } = req.body;

    const upperCurrency = currency.toUpperCase();
     


    if (typeof amount !== 'number' || amount <= 0) {
  return res.status(400).json({ success: false, message: "Invalid amount" });
}

    if (!SUPPORTED_CURRENCIES.has(upperCurrency)) {
      return res.status(400).json({
        success: false,
        message: `Currency ${upperCurrency} is not supported. Supported: ${[...SUPPORTED_CURRENCIES].join(", ")}`,
      });
    }

    // Return existing pending order — avoids duplicate charges
    const existing = await Payment.findOne({ invoiceId, status: "pending" });
    if (existing?.checkoutUrl) {
      return res.json({
        success: true,
        message: "Order already exists",
        data: {
          checkoutUrl:     existing.checkoutUrl,
          razorpayOrderId: existing.razorpayOrderId,
          paymentId:       existing._id,
        },
      });
    }

    // ── Create Razorpay Order ──────────────────────────
    // amount must be in paise (or smallest unit of currency)
    const order = await razorpay.orders.create({
      amount:   toSmallestUnit(amount, upperCurrency),
      currency: upperCurrency,
      receipt:  invoiceId,                    // echoed back in webhooks — useful for matching
      notes: {
        invoiceId,
        invoiceNumber,
        userId:   req.userId,
        clientId: clientId || "",
        clientName:  clientName  || "",
        clientEmail: clientEmail || "",
      },
    });

    // ── Build hosted Razorpay checkout URL ─────────────
    // Razorpay doesn't have a "Payment Links" API like razorpay for orders,
    // but it does have a Payment Links product — we use that here so the
    // client can pay via a simple URL without any frontend SDK.
    // Alternatively, if you want the JS checkout, return orderId + key to frontend.
    const paymentLink = await razorpay.paymentLink.create({
      amount:      toSmallestUnit(amount, upperCurrency),
      currency:    upperCurrency,
      description: `Invoice ${invoiceNumber}`,
      reference_id: invoiceId,               // idempotency key on Razorpay side
      customer: {
        name:  clientName  || "Client",
        email: clientEmail || undefined,
      },
      notify: {
        email: !!clientEmail,
        sms:   false,
      },
      reminder_enable: true,
      notes: {
        invoiceId,
        userId:   req.userId,
        clientId: clientId || "",
      },
      callback_url:    `${process.env.CLIENT_URL}/pay/success?invoice=${invoiceId}`,
      callback_method: "get",
    });

    // ── Persist payment record ─────────────────────────
    const payment = await Payment.create({
      invoiceId,
      userId:    req.userId,
      clientId:  clientId || "",
      razorpayOrderId: order.id,
      checkoutUrl:     paymentLink.short_url,  // e.g. https://rzp.io/i/xxxx
      amount,
      currency:  upperCurrency,
      status:    "pending",
    });

    // ── Tell Invoice Service about the checkout URL ────
    await notifyInvoiceService(invoiceId, {
      razorpayOrderId: order.id,
      checkoutUrl:     paymentLink.short_url,
    });

    res.status(201).json({
      success: true,
      message: "Payment order created",
      data: {
        checkoutUrl:     paymentLink.short_url,
        razorpayOrderId: order.id,
        paymentId:       payment._id,
        // Also expose key_id so frontend can launch Razorpay JS checkout if preferred
        razorpayKeyId:   process.env.RAZORPAY_KEY_ID,
      },
    });
  } catch (err) {
    // Razorpay SDK throws plain Error objects with err.error shape
    if (err.error) {
      return res.status(400).json({
        success: false,
        message: err.error.description || "Razorpay error",
        code:    err.error.code,
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

// ── GET /payments/invoice/:invoiceId ──────────────────────────────────────────
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

    if (!payment.razorpayPaymentId) {
      return res.status(400).json({
        success: false,
        message: "No Razorpay payment ID found — cannot refund",
      });
    }

    // ── Create Razorpay Refund ─────────────────────────
    // amount in paise; omitting it triggers a full refund
    const refund = await razorpay.payments.refund(payment.razorpayPaymentId, {
      speed: "normal",  // "normal" (3-5 days) or "optimum" (instant, higher fee)
      notes: { reason: req.body.reason || "requested_by_customer" },
    });

    payment.status          = "refunded";
    payment.refundedAt      = new Date();
    payment.razorpayRefundId = refund.id;
    await payment.save();

    await publish("payment.refunded", {
      invoiceId: payment.invoiceId,
      userId:    payment.userId,
      amount:    payment.amount,
      currency:  payment.currency,
      refundId:  refund.id,
    });

    res.json({ success: true, message: "Refund initiated", data: { refundId: refund.id } });
  } catch (err) {
    if (err.error) {
      return res.status(400).json({
        success: false,
        message: err.error.description || "Razorpay refund error",
        code:    err.error.code,
      });
    }
    next(err);
  }
};

// ── Helper: notify Invoice Service of checkout URL ────────────────────────────
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
    // Non-fatal — invoice service can be synced later
    console.warn("Could not update invoice with checkout URL:", err.message);
  }
};