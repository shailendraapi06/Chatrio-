import mongoose from "mongoose";
import Conversation from "../models/conversation.model.js";
import Message from "../models/message.model.js";
import User from "../models/user.model.js";

const isValidObjectId = (id) => mongoose.isObjectIdOrHexString(id);
const normalizedId = (id) => new mongoose.Types.ObjectId(id).toString();

const findPrivateConversation = (firstUserId, secondUserId) =>
  Conversation.findOne({
    participants: { $all: [firstUserId, secondUserId], $size: 2 },
  });

export const sendMessage = async (req, res) => {
  const senderId = req.userId;
  const receiverId = req.params.id;
  const messageText =
    typeof req.body?.message === "string" ? req.body.message.trim() : "";
  const image = req.body?.image;

  if (!isValidObjectId(senderId) || !isValidObjectId(receiverId)) {
    return res.status(400).json({ success: false, message: "Invalid user ID." });
  }

  if (normalizedId(senderId) === normalizedId(receiverId)) {
    return res.status(400).json({
      success: false,
      message: "You cannot send a message to yourself.",
    });
  }

  if (!messageText && image === undefined) {
    return res
      .status(400)
      .json({ success: false, message: "A message or image is required." });
  }

  if (messageText.length > 5000) {
    return res.status(400).json({
      success: false,
      message: "Message must be 5000 characters or fewer.",
    });
  }

  if (image !== undefined) {
    const imageMatch =
      typeof image === "string" &&
      image.match(/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+=*)$/);

    if (!imageMatch) {
      return res.status(400).json({
        success: false,
        message: "Choose a PNG, JPEG, or WebP image.",
      });
    }

    if (Buffer.from(imageMatch[2], "base64").length > 1024 * 1024) {
      return res.status(413).json({
        success: false,
        message: "Images must be 1 MB or smaller.",
      });
    }
  }

  let conversation;
  let createdConversation = false;
  let newMessage;

  try {
    const recipient = await User.findById(receiverId).select("_id");
    if (!recipient) {
      return res
        .status(404)
        .json({ success: false, message: "Recipient not found." });
    }

    conversation = await findPrivateConversation(senderId, receiverId);
    if (!conversation) {
      const participantKey = [senderId, receiverId]
        .map(normalizedId)
        .sort()
        .join(":");
      try {
        conversation = await Conversation.create({
          participants: [senderId, receiverId],
          participantKey,
          messages: [],
        });
        createdConversation = true;
      } catch (error) {
        if (error.code !== 11000) {
          throw error;
        }

        conversation = await findPrivateConversation(senderId, receiverId);
        if (!conversation) {
          throw error;
        }
      }
    }

    newMessage = await Message.create({
      senderId,
      receiverId,
      message: messageText,
      ...(image ? { image } : {}),
    });

    conversation.messages.push(newMessage._id);
    await conversation.save();

    const io = req.app.get("io");
    io.to(`user:${senderId}`)
      .to(`user:${receiverId}`)
      .emit("message:new", newMessage);

    return res.status(201).json({
      success: true,
      message: "Message sent successfully.",
      newMessage,
    });
  } catch (error) {
    if (newMessage) {
      try {
        await Message.deleteOne({ _id: newMessage._id });
      } catch (cleanupError) {
        console.error("Unable to remove an unsaved conversation message:", cleanupError);
      }
    }

    if (createdConversation && conversation) {
      try {
        await Conversation.deleteOne({
          _id: conversation._id,
          messages: { $size: 0 },
        });
      } catch (cleanupError) {
        console.error("Unable to remove an empty conversation:", cleanupError);
      }
    }

    console.error("Error sending message:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to send message.",
    });
  }
};

export const getMessage = async (req, res) => {
  const currentUserId = req.userId;
  const otherUserId = req.params.id;

  if (!isValidObjectId(currentUserId) || !isValidObjectId(otherUserId)) {
    return res.status(400).json({ success: false, message: "Invalid user ID." });
  }

  if (normalizedId(currentUserId) === normalizedId(otherUserId)) {
    return res.status(400).json({
      success: false,
      message: "A conversation requires two different users.",
    });
  }

  try {
    const otherUser = await User.findById(otherUserId).select("_id");
    if (!otherUser) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }

    const conversation = await findPrivateConversation(
      currentUserId,
      otherUserId,
    ).populate({
      path: "messages",
      options: { sort: { createdAt: 1, _id: 1 } },
    });

    return res.status(200).json({
      success: true,
      messages: conversation?.messages || [],
    });
  } catch (error) {
    console.error("Error fetching conversation messages:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to fetch messages.",
    });
  }
};
