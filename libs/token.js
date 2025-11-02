// backend/libs/token.js
import jwt from "jsonwebtoken";
import crypto from "crypto";
import Session from "../models/Session.js"; // path depending on your structure

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error("JWT_SECRET not set");

export async function createTokenForUser(user, { req } = {}) {
  // generate unique session id (jti)
  const jti = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString("hex");

  // persist session
  await Session.create({
    jti,
    userId: user._id,
    userAgent: req?.headers?.["user-agent"] || "",
    ip: req?.ip || req?.connection?.remoteAddress || "",
  });

  // sign token WITHOUT expiresIn (no expiry) and include jwtid (jti)
  const token = jwt.sign(
    {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      // do not add exp if you want token without expiry
    },
    JWT_SECRET,
    {
      jwtid: jti, // jsonwebtoken puts this in the token as 'jti'
      // (optionally) algorithm: "HS256"
    }
  );

  return { token, jti };
}
