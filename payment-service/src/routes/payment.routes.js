import { Router } from "express";
import {
  createPaymentOrder, listPayments, getPaymentByInvoice,
  getPaymentStats, refundPayment,
} from "../controllers/payment.controller.js";
import { razorpayWebhook } from "../controllers/webhook.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { validate, createPaymentOrderSchema, refundSchema } from "../utils/validation.js";

const router = Router();

// ── Razorpay webhook — before auth middleware ─────────────────────────────────
// No express.raw() needed — Razorpay sends JSON
// Raw body is captured via a custom middleware in app.js for HMAC verification
router.post("/webhook", razorpayWebhook);

// ── All routes below require JWT ──────────────────────────────────────────────
router.use(protect);

router.get( "/stats",               getPaymentStats);
router.get( "/",                    listPayments);
router.post("/create-order",        validate(createPaymentOrderSchema), createPaymentOrder);
router.get( "/invoice/:invoiceId",  getPaymentByInvoice);
router.post("/:paymentId/refund",   validate(refundSchema), refundPayment);

export default router;