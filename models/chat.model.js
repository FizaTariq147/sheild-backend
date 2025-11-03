// models/chat.model.js
import mongoose from "mongoose";

const ChatSchema = new mongoose.Schema({
  members: [{ type: String, required: true }], // user ids
}, { timestamps: true });

export default mongoose.model("Chat", ChatSchema);
