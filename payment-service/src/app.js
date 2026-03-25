import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

import paymentRoutes from "./routes/payment.routes.js";
import { errorHandler, notFound } from "./middleware/error.middleware.js";

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:3000", credentials: true }));

// ── CRITICAL: Stripe webhook needs raw body ───────────────────────────────────
// Apply express.raw() ONLY to the webhook route — BEFORE express.json()
// If express.json() parses the body first, stripe.webhooks.constructEvent() fails
// because it needs the original raw Buffer to verify the signature
app.use(
  "/payments/webhook",
  express.raw({ type: "application/json" })
);

// ── All other routes get parsed JSON ──────────────────────────────────────────
app.use(express.json({ limit: "10kb" }));

if (process.env.NODE_ENV !== "test") app.use(morgan("dev"));

app.use(rateLimit({
  windowMs: 15 * 60 * 1000, max: 100,
  message:  { success: false, message: "Too many requests" },
  standardHeaders: true, legacyHeaders: false,
}));

app.get("/health", (_req, res) =>
  res.json({ status: "ok", service: "payment-service", timestamp: new Date().toISOString() })
);

app.use("/payments", paymentRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;