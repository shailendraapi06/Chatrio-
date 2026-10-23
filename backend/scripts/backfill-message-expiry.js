import dotenv from "dotenv";
import mongoose from "mongoose";
import Message from "../models/message.model.js";
import connectDB from "../config/db.js";

dotenv.config();

const apply = process.argv.includes("--apply");
const useOriginalCreationDate = process.argv.includes("--policy=original");
const graceHours = 12;

await connectDB();

try {
  const filter = {
    $or: [{ expiresAt: { $exists: false } }, { expiresAt: null }],
  };
  const count = await Message.countDocuments(filter);
  console.log(
    `${apply ? "Applying" : "Dry run"}: ${count} existing messages need expiry dates.`,
  );

  if (apply && count > 0) {
    const graceExpiry = new Date(Date.now() + graceHours * 60 * 60 * 1000);
    const expiresAt = useOriginalCreationDate
      ? {
          $dateAdd: {
            startDate: { $ifNull: ["$createdAt", "$$NOW"] },
            unit: "hour",
            amount: graceHours,
          },
        }
      : null;

    if (expiresAt) {
      await Message.collection.updateMany(filter, [
        {
          $set: {
            expiresAt: {
              $dateAdd: {
                startDate: "$createdAt",
                unit: "hour",
                amount: graceHours,
              },
            },
          },
        },
      ]);
    } else {
      await Message.collection.updateMany(filter, {
        $set: { expiresAt: graceExpiry },
      });
    }
    console.log(
      useOriginalCreationDate
        ? "Existing messages now expire 12 hours after their original creation time."
        : "Existing messages received a 12-hour grace period from migration time.",
    );
  } else if (!apply) {
    console.log("No data changed. Add --apply to run the migration.");
  }
} finally {
  await mongoose.disconnect();
}
