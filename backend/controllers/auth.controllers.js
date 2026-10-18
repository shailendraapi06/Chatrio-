import bcrypt from "bcryptjs";
import User from "../models/user.model.js";
import genToken from "../config/token.js";

export const signUp = async (req, res) => {
  try {
    const { username, email, password } = req.body
    const checkUserByUsername = await User.findOne({ username });
    if (checkUserByUsername) {
      return res.status(400).json({ message: "Username already exists" });
    }

    const checkUserByEmail = await User.findOne({ email });
    if (checkUserByEmail) {
      return res.status(400).json({ message: "Email already exists" });
    }

    if(password.length < 6){
      return res.status(400).json({ message: "Password must be at least 6 characters long" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      username,
      email,
      password: hashedPassword
    });

    const token = await genToken(user._id);

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000 ,// 7 days

      sameSite : process.env.NODE_ENV === "production" ? "None" : "Lax"
    });

    res.status(201).json({ message: "User created successfully", token });
  } catch (error) {
    console.error("Error during sign up:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// login 

 export const login = async (req, res) => {

  try {
    const { email, password } = req.body; 
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const token = await genToken(user._id);

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000 ,// 7 days

      sameSite : process.env.NODE_ENV === "production" ? "None" : "Lax"
    });

    res.status(200).json({ message: "Login successful", token });
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};




// logout


export const logout = async (req, res) => {
  try {
    res.clearCookie("token");
    res.status(200).json({ message: "Logout successful" });
  } catch (error) {
    console.error("Error during logout:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}; 
