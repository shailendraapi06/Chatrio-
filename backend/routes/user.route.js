import express from "express";
import {
  getCurrentUser,
  updateCurrentUser,
} from "../controllers/user.controller.js";
import isAuth from "../middlewares/isAuth.js";

const userRouter = express.Router();

userRouter.get("/current", isAuth, getCurrentUser);
userRouter.put("/profile", isAuth, updateCurrentUser);

export default userRouter;