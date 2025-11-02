// models/refreshToken.model.js
import mongoose from "mongoose";

const refreshSchema = new mongoose.Schema({
  user_id: { type: String, required: true }, // user.id (uuid)
  token: { type: String, required: true, unique: true },
  created_by_ip: String,
  revoked: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now },
  expires_at: { type: Date, required: true }
});

const RefreshToken = mongoose.model("RefreshToken", refreshSchema);

export const createRefreshToken = async ({ userId, token, expiresAt, createdByIp }) => {
  return RefreshToken.create({ user_id: userId, token, expires_at: expiresAt, created_by_ip: createdByIp });
};

export const findRefreshToken = async (token) => {
  return RefreshToken.findOne({ token });
};

export const revokeRefreshToken = async (token) => {
  return RefreshToken.findOneAndUpdate({ token }, { revoked: true }, { new: true });
};
