import bcrypt from "bcryptjs";
import User from "../models/user.model.js";
import genToken from "../config/token.js";

const getCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "Lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
});

const toPublicUser = (user) => ({
  id: user._id,
  username: user.username,
  email: user.email,
  image: user.image,
});

export const signUp = async (req, res) => {
  try {
    const username =
      typeof req.body?.username === "string" ? req.body.username.trim() : "";
    const email =
      typeof req.body?.email === "string"
        ? req.body.email.trim().toLowerCase()
        : "";
    const password =
      typeof req.body?.password === "string" ? req.body.password : "";

    if (!username || !email || !password) {
      return res
        .status(400)
        .json({ message: "Username, email, and password are required." });
    }

    if (username.length < 2) {
      return res
        .status(400)
        .json({ message: "Username must be at least 2 characters long." });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: "Enter a valid email address." });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters long." });
    }

    const existingUser = await User.findOne({
      $or: [{ username }, { email }],
    });
    if (existingUser) {
      const message =
        existingUser.username === username
          ? "Username already exists."
          : "Email already exists.";
      return res.status(409).json({ message });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ username, email, password: hashedPassword });
    const token = await genToken(user._id);

    res.cookie("token", token, getCookieOptions());
    return res
      .status(201)
      .json({ message: "Account created successfully.", user: toPublicUser(user) });
  } catch (error) {
    if (error.code === 11000) {
      const duplicateField = Object.keys(error.keyPattern || {})[0];
      const message =
        duplicateField === "username"
          ? "Username already exists."
          : "Email already exists.";
      return res.status(409).json({ message });
    }
    console.error("Error during sign up:", error);
    return res.status(500).json({ message: "Unable to create account." });
  }
};

export const login = async (req, res) => {
  try {
    const email =
      typeof req.body?.email === "string"
        ? req.body.email.trim().toLowerCase()
        : "";
    const password =
      typeof req.body?.password === "string" ? req.body.password : "";

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required." });
    }

    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res
        .status(401)
        .json({ message: "Invalid email or password." });
    }

    const token = await genToken(user._id);
    res.cookie("token", token, getCookieOptions());
    return res
      .status(200)
      .json({ message: "Login successful.", user: toPublicUser(user) });
  } catch (error) {
    console.error("Error during login:", error);
    return res.status(500).json({ message: "Unable to log in." });
  }
};

export const logout = (req, res) => {
  const { maxAge, ...clearOptions } = getCookieOptions();
  res.clearCookie("token", clearOptions);
  return res.status(200).json({ message: "Logout successful." });
};
