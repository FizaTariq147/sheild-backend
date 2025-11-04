// server.js

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Resolve .env path (for local dev only)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config();


// Debug logs to verify environment loading (keep for now)
console.log("========================================");
console.log("Environment check:");
console.log("MONGO_URI:", process.env.MONGO_URI ? "Loaded" : "Missing");
console.log("JWT_SECRET:", process.env.JWT_SECRET ? "Loaded" : "Missing");
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("========================================");

import express from "express";
import cors from "cors";
import contactRouter from "./routes/contactRoutes.js";
import { connectPrimaryDB } from "./db/connections.js";
import userRouter from "./routes/userRoutes.js";
import errorHandler from "./middleware/errorHandler.js";
import safeplaceRoutes from "./routes/safeplaceRoutes.js";
import chatRouter from "./routes/chatRoutes.js"

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Routes
app.use("/api/users", userRouter);
app.use("/api/contacts", contactRouter);
app.use("/api/safeplaces", safeplaceRoutes);
app.use('/api',chatRouter)

// Health check
app.get("/", (req, res) => res.json({ ok: true }));

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

const start = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error(" MONGO_URI is required but missing!");
    }

    await connectPrimaryDB(process.env.MONGO_URI);

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on ${BASE_URL}`);
      console.log(`Environment: ${process.env.NODE_ENV || "production"}`);
    });
  } catch (e) {
    console.error("Startup error:", e);
    process.exit(1);
  }
};

start();
