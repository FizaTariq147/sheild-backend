// db/connection.js
import mongoose from "mongoose";

export const connectPrimaryDB = async (mongoUri) => {
  if (!mongoUri) throw new Error("MONGO_URI is required");
  try {
    await mongoose.connect(mongoUri);
    console.log(" MongoDB connected");
  } catch (err) {
    console.error(" MongoDB connection error:", err);
    process.exit(1);
  }
};
