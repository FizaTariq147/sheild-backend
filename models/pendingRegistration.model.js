// models/pendingRegistration.model.js
import mongoose from "mongoose";

const pendingSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true }, // uuid
  full_name: { type: String, required: true, trim: true },
  email: { type: String, lowercase: true, required: true },
  phone: { type: String, required: true },
  password_hash: { type: String, required: true },
  created_at: { type: Date, default: Date.now }
});

const Pending = mongoose.model("PendingRegistration", pendingSchema);

export const createPending = async (obj) => {
  // Accept object which may contain many fields but we store only allowed ones
  const payload = {
    id: obj.id,
    full_name: obj.full_name,
    email: obj.email.toLowerCase(),
    phone: obj.phone,
    password_hash: obj.password_hash
  };
  return Pending.create(payload);
};

export const findPendingById = async (id) => Pending.findOne({ id });
export const findPendingByEmail = async (email) => Pending.findOne({ email: email.toLowerCase() });
export const deletePendingById = async (id) => Pending.findOneAndDelete({ id });
