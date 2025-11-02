// backend/routes/contact.router.js
import { Router } from "express";
import { create, list, getOne, update, remove } from "../controllers/contactController.js";
import { authenticate } from "../libs/auth.js";

const router = Router();

router.post("/", authenticate, create);
router.get("/", authenticate, list);
router.get("/:id", authenticate, getOne);
router.put("/:id", authenticate, update);
router.delete("/:id", authenticate, remove);

export default router;
