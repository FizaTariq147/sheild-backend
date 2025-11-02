// server.js
import dotenv from "dotenv";
dotenv.config();

console.log("server.js: JWT_SECRET present?", !!process.env.JWT_SECRET);

import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import contactRouter from "./routes/contactRoutes.js";
import { connectPrimaryDB } from "./db/connections.js";
import userRouter from "./routes/userRoutes.js";
import errorHandler from "./middleware/errorHandler.js";
import safeplaceRoutes from "./routes/safeplaceRoutes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middlewares
app.use(cors()); // allow all origins in dev; restrict in production if needed
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static uploads
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Routes
app.use("/api/users", userRouter);
app.use("/api/contacts", contactRouter);
app.use("/api/safeplaces", safeplaceRoutes);

// Health check
app.get("/", (req, res) => res.json({ ok: true }));

// Error handler (should be last)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
// Use your provided machine IP for log output only; server binds to 0.0.0.0
// const LAN_IP = "192.168.0.110";
const LAN_IP = "192.168.0.102";
const start = async () => {
  try {
    // Connect to DB (will throw if fails)
    await connectPrimaryDB(process.env.MONGO_URI);

    // Bind to 0.0.0.0 so devices on the same LAN can reach the server
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server listening on:`);
      console.log(`  • Local:   http://localhost:${PORT}`);
      console.log(`  • LAN:     http://${LAN_IP}:${PORT}  <-- use this from your phone`);
      console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
    });
  } catch (e) {
    console.error("Startup error:", e);
    process.exit(1);
  }
};

start();
