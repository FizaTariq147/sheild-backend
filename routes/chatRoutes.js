// routes/chatRoutes.js
import { Router } from "express";
import authenticate from "../libs/auth.js";
import { getOrCreateChat } from "../controllers/chat.controller.js";

const router = Router();

router.post("/chat/create", authenticate, getOrCreateChat);

export default router

