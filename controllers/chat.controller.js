//controllers/chat.controller.js
import Chat from "../models/chat.model.js";

export const getOrCreateChat = async (req, res) => {
  try {
    const userId = req.user.id;
    const { partnerId } = req.body;

    if (!partnerId) return res.status(400).json({ error: "partnerId required" });

    let chat = await Chat.findOne({
      members: { $all: [userId, partnerId] }
    });

    if (!chat) {
      chat = await Chat.create({ members: [userId, partnerId] });
    }

    res.json(chat);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

