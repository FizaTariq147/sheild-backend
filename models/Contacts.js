// backend/models/contact.model.js
import mongoose from "mongoose";

const contactSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true }, // uuid
    user_id: { type: String, required: true, index: true }, // owner user id
    full_name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    relation: { type: String, required: false, trim: true, default: null }
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

contactSchema.index({ user_id: 1, phone: 1 }, { unique: true, partialFilterExpression: { phone: { $exists: true } } });

const Contact = mongoose.model("Contact", contactSchema);

export const createContact = async (payload) => Contact.create(payload);
export const getContactsByUser = async (userId) => Contact.find({ user_id: userId }).sort({ created_at: -1 });
export const getContactById = async (id) => Contact.findOne({ id });
export const updateContactById = async (id, updates) => Contact.findOneAndUpdate({ id }, { $set: updates }, { new: true });
export const deleteContactById = async (id) => Contact.findOneAndDelete({ id });

export default Contact;
