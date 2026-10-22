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
      maxlength: 1_400_000,
    },
  },
  { timestamps: true },
);

messageSchema.pre("validate", function validateMessageContent() {
  if (!this.message && !this.image) {
    this.invalidate("message", "A message must contain text or an image.");
  }
});

const Message = mongoose.model("Message", messageSchema);
export default Message;
