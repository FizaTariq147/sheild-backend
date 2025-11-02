// models/Session.js
import mongoose from "mongoose";

const SessionSchema = new mongoose.Schema({
  jti: { type: String, required: true, unique: true }, // session id stored in token as jti
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "User" },
  createdAt: { type: Date, default: Date.now },
  revokedAt: { type: Date, default: null }, // null -> active
  userAgent: { type: String }, // optional metadata
  ip: { type: String }, // optional metadata
});

SessionSchema.methods.isActive = function () {
  return !this.revokedAt;
};

export default mongoose.models.Session || mongoose.model("Session", SessionSchema);
