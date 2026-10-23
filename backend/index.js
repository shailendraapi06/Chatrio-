import express from "express";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import path from "node:path";
import dotenv from "dotenv";
import mongoose from "mongoose";
import connectDB from "./config/db.js";
import authRouter from "./routes/auth.route.js";
import userRouter from "./routes/user.route.js";
import messageRouter from "./routes/message.route.js";
import cookieParser from "cookie-parser";
import cors from "cors";
import { Server } from "socket.io";
import { attachPresence } from "./socket/presence.js";
import Message from "./models/message.model.js";

dotenv.config({ path: fileURLToPath(new URL(".env", import.meta.url)) });

const PORT = process.env.PORT || 8000;
const isProduction = process.env.NODE_ENV === "production";
const allowedOrigins = new Set([
  process.env.FRONTEND_URL,
  process.env.RENDER_EXTERNAL_URL,
  ...(isProduction
    ? []
    : ["http://localhost:5173", "http://127.0.0.1:5173"]),
].filter(Boolean));

const app = express();
const httpServer = createServer(app);
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.has(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Origin is not allowed by CORS."));
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());

app.get("/healthz", (_req, res) => {
  const databaseConnected = mongoose.connection.readyState === 1;
  return res.status(databaseConnected ? 200 : 503).json({
    status: databaseConnected ? "ok" : "unavailable",
    database: databaseConnected ? "connected" : "disconnected",
  });
});

app.use("/api/auth", authRouter);
app.use("/api/users", userRouter);
app.use("/api/v1/message", messageRouter);

if (isProduction) {
  const frontendDistPath = fileURLToPath(
    new URL("../frontend/dist/", import.meta.url),
  );
  app.use(express.static(frontendDistPath, { index: false }));
  app.get("/{*path}", (req, res, next) => {
    if (req.path.startsWith("/api/")) {
      return next();
    }
    return res.sendFile(path.join(frontendDistPath, "index.html"), (error) => {
      if (error) {
        next(error);
      }
    });
  });
}

const io = new Server(httpServer, {
  cors: {
    origin: [...allowedOrigins],
    credentials: true,
  },
});
app.set("io", io);
attachPresence(io);

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is required to start the server.");
}

await connectDB();
await Message.collection.createIndex(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 },
);
httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is running on port ${PORT}`);
});
