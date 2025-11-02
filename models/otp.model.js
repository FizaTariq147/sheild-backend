// models/otp.model.js
import mongoose from "mongoose";

const otpSchema = new mongoose.Schema({
  target: { type: String, required: true }, // phone or email (lowercase)
  code: { type: String, required: true },
  type: { type: String, default: "login" }, // login | email_verif | password_reset
  expires_at: { type: Date, required: true },
  used: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now }
});
otpSchema.index({ target: 1, code: 1, type: 1 });

const Otp = mongoose.model("Otp", otpSchema);

export const createOtp = async ({ target, code, type = "login", expiresAt }) => {
  const doc = await Otp.create({ target: target.toString().toLowerCase(), code, type, expires_at: expiresAt });
  return doc;
};

export const findValidOtp = async ({ target, code, type = "login" }) => {
  const now = new Date();
  return Otp.findOne({ target: target.toString().toLowerCase(), code, type, used: false, expires_at: { $gt: now } });
};

/**
 * Find the most recent valid (unused, not expired) OTP by code only.
 * This allows verifying by code alone by selecting the newest matching OTP.
 * WARNING: Code collisions may occur (same code for different targets); this function
 * chooses the most recent OTP and therefore should be used where that behaviour is desired.
 *
 * @param {object} options
 * @param {string} options.code - OTP code
 * @param {string} [options.type] - Optional type filter (e.g. 'email_verif')
 * @returns {Promise<Otp|null>}
 */
export const findValidOtpByCode = async ({ code, type } = {}) => {
  const now = new Date();
  const query = { code, used: false, expires_at: { $gt: now } };
  if (type) query.type = type;
  // return the most recent created matching OTP
  return Otp.findOne(query).sort({ created_at: -1 });
};

export const markOtpUsed = async (otpId) => {
  return Otp.findByIdAndUpdate(otpId, { used: true }, { new: true });
};

// Optionally purge expired OTPs (not implemented here)
