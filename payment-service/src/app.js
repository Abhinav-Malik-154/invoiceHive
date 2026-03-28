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

// ── Raw body capture for Razorpay webhook signature verification ──────────────
// Razorpay sends regular JSON (unlike Stripe which needs a raw Buffer),
// BUT we still need the raw body string to compute the HMAC-SHA256 signature.
// We capture it here BEFORE express.json() parses and discards the original.
//
// req.rawBody is then used inside webhook.controller.js to verify the signature.
// app.use((req, _res, next) => {
//   let data = "";
//   req.on("data", (chunk) => { data += chunk; });
//   req.on("end", () => {
//     req.rawBody = data;
//     next();
//   });
// });

// ── All routes get parsed JSON ────────────────────────────────────────────────
app.use(express.json({
  limit: "10kb",
  verify: (req, res, buf) => {
    req.rawBody = buf.toString();
  }
}))

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