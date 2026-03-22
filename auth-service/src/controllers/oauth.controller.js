import { issueTokens } from "../utils/jwt.utils.js";
import { CLIENT_URL } from "../config/env.js";
// ── OAuth success handler (shared by Google + GitHub) ─────────────────────────
// Passport already ran the strategy and attached user to req.user
// We just issue our own JWTs and redirect to frontend

export const oauthSuccess = async (req, res, next) => {
  try {
    const user = req.user; // Set by Passport strategy

    const accessToken = await issueTokens(user._id, res);

    // Redirect to frontend with access token as query param
    // Frontend grabs it, stores in memory, then removes from URL
    // Refresh token is already in the httpOnly cookie
    res.redirect(
      `${CLIENT_URL}/auth/callback?token=${accessToken}&provider=${user.provider}`
    );
  } catch (err) {
    next(err);
  }
};

// ── OAuth failure handler ─────────────────────────────────────────────────────
export const oauthFailure = (req, res) => {
  res.redirect(`${CLIENT_URL}/login?error=oauth_failed`);
};