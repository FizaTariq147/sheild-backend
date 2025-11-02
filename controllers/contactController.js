// backend/controllers/contact.controller.js
import { v4 as uuidv4 } from "uuid";
import {
  createContact,
  getContactsByUser,
  getContactById,
  updateContactById,
  deleteContactById,
} from "../models/Contacts.js";

export const create = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { full_name, phone, relation } = req.body;
    if (!full_name || !phone) return res.status(400).json({ error: "full_name and phone are required" });

    const newContact = {
      id: uuidv4(),
      user_id: userId,
      full_name: String(full_name).trim(),
      phone: String(phone).trim(),
      relation: relation ? String(relation).trim() : null,
    };

    const created = await createContact(newContact);
    return res.status(201).json({ ok: true, contact: created });
  } catch (error) {
    console.error("create contact error:", error?.message || error);
    if (error?.code === 11000) return res.status(409).json({ error: "duplicate_contact" });
    return res.status(400).json({ error: error?.message || "Failed to create contact" });
  }
};

export const list = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const list = await getContactsByUser(userId);
    return res.json(list);
  } catch (error) {
    console.error("list contacts error:", error);
    return res.status(400).json({ error: error?.message || "Failed to fetch contacts" });
  }
};

export const getOne = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const contact = await getContactById(id);
    if (!contact) return res.status(404).json({ error: "Contact not found" });
    if (contact.user_id !== userId) return res.status(403).json({ error: "Forbidden" });

    return res.json(contact);
  } catch (error) {
    console.error("getOne contact error:", error);
    return res.status(400).json({ error: error?.message || "Failed to fetch contact" });
  }
};

export const update = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const contact = await getContactById(id);
    if (!contact) return res.status(404).json({ error: "Contact not found" });
    if (contact.user_id !== userId) return res.status(403).json({ error: "Forbidden" });

    const updates = {};
    const { full_name, phone, relation } = req.body;
    if (full_name) updates.full_name = String(full_name).trim();
    if (phone) updates.phone = String(phone).trim();
    if (typeof relation !== "undefined") updates.relation = relation ? String(relation).trim() : null;

    const updated = await updateContactById(id, updates);
    return res.json({ ok: true, contact: updated });
  } catch (error) {
    console.error("update contact error:", error);
    if (error?.code === 11000) return res.status(409).json({ error: "duplicate_contact" });
    return res.status(400).json({ error: error?.message || "Failed to update contact" });
  }
};

export const remove = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const contact = await getContactById(id);
    if (!contact) return res.status(404).json({ error: "Contact not found" });
    if (contact.user_id !== userId) return res.status(403).json({ error: "Forbidden" });

    await deleteContactById(id);
    return res.json({ ok: true });
  } catch (error) {
    console.error("delete contact error:", error);
    return res.status(400).json({ error: error?.message || "Failed to delete contact" });
  }
};
