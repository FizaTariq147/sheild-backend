// routes/safeplaceRoutes.js
import express from "express";
import {
  createSafePlace,
  listSafePlaces,
  getSafePlace,
  updateSafePlace,
  deleteSafePlace
} from "../controllers/safeplace.controller.js";

import authenticate from "../libs/auth.js"; // uses your existing middleware

const router = express.Router();

// protect all safeplace endpoints
router.use(authenticate);

router.post("/", createSafePlace);
router.get("/", listSafePlaces);
router.get("/:id", getSafePlace);
router.put("/:id", updateSafePlace);
router.delete("/:id", deleteSafePlace);

export default router;
