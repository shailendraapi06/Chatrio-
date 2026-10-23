import mongoose from "mongoose";
import Conversation from "../models/conversation.model.js";
import Message from "../models/message.model.js";
import User from "../models/user.model.js";

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
const visibleMessageFilter = (now, clearedAt, hiddenMessageIds = []) => ({
  $and: [
    activeMessageFilter(now),
    ...(clearedAt ? [{ createdAt: { $gt: clearedAt } }] : []),
    ...(hiddenMessageIds.length
      ? [{ _id: { $nin: hiddenMessageIds } }]
      : []),
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

  try {
    const recipient = await User.findById(receiverId).select("_id");
    if (!recipient) {
      return res
        .status(404)
        .json({ success: false, message: "Recipient not found." });
    }

    conversation = await findPrivateConversation(senderId, receiverId);
    const clearedAt = (conversation?.clearedAtByUser || []).find(
      (entry) => String(entry.userId) === String(senderId),
    )?.clearedAt;
    const hiddenMessageIds =
      (conversation?.deletedMessagesByUser || []).find(
        (entry) => String(entry.userId) === String(senderId),
      )?.messageIds || [];

    let repliedMessage = null;
    if (replyToId) {
      repliedMessage = await Message.findOne({
        $and: [
          visibleMessageFilter(new Date(), clearedAt, hiddenMessageIds),
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

    newMessage = await Message.create({
      senderId,
      receiverId,
      message: messageText,
      ...(image ? { image } : {}),
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
    if (repliedMessage) {
      await newMessage.populate({
        path: "replyTo.messageId",
        select: "_id message image senderId expiresAt",
        match: visibleMessageFilter(new Date(), clearedAt, hiddenMessageIds),
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
    const clearedAt = (conversation?.clearedAtByUser || []).find(
      (entry) => String(entry.userId) === String(currentUserId),
    )?.clearedAt;
    const hiddenMessageIds =
      (conversation?.deletedMessagesByUser || []).find(
        (entry) => String(entry.userId) === String(currentUserId),
      )?.messageIds || [];
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
        visibleMessageFilter(now, clearedAt, hiddenMessageIds),
        ...(before ? [{ createdAt: { $lt: before } }] : []),
      ],
    })
      .sort({ createdAt: -1, _id: -1 })
      .limit(101)
      .populate({
        path: "replyTo.messageId",
        select: "_id message image senderId expiresAt",
        match: visibleMessageFilter(now, clearedAt, hiddenMessageIds),
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

export const deleteConversationForUser = async (req, res) => {
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
    const conversation = await findPrivateConversation(
      currentUserId,
      otherUserId,
    );
    if (conversation) {
      const clearedAt = new Date();
      const entries = conversation.clearedAtByUser || [];
      const entry = entries.find(
        (item) => String(item.userId) === String(currentUserId),
      );
      if (entry) {
        entry.clearedAt = clearedAt;
      } else {
        entries.push({
          userId: currentUserId,
          clearedAt,
        });
        conversation.clearedAtByUser = entries;
      }
      await conversation.save();
    }

    return res.status(200).json({
      success: true,
      message: "Chat deleted from your history.",
    });
  } catch (error) {
    console.error("Error deleting conversation history:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to delete this chat.",
    });
  }
};

export const deleteMessageForUser = async (req, res) => {
  const currentUserId = req.userId;
  const otherUserId = req.params.id;
  const messageId = req.params.messageId;

  if (
    !isValidObjectId(currentUserId) ||
    !isValidObjectId(otherUserId) ||
    !isValidObjectId(messageId)
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid user or message ID.",
    });
  }

  if (normalizedId(currentUserId) === normalizedId(otherUserId)) {
    return res.status(400).json({
      success: false,
      message: "A conversation requires two different users.",
    });
  }

  try {
    const [conversation, message] = await Promise.all([
      findPrivateConversation(currentUserId, otherUserId),
      Message.findOne({
        _id: messageId,
        $or: [
          { senderId: currentUserId, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: currentUserId },
        ],
      }).select("_id"),
    ]);

    if (!conversation || !message) {
      return res.status(404).json({
        success: false,
        message: "Message not found in this conversation.",
      });
    }

    const entries = conversation.deletedMessagesByUser || [];
    let entry = entries.find(
      (item) => String(item.userId) === String(currentUserId),
    );
    if (!entry) {
      entry = { userId: currentUserId, messageIds: [] };
      entries.push(entry);
      conversation.deletedMessagesByUser = entries;
    }
    if (!entry.messageIds.some((id) => String(id) === String(messageId))) {
      entry.messageIds.push(messageId);
    }
    await conversation.save();

    return res.status(200).json({
      success: true,
      message: "Message deleted from your history.",
    });
  } catch (error) {
    console.error("Error deleting message from user history:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to delete this message.",
    });
  }
};
