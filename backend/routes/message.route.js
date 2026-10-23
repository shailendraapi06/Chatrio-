import express from "express";
import {
  deleteConversationForUser,
  deleteMessageForUser,
  getMessage,
  sendMessage,
} from "../controllers/message.controller.js";
import isAuth from "../middlewares/isAuth.js";

const messageRouter = express.Router();

messageRouter.post("/send/:id", isAuth, sendMessage);
messageRouter.get("/get/:id", isAuth, getMessage);
messageRouter.delete("/delete/:id", isAuth, deleteConversationForUser);
messageRouter.delete(
  "/:id/message/:messageId",
  isAuth,
  deleteMessageForUser,
);

export default messageRouter;
