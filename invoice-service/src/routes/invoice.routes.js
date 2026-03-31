import { Router } from "express";
import {
  createInvoice, listInvoices, getInvoice, updateInvoice,
  deleteInvoice, sendInvoice, downloadInvoice, markViewed,
  markPaid, getStats, setPaymentLink,razorpayWebhookPaid
} from "../controllers/invoice.controller.js";
import { protect, internalOnly } from "../middleware/auth.middleware.js";
import { validate, createInvoiceSchema, updateInvoiceSchema, listInvoicesSchema } from "../utils/validation.js";
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const router = Router();

// ── Stats (before /:id routes) ────────────────────────────────────────────────
router.get("/stats", protect, getStats);

// ── Public invoice view (client opens payment page — no auth) ─────────────────
router.get("/:id/view", markViewed); // Public — client's browser calls this

// ── All routes below require JWT ──────────────────────────────────────────────
router.use(protect);

// ── CRUD ──────────────────────────────────────────────────────────────────────
router.get(   "/",    validate(listInvoicesSchema, "query"), listInvoices);
router.post(  "/",    validate(createInvoiceSchema),         createInvoice);
router.get(   "/:id", getInvoice);
router.put(   "/:id", validate(updateInvoiceSchema),         updateInvoice);
router.delete("/:id", deleteInvoice);

// ── Actions ───────────────────────────────────────────────────────────────────
router.post("/:id/send",      sendInvoice);
router.post("/:id/mark-paid", markPaid);
router.get( "/:id/download",  downloadInvoice);

// ── Internal routes (Payment Service calls these) ─────────────────────────────
router.post("/internal/:invoiceId/razorpay-paid",    internalOnly,  razorpayWebhookPaid);
router.post("/internal/:invoiceId/payment-link",   internalOnly, setPaymentLink);

export default router;