// backend/services/user.service.js
import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";
import jwt from "jsonwebtoken";
import {
  createUser,
  findByEmail,
  findByPhone,
  getUserById,
  updateUser as updateUserModel
} from "../models/User.js";
import { createRefreshToken, findRefreshToken, revokeRefreshToken } from "../models/refreshToken.model.js";
import { createOtp } from "../models/otp.model.js";
import { sendMail } from "../utils/mailer.js";
import { generateOtp } from "../utils/otp.js";

const ACCESS_TOKEN_EXPIRES = process.env.ACCESS_TOKEN_EXPIRES || "15m";
const REFRESH_TTL_DAYS = parseInt(process.env.REFRESH_TTL_DAYS || "30", 10);

// read secret at call-time to avoid import-order / dotenv timing issues
const getJwtSecret = () => {
  const s = process.env.JWT_SECRET;
  if (!s) {
    // explicit error so the caller sees server misconfiguration
    throw new Error("Server misconfiguration: JWT_SECRET is not set");
  }
  return s;
};

// helper to sign access token (reads secret at runtime)
const signAccessToken = (payload) => {
  const secret = getJwtSecret();
  return jwt.sign(payload, secret, { expiresIn: ACCESS_TOKEN_EXPIRES });
};

export const registerUser = async ({ full_name, phone, email, password }) => {
  const existing = await findByEmail(email);
  if (existing) throw new Error("Email already registered");

  const password_hash = await bcrypt.hash(password, 10);
  const newUser = {
    id: uuidv4(),
    full_name,
    phone: phone || null,
    email: email.toLowerCase(),
    password_hash
  };

  await createUser(newUser);

  // send verification otp (non-fatal if fails)
  try {
    const otpCode = generateOtp(6);
    const ttlSeconds = parseInt(process.env.OTP_TTL_SECONDS || "300", 10);
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    await createOtp({ target: email.toLowerCase(), code: otpCode, type: "email_verif", expiresAt });
    await sendMail({
      to: email,
      subject: "Verify your email",
      html: `<p>Your verification code is <strong>${otpCode}</strong>. It expires in ${ttlSeconds} seconds.</p>`
    });
  } catch (e) {
    console.warn("Mailer problem:", e);
  }

  return { message: "User registered. OTP sent to email if configured." };
};

export const loginUser = async ({ email, password, ip }) => {
  const user = await findByEmail(email);
  if (!user) throw new Error("Invalid email or password");

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) throw new Error("Invalid email or password");

  // sign using runtime secret
  const accessToken = signAccessToken({ id: user.id, email: user.email });

  const refreshToken = uuidv4();
  const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);
  await createRefreshToken({ userId: user.id, token: refreshToken, expiresAt, createdByIp: ip });

  // return user object but do not leak password_hash
  const safeUser = {
    id: user.id,
    full_name: user.full_name,
    email: user.email,
    phone: user.phone,
    created_at: user.created_at
  };

  return { accessToken, refreshToken, user: safeUser };
};

export const refreshAuth = async ({ refreshToken, ip }) => {
  if (!refreshToken) throw new Error("refreshToken required");
  const rec = await findRefreshToken(refreshToken);
  if (!rec) throw new Error("Invalid refresh token");
  if (rec.revoked) throw new Error("Refresh token revoked");
  if (new Date(rec.expires_at) < new Date()) throw new Error("Refresh token expired");

  // revoke old token record
  await revokeRefreshToken(refreshToken);

  const user = await getUserById(rec.user_id);
  if (!user) throw new Error("User not found");

  // sign using runtime secret
  const accessToken = signAccessToken({ id: user.id, email: user.email });
  const newRefreshToken = uuidv4();
  const newExpiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);
  await createRefreshToken({ userId: user.id, token: newRefreshToken, expiresAt: newExpiresAt, createdByIp: ip });

  const safeUser = {
    id: user.id,
    full_name: user.full_name,
    email: user.email,
    phone: user.phone,
    created_at: user.created_at
  };

  return { accessToken, refreshToken: newRefreshToken, user: safeUser };
};

export const logoutUser = async ({ refreshToken }) => {
  if (!refreshToken) throw new Error("refreshToken required");
  await revokeRefreshToken(refreshToken);
  return { message: "Logged out" };
};
