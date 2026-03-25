import { Router } from "express";
import {
  createPaymentLink, listPayments, getPaymentByInvoice,
  getPaymentStats, refundPayment,
} from "../controllers/payment.controller.js";
import { stripeWebhook } from "../controllers/webhook.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { validate, createPaymentLinkSchema, refundSchema } from "../utils/validation.js";

const router = Router();

// ── Stripe webhook — MUST be before any body parsers ─────────────────────────
// express.raw() is applied in app.js specifically for this route
router.post("/webhook", stripeWebhook);

// ── All routes below require JWT ──────────────────────────────────────────────
router.use(protect);

router.get( "/stats",               getPaymentStats);
router.get( "/",                    listPayments);
router.post("/create-link",         validate(createPaymentLinkSchema), createPaymentLink);
router.get( "/invoice/:invoiceId",  getPaymentByInvoice);
router.post("/:paymentId/refund",   validate(refundSchema), refundPayment);

export default router;