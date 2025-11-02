// backend/controllers/auth.controller.js (refresh)
import jwt from "jsonwebtoken";
export const refresh = async (req, res) => {
  const { refreshToken } = req.body;
  // validate refreshToken from DB
  const session = await RefreshModel.findOne({ token: refreshToken });
  if (!session) return res.status(401).json({ error: "Refresh token revoked" });

  const user = await User.findById(session.user_id);
  if (!user) return res.status(401).json({ error: "Invalid session" });

  const payload = { id: user.id, email: user.email };
  const secret = process.env.JWT_SECRET;
  if (!secret) return res.status(500).json({ error: "Server misconfiguration" });

  const newAccess = jwt.sign(payload, secret, { expiresIn: "1h" });
  return res.json({ accessToken: newAccess });
};
