import mongoose from "mongoose";
import User from "../models/user.model.js";
import verifyAuthToken from "../config/verifyAuthToken.js";

const cookieToken = (cookieHeader) => {
  const tokenCookie = cookieHeader
    ?.split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith("token="));

  if (!tokenCookie) {
    return null;
  }

  try {
    return decodeURIComponent(tokenCookie.slice("token=".length));
  } catch {
    return null;
  }
};

export const attachPresence = (io) => {
  const socketsByUser = new Map();

  io.use(async (socket, next) => {
    const token = cookieToken(socket.handshake.headers.cookie);
    if (!token) {
      return next(new Error("Authentication required."));
    }

    try {
      const userId = verifyAuthToken(token);
      if (!mongoose.isObjectIdOrHexString(userId)) {
        return next(new Error("Invalid authentication token."));
      }

      const userExists = await User.exists({ _id: userId });
      if (!userExists) {
        return next(new Error("Authenticated user was not found."));
      }

      socket.data.userId = userId;
      return next();
    } catch {
      return next(new Error("Authentication required."));
    }
  });

  io.on("connection", (socket) => {
    const { userId } = socket.data;
    let userSockets = socketsByUser.get(userId);
    const becameOnline = !userSockets;

    socket.join(`user:${userId}`);

    if (!userSockets) {
      userSockets = new Set();
      socketsByUser.set(userId, userSockets);
    }
    userSockets.add(socket.id);

    socket.emit("presence:initial", {
      onlineUsers: [...socketsByUser.keys()],
    });

    if (becameOnline) {
      socket.broadcast.emit("presence:online", { userId });
    }

    socket.on("disconnect", () => {
      const activeSockets = socketsByUser.get(userId);
      if (!activeSockets) {
        return;
      }

      activeSockets.delete(socket.id);
      if (activeSockets.size === 0) {
        socketsByUser.delete(userId);
        io.emit("presence:offline", { userId });
      }
    });
  });
};
