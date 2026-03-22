import rateLimit from "express-rate-limit";

// ── Login rate limiter — prevents brute force attacks ────────────────────────
// 10 attempts per 15 minutes per IP
export const loginLimiter = rateLimit({
  windowMs:         15 * 60 * 1000, // 15 minutes
  max:              10,
  message:          { success: false, message: "Too many login attempts — try again in 15 minutes" },
  standardHeaders:  true,  // Return rate limit info in RateLimit-* headers
  legacyHeaders:    false,
  skipSuccessfulRequests: true, // Only count failed attempts
});

// ── Register rate limiter — prevents account spam ────────────────────────────
// 5 signups per hour per IP
export const registerLimiter = rateLimit({
  windowMs:  60 * 60 * 1000, // 1 hour
  max:       5,
  message:   { success: false, message: "Too many accounts created — try again in an hour" },
  standardHeaders: true,
  legacyHeaders:   false,
});

// ── Password reset limiter ────────────────────────────────────────────────────
// 3 reset emails per hour per IP
export const resetLimiter = rateLimit({
  windowMs:  60 * 60 * 1000,
  max:       3,
  message:   { success: false, message: "Too many reset requests — try again in an hour" },
  standardHeaders: true,
  legacyHeaders:   false,
});

// ── General API limiter ───────────────────────────────────────────────────────
// 100 requests per 15 min per IP — applied globally
export const apiLimiter = rateLimit({
  windowMs:  15 * 60 * 1000,
  max:       100,
  message:   { success: false, message: "Too many requests — slow down" },
  standardHeaders: true,
  legacyHeaders:   false,
});