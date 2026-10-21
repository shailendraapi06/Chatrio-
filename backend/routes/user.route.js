import express from "express";
import {
  getContacts,
  getCurrentUser,
  updateCurrentUser,
} from "../controllers/user.controller.js";
import isAuth from "../middlewares/isAuth.js";

const userRouter = express.Router();

userRouter.get("/contacts", isAuth, getContacts);
userRouter.get("/current", isAuth, getCurrentUser);
userRouter.put("/profile", isAuth, updateCurrentUser);

export default userRouter;