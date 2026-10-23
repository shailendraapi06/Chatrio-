import mongoose from "mongoose";
import Conversation from "../models/conversation.model.js";
import Message from "../models/message.model.js";
import User from "../models/user.model.js";
import AttachmentCleanup from "../models/attachmentCleanup.model.js";
import {
  deleteChatImage,
  isCloudinaryConfigured,
  uploadChatImage,
} from "../services/cloudinary.js";

const isValidObjectId = (id) => mongoose.isObjectIdOrHexString(id);
const normalizedId = (id) => new mongoose.Types.ObjectId(id).toString();
const MESSAGE_TTL_MS = 12 * 60 * 60 * 1000;
const activeMessageFilter = (now) => ({
  $or: [
    { expiresAt: { $gt: now } },
    {
      $and: [
        {
          $or: [
            { expiresAt: { $exists: false } },
            { expiresAt: null },
          ],
        },
        { createdAt: { $gt: new Date(now.getTime() - MESSAGE_TTL_MS) } },
      ],
    },
  ],
});

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
  const replyToId = req.body?.replyTo;

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

  if (replyToId !== undefined && !isValidObjectId(replyToId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid message being replied to.",
    });
  }

  let conversation;
  let createdConversation = false;
  let newMessage;
  let uploadedImage;
  let cleanupJob;

  try {
    const recipient = await User.findById(receiverId).select("_id");
    if (!recipient) {
      return res
        .status(404)
        .json({ success: false, message: "Recipient not found." });
    }

    let repliedMessage = null;
    if (replyToId) {
      repliedMessage = await Message.findOne({
        $and: [
          activeMessageFilter(new Date()),
          {
            _id: replyToId,
            $or: [
              { senderId, receiverId },
              { senderId: receiverId, receiverId: senderId },
            ],
          },
        ],
      }).select("_id message image senderId");

      if (!repliedMessage) {
        return res.status(400).json({
          success: false,
          message: "The message to reply to was not found in this chat.",
        });
      }
    }

    if (image) {
      if (!isCloudinaryConfigured()) {
        return res.status(503).json({
          success: false,
          message:
            "Image sending is unavailable until Cloudinary storage is configured.",
        });
      }
      try {
        uploadedImage = await uploadChatImage(image);
      } catch (storageError) {
        console.error("Chat image upload failed:", storageError.message);
        return res.status(502).json({
          success: false,
          message: "Image storage is unavailable. Please try again.",
        });
      }
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

    const createdAt = new Date();
    const expiresAt = new Date(createdAt.getTime() + MESSAGE_TTL_MS);
    if (uploadedImage) {
      cleanupJob = await AttachmentCleanup.create({
        messageId: new mongoose.Types.ObjectId(),
        publicId: uploadedImage.publicId,
        dueAt: expiresAt,
      });
    }

    newMessage = await Message.create({
      senderId,
      receiverId,
      message: messageText,
      ...(uploadedImage
        ? {
            image: uploadedImage.url,
            attachmentPublicId: uploadedImage.publicId,
          }
        : {}),
      createdAt,
      expiresAt,
      ...(repliedMessage
        ? {
            replyTo: {
              messageId: repliedMessage._id,
            },
          }
        : {}),
    });
    if (cleanupJob) {
      cleanupJob.messageId = newMessage._id;
      await cleanupJob.save();
    }
    if (repliedMessage) {
      await newMessage.populate({
        path: "replyTo.messageId",
        select: "_id message image senderId expiresAt",
        match: activeMessageFilter(new Date()),
      });
    }

    const io = req.app.get("io");
    io.to(`user:${senderId}`)
      .to(`user:${receiverId}`)
      .emit("message:new", newMessage.toJSON());

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
    if (uploadedImage) {
      if (cleanupJob) {
        try {
          await AttachmentCleanup.updateOne(
            { _id: cleanupJob._id },
            { $set: { dueAt: new Date(), nextAttemptAt: new Date() } },
          );
        } catch (cleanupError) {
          console.error("Unable to schedule cleanup for an unsaved chat image:", cleanupError.message);
        }
      }
      try {
        await deleteChatImage(uploadedImage.publicId);
        if (cleanupJob) {
          await AttachmentCleanup.deleteOne({ _id: cleanupJob._id });
        }
      } catch (cleanupError) {
        console.error("Unable to remove an unsaved chat image; cleanup will be retried:", cleanupError.message);
      }
    }

    console.error("Error sending message:", error.message);
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
    );
    const now = new Date();
    const before =
      typeof req.query.before === "string" ? new Date(req.query.before) : null;
    if (before && Number.isNaN(before.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid message history cursor.",
      });
    }
    const messages = await Message.find({
      $and: [
        {
          $or: [
            { senderId: currentUserId, receiverId: otherUserId },
            { senderId: otherUserId, receiverId: currentUserId },
          ],
        },
        activeMessageFilter(now),
        ...(before ? [{ createdAt: { $lt: before } }] : []),
      ],
    })
      .sort({ createdAt: -1, _id: -1 })
      .limit(101)
      .populate({
        path: "replyTo.messageId",
        select: "_id message image senderId expiresAt",
        match: activeMessageFilter(now),
      })
      .lean();
    const hasMore = messages.length > 100;
    const page = messages
      .slice(0, 100)
      .reverse()
      .map((message) => ({
        ...message,
        expiresAt:
          message.expiresAt ||
          new Date(message.createdAt.getTime() + MESSAGE_TTL_MS),
      }));

    return res.status(200).json({
      success: true,
      messages: conversation ? page : [],
      hasMore: Boolean(conversation && hasMore),
      nextBefore:
        conversation && hasMore
          ? page[0]?.createdAt?.toISOString()
          : null,
    });
  } catch (error) {
    console.error("Error fetching conversation messages:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to fetch messages.",
    });
  }
};
