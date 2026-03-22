import { Router } from "express";
import passport from "passport";

import {
  register,
  login,
  refresh,
  logout,
  getMe,
  forgotPassword,
  resetPassword,
} from "../controllers/auth.controller.js";

import { oauthSuccess, oauthFailure } from "../controllers/oauth.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { loginLimiter, registerLimiter, resetLimiter } from "../middleware/rateLimiter.js";
import { validate, registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from "../utils/validation.js";

const router = Router();

// ── Local Auth ────────────────────────────────────────────────────────────────
router.post("/register", registerLimiter, validate(registerSchema), register);
router.post("/login",    loginLimiter,    validate(loginSchema),    login);
router.post("/refresh",  refresh);
router.post("/logout",   protect, logout);
router.get("/me",        protect, getMe);

// ── Password Reset ────────────────────────────────────────────────────────────
router.post("/forgot-password", resetLimiter, validate(forgotPasswordSchema), forgotPassword);
router.post("/reset-password",  validate(resetPasswordSchema), resetPassword);

// ── Google OAuth ──────────────────────────────────────────────────────────────
// Step 1: redirect user to Google consent screen
router.get(
  "/oauth/google",
  passport.authenticate("google", { scope: ["profile", "email"], session: false })
);

// Step 2: Google redirects back here after user approves
router.get(
  "/oauth/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/auth/oauth/failure",
    session: false,
  }),
  oauthSuccess
);

// ── GitHub OAuth ──────────────────────────────────────────────────────────────
router.get(
  "/oauth/github",
  passport.authenticate("github", { scope: ["user:email"], session: false })
);

router.get(
  "/oauth/github/callback",
  passport.authenticate("github", {
    failureRedirect: "/auth/oauth/failure",
    session: false,
  }),
  oauthSuccess
);

// ── OAuth failure ─────────────────────────────────────────────────────────────
router.get("/oauth/failure", oauthFailure);

export default router;