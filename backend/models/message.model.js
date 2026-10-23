import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    message: {
      type: String,
      default: "",
      trim: true,
      maxlength: 5000,
    },
    image: {
      type: String,
      default: "",
      maxlength: 2048,
    },
    attachmentPublicId: {
      type: String,
      select: false,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    replyTo: {
      type: new mongoose.Schema(
        {
          messageId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Message",
            required: true,
          },
        },
        { _id: false },
      ),
      default: undefined,
    },
  },
  { timestamps: true },
);

messageSchema.index({ senderId: 1, createdAt: -1 });
messageSchema.index({ receiverId: 1, createdAt: -1 });
messageSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 },
);

messageSchema.pre("validate", function validateMessageContent() {
  if (!this.message && !this.image) {
    this.invalidate("message", "A message must contain text or an image.");
  }
});

messageSchema.set("toJSON", {
  transform(_document, value) {
    delete value.attachmentPublicId;
    return value;
  },
});

const Message = mongoose.model("Message", messageSchema);
export default Message;
