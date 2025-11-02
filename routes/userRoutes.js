// routers/user.router.js
import { Router } from "express";
import {
  login,
  register,
  refresh,
  logout,
  sendOtp,
  verifyOtp,
  getProfile,
  updateProfile,
  listPrefs,
  upsertPreference,
  removePreference,
  deleteAccount
} from "../controllers/userController.js";
import { authenticate } from "../libs/auth.js";
import { uploadAvatar } from "../middleware/uploadAvatar.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/refresh", refresh);
router.post("/logout", logout);

router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);

// protected routes
router.get("/profile", authenticate, getProfile);
router.put("/profile", authenticate, uploadAvatar.single("avatar"), updateProfile);
router.delete("/profile", authenticate, deleteAccount);

// preferences
router.get("/prefs", authenticate, listPrefs);
router.post("/prefs", authenticate, upsertPreference);
router.delete("/prefs/:key", authenticate, removePreference);

export default router;
