import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

import invoiceRoutes from "./routes/invoice.routes.js";
import { errorHandler, notFound } from "./middleware/error.middleware.js";

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:3000", credentials: true }));
app.use(express.json({ limit: "10kb" }));

if (process.env.NODE_ENV !== "test") app.use(morgan("dev"));

app.use(rateLimit({
  windowMs: 15 * 60 * 1000, max: 200,
  message: { success: false, message: "Too many requests" },
  standardHeaders: true, legacyHeaders: false,
}));

app.get("/health", (_req, res) =>
  res.json({ status: "ok", service: "invoice-service", timestamp: new Date().toISOString() })
);

app.use("/invoices", invoiceRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;