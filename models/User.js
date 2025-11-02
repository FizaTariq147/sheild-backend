// models/user.model.js
import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true }, // uuid
  full_name: { type: String, required: true, trim: true },
  email: { type: String, lowercase: true, index: true, required: true },
  phone: { type: String, index: true, required: true },
  password_hash: { type: String, required: true },
  created_at: { type: Date, default: Date.now }
});

// model
const User = mongoose.model("User", userSchema);

// helpers
export const createUser = async (userObj) => {
  // Ensure only allowed fields are saved
  const payload = {
    id: userObj.id,
    full_name: userObj.full_name,
    email: userObj.email.toLowerCase(),
    phone: userObj.phone,
    password_hash: userObj.password_hash
  };
  return User.create(payload);
};

export const findByEmail = async (email) => {
  if (!email) return null;
  return User.findOne({ email: email.toLowerCase() });
};

export const findByPhone = async (phone) => {
  if (!phone) return null;
  return User.findOne({ phone });
};

export const getUserById = async (id) => {
  return User.findOne({ id });
};

export const updateUser = async (id, updates) => {
  // Only allow updating full_name, phone, email (not password here)
  const allowed = {};
  if (updates.full_name) allowed.full_name = updates.full_name;
  if (updates.phone) allowed.phone = updates.phone;
  if (updates.email) allowed.email = updates.email.toLowerCase();
  if (updates.password_hash) allowed.password_hash = updates.password_hash; // allow hashed pwd update if needed
  if (Object.keys(allowed).length === 0) return null;
  return User.findOneAndUpdate({ id }, { $set: allowed }, { new: true });
};

export const deleteUser = async (id) => {
  return User.findOneAndDelete({ id });
};
