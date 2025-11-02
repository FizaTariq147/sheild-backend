// models/SafePlace.js
import mongoose from "mongoose";

const SafePlaceSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  name: { type: String, default: "Untitled" },
  address: { type: String, default: "" },
  location: {
    type: { type: String, enum: ["Point"], required: true, default: "Point" },
    coordinates: { type: [Number], required: true } // [lng, lat]
  },
  meta: { type: Object, default: {} },
  createdAt: { type: Date, default: Date.now }
});

SafePlaceSchema.index({ location: "2dsphere" });

export default mongoose.models.SafePlace || mongoose.model("SafePlace", SafePlaceSchema);
