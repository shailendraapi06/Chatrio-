import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema(
  {
    participants: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
      ],
      validate: {
        validator: (participants) => participants.length === 2,
        message: "A private conversation must have exactly two participants.",
      },
    },
    messages: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Message",
      },
    ],
    clearedAtByUser: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        clearedAt: {
          type: Date,
          required: true,
        },
        _id: false,
      },
    ],
    deletedMessagesByUser: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        messageIds: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Message",
          },
        ],
        _id: false,
      },
    ],
    participantKey: {
      type: String,
      required: true,
      unique: true,
    },
  },
  { timestamps: true },
);

conversationSchema.pre("validate", function setParticipantKey() {
  if (this.participants.length === 2) {
    this.participantKey = this.participants
      .map((participant) => participant.toString())
      .sort()
      .join(":");
  }
});

const Conversation = mongoose.model("Conversation", conversationSchema);
export default Conversation;
