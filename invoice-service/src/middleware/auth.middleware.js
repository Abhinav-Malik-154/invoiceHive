import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";

// Load public key for verification
const JWT_PUBLIC_KEY = fs.readFileSync(path.join(process.cwd(), "public.key"), "utf8");

export const protect = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "No token provided" });
    }

    const token   = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_PUBLIC_KEY, {
      algorithms: ["RS256"]
    });

    req.userId = decoded.sub;
    req.token  = token;
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ success: false, message: "Token expired" });
    }
    if (err.name === "JsonWebTokenError") {
      return res.status(401).json({ success: false, message: "Invalid token" });
    }
    next(err);
  }
};

// Internal service-to-service auth
export const internalOnly = (req, res, next) => {
  const secret = req.headers["x-internal-secret"];
  if (secret !== process.env.INTERNAL_SECRET) {
    return res.status(403).json({ success: false, message: "Internal access only" });
  }
  next();
};