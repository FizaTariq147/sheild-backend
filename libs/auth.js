// backend/libs/auth.js
import jwt from "jsonwebtoken";

export const authenticate = (req, res, next) => {
  const JWT_SECRET = process.env.JWT_SECRET;
  if (!JWT_SECRET) {
    console.error("JWT secret not configured (process.env.JWT_SECRET).");
    return res.status(500).json({ error: "Server misconfiguration" });
  }

  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader || typeof authHeader !== "string") {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const parts = authHeader.split(/\s+/);
  if (parts.length < 2 || parts[0].toLowerCase() !== "bearer") {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const token = parts[1];

  // DEBUG: inspect token shape (remove in production)
  try {
    console.debug("authenticate: token length:", token ? token.length : "nil");
    const decodedComplete = jwt.decode(token, { complete: true });
    console.debug("authenticate: jwt.decode (header+payload):", decodedComplete);
  } catch (dErr) {
    console.debug("authenticate: jwt.decode error", dErr);
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const userId = payload.id || payload.sub;
    if (!userId) {
      console.warn("authenticate: token payload missing user id", payload);
      return res.status(401).json({ error: "Invalid token payload" });
    }
    req.user = { id: userId, email: payload.email, role: payload.role };
    next();
  } catch (err) {
    console.debug("authenticate verify error:", err && err.message ? err.message : err);
    return res.status(401).json({ error: "Invalid token" });
  }
};

export default authenticate;