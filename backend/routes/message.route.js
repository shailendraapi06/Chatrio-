import express from "express";
import { getMessage, sendMessage } from "../controllers/message.controller.js";
import isAuth from "../middlewares/isAuth.js";

const messageRouter = express.Router();

messageRouter.post("/send/:id", isAuth, sendMessage);
messageRouter.get("/get/:id", isAuth, getMessage);

export default messageRouter;
