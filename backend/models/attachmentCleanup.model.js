import mongoose from "mongoose";

const attachmentCleanupSchema = new mongoose.Schema(
  {
    messageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      required: true,
    },
    publicId: {
      type: String,
      required: true,
    },
    dueAt: {
      type: Date,
      required: true,
    },
    nextAttemptAt: {
      type: Date,
      default: Date.now,
    },
    attempts: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

attachmentCleanupSchema.index(
  { messageId: 1, publicId: 1 },
  { unique: true },
);
attachmentCleanupSchema.index({ dueAt: 1, nextAttemptAt: 1 });

const AttachmentCleanup = mongoose.model(
  "AttachmentCleanup",
  attachmentCleanupSchema,
);
export default AttachmentCleanup;
