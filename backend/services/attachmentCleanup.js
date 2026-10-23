import AttachmentCleanup from "../models/attachmentCleanup.model.js";
import Message from "../models/message.model.js";
import { deleteChatImage, isCloudinaryConfigured } from "./cloudinary.js";

const MAX_RETRY_DELAY_MS = 60 * 60 * 1000;

export async function processAttachmentCleanup() {
  if (!isCloudinaryConfigured()) {
    return;
  }

  const now = new Date();
  const jobs = await AttachmentCleanup.find({
    dueAt: { $lte: now },
    nextAttemptAt: { $lte: now },
  })
    .sort({ dueAt: 1 })
    .limit(25)
    .lean();

  for (const job of jobs) {
    try {
      const stillReferenced = await Message.exists({
        attachmentPublicId: job.publicId,
        expiresAt: { $gt: now },
      });
      if (stillReferenced) {
        await AttachmentCleanup.deleteOne({ _id: job._id });
        continue;
      }

      await deleteChatImage(job.publicId);
      await AttachmentCleanup.deleteOne({ _id: job._id });
    } catch (error) {
      const attempts = job.attempts + 1;
      const delay = Math.min(2 ** Math.min(attempts, 10) * 1000, MAX_RETRY_DELAY_MS);
      await AttachmentCleanup.updateOne(
        { _id: job._id },
        {
          $set: {
            attempts,
            nextAttemptAt: new Date(Date.now() + delay),
          },
        },
      );
      console.error("Unable to clean up an expired chat attachment:", error.message);
    }
  }
}

export function startAttachmentCleanupWorker() {
  if (!isCloudinaryConfigured()) {
    console.error(
      "Chat attachment cleanup is disabled; configure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.",
    );
  }
  const run = () => {
    processAttachmentCleanup().catch((error) => {
      console.error("Attachment cleanup worker failed:", error.message);
    });
  };
  run();
  return setInterval(run, 60 * 1000);
}
