import User from "../models/user.model.js";

export const getContacts = async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.userId } })
      .select("username image")
      .sort({ username: 1 })
      .lean();

    return res.status(200).json({
      users: users.map((user) => ({
        id: user._id.toString(),
        username: user.username,
        image: user.image,
      })),
    });
  } catch (error) {
    console.error("Error fetching contacts:", error);
    return res.status(500).json({ message: "Unable to fetch contacts." });
  }
};

export const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    return res.status(200).json({
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        image: user.image,
      },
    });
  } catch (error) {
    console.error("Error fetching current user:", error);
    return res.status(500).json({ message: "Unable to fetch current user." });
  }
};

export const updateCurrentUser = async (req, res) => {
  const username =
    typeof req.body?.username === "string" ? req.body.username.trim() : "";
  const email =
    typeof req.body?.email === "string"
      ? req.body.email.trim().toLowerCase()
      : "";
  const image = req.body?.image;

  if (!username || !email) {
    return res
      .status(400)
      .json({ message: "Username and email are required." });
  }

  if (username.length < 2) {
    return res
      .status(400)
      .json({ message: "Username must be at least 2 characters long." });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ message: "Enter a valid email address." });
  }

  if (image !== undefined) {
    const imageMatch =
      typeof image === "string" &&
      image.match(/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+=*)$/);

    if (!imageMatch) {
      return res
        .status(400)
        .json({ message: "Choose a PNG, JPEG, or WebP profile photo." });
    }

    const imageSize = Buffer.from(imageMatch[2], "base64").length;
    if (imageSize > 1024 * 1024) {
      return res
        .status(413)
        .json({ message: "Profile photos must be 1 MB or smaller." });
    }
  }

  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    user.username = username;
    user.email = email;
    if (image !== undefined) {
      user.image = image;
    }

    await user.save();

    return res.status(200).json({
      message: "Profile updated successfully.",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        image: user.image,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      const duplicateField = Object.keys(error.keyPattern || {})[0];
      const message =
        duplicateField === "username"
          ? "Username already exists."
          : "Email already exists.";
      return res.status(409).json({ message });
    }

    console.error("Error updating current user:", error);
    return res.status(500).json({ message: "Unable to update profile." });
  }
};