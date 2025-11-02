// models/preference.model.js
import mongoose from "mongoose";

const prefSchema = new mongoose.Schema({
  user_id: { type: String, required: true, index: true },
  key: { type: String, required: true },
  value: { type: mongoose.Schema.Types.Mixed },
  updated_at: { type: Date, default: Date.now }
});

prefSchema.index({ user_id: 1, key: 1 }, { unique: true });

const Preference = mongoose.model("Preference", prefSchema);

export const getPrefsByUser = async (userId) => Preference.find({ user_id: userId });
export const upsertPref = async ({ userId, key, value }) =>
  Preference.findOneAndUpdate({ user_id: userId, key }, { $set: { value, updated_at: new Date() } }, { upsert: true, new: true });
export const deletePref = async ({ userId, key }) => Preference.findOneAndDelete({ user_id: userId, key });
