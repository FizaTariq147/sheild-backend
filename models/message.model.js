//models/message.model.js
import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema({
  chatId: { type: String, required: true },
  senderId: { type: String, required: true },
  text: { type: String, required: true },
}, { timestamps: true });

export default mongoose.model("Message", MessageSchema);
