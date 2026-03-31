import { verifyAccessToken, isTokenBlacklisted } from "../utils/jwt.utils.js";
import User from "../models/user.model.js";
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// ── Protect routes — verifies JWT from Authorization header ───────────────────
// All other microservices will use this same pattern
// Usage: router.get('/protected', protect, controller)

export const protect = async (req, res, next) => {
  try {
    // 1. Extract token from Authorization: Bearer <token>
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];

    // 2. Check if token was blacklisted (user logged out)
    const blacklisted = await isTokenBlacklisted(token);
    if (blacklisted) {
      return res.status(401).json({ success: false, message: "Token has been revoked — please log in again" });
    }

    // 3. Verify signature + expiry
    const decoded = verifyAccessToken(token);

    // 4. Check user still exists in DB (account could have been deleted)
    const user = await User.findById(decoded.sub).select("-passwordHash");
    if (!user) {
      return res.status(401).json({ success: false, message: "User no longer exists" });
    }

    // 5. Attach user to request — controllers can access req.user
    req.user  = user;
    req.token = token;
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ success: false, message: "Token expired — please refresh" });
    }
    if (err.name === "JsonWebTokenError") {
      return res.status(401).json({ success: false, message: "Invalid token" });
    }
    next(err);
  }
};

// ── Optional auth — attaches user if token present, doesn't block if absent ───
// Useful for public endpoints that show extra info to logged-in users
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) return next();

    const token = authHeader.split(" ")[1];
    const blacklisted = await isTokenBlacklisted(token);
    if (blacklisted) return next();

    const decoded = verifyAccessToken(token);
    const user = await User.findById(decoded.sub).select("-passwordHash");
    if (user) {
      req.user  = user;
      req.token = token;
    }
    next();
  } catch {
    next(); // Silently skip bad tokens for optional auth
  }
};