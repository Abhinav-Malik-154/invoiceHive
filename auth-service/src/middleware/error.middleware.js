import { NODE_ENV } from "../config/env.js";
// ── Global error handler ──────────────────────────────────────────────────────
// Must have 4 params — Express recognises it as error middleware
export const errorHandler = (err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.path}`, err);

  // Mongoose duplicate key (e.g. email already exists)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(409).json({
      success: false,
      message: `${field.charAt(0).toUpperCase() + field.slice(1)} already in use`,
    });
  }

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map((e) => ({
      field:   e.path,
      message: e.message,
    }));
    return res.status(400).json({ success: false, errors });
  }

  // Mongoose cast error (bad ObjectId)
  if (err.name === "CastError") {
    return res.status(400).json({ success: false, message: "Invalid ID format" });
  }

  // Default: internal server error
  res.status(err.status || 500).json({
    success: false,
    message: NODE_ENV === "production"
      ? "Something went wrong"
      : err.message,
  });
};

// ── 404 handler — for unknown routes ─────────────────────────────────────────
export const notFound = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found`,
  });
};