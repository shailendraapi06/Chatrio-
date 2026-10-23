import { v2 as cloudinary } from "cloudinary";

export const isCloudinaryConfigured = () =>
  Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET,
  );

const configureCloudinary = () => {
  if (!isCloudinaryConfigured()) {
    throw new Error("Cloudinary image storage is not configured.");
  }

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
};

export const uploadChatImage = (dataUrl) => {
  configureCloudinary();
  return new Promise((resolve, reject) => {
    const upload = cloudinary.uploader.upload_stream(
      {
        folder: "chatrio/messages",
        resource_type: "image",
        allowed_formats: ["png", "jpg", "jpeg", "webp"],
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else if (!result?.secure_url || !result.public_id) {
          reject(new Error("Image storage returned an incomplete result."));
        } else {
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
          });
        }
      },
    );

    const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
    upload.end(Buffer.from(base64, "base64"));
  });
};

export const deleteChatImage = (publicId) => {
  configureCloudinary();
  return cloudinary.uploader
    .destroy(publicId, {
      resource_type: "image",
      invalidate: true,
    })
    .then((result) => {
      if (!["ok", "not found"].includes(result.result)) {
        throw new Error("Cloudinary did not confirm image deletion.");
      }
      return result;
    });
};
