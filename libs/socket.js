//libs/socket.js
import { Server } from "socket.io";
import Message from "./models/message.model.js";
import Chat from "./models/chat.model.js";

export default function socketConnection(server) {
  const io = new Server(server, {
    cors: { origin: "*" }
  });

  const onlineUsers = new Map(); // userId => socketId

  io.on("connection", (socket) => {
    socket.on("join", (userId) => {
      onlineUsers.set(userId, socket.id);
    });

    socket.on("send_message", async ({ chatId, senderId, receiverId, text }) => {
      const msg = await Message.create({ chatId, senderId, text });

      const receiverSocket = onlineUsers.get(receiverId);
      if (receiverSocket) {
        io.to(receiverSocket).emit("new_message", msg);
      }

      socket.emit("message_sent", msg);
    });

    socket.on("disconnect", () => {
      [...onlineUsers.entries()].forEach(([uid, sid]) => {
        if (sid === socket.id) onlineUsers.delete(uid);
      });
    });
  });
}
