import express from "express";
import { createServer } from "node:http";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import authRouter from "./routes/auth.route.js";
import userRouter from "./routes/user.route.js";
import messageRouter from "./routes/message.route.js";
import cookieParser from "cookie-parser";
import cors from "cors";
import { Server } from "socket.io";
import { attachPresence } from "./socket/presence.js";
import Message from "./models/message.model.js";
import { startAttachmentCleanupWorker } from "./services/attachmentCleanup.js";

dotenv.config();

const PORT = process.env.PORT || 8000;
const allowedOrigins = new Set([
  process.env.FRONTEND_URL || "http://localhost:5173",
  "http://127.0.0.1:5173",
]);

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

app.use("/api/auth", authRouter);
app.use("/api/users", userRouter);
app.use("/api/v1/message", messageRouter);

const io = new Server(httpServer, {
  cors: {
    origin: [...allowedOrigins],
    credentials: true,
  },
});
app.set("io", io);
attachPresence(io);

await connectDB();
await Message.collection.createIndex(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 },
);
startAttachmentCleanupWorker();
httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
