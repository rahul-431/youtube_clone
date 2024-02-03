import { v2 as cloudinary } from "cloudinary";
import { ApiError } from "./ApiError.js";
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUINARY_API_KEY,
  api_secret: process.env.CLOUINARY_API_SECRET,
});
const deleteFile = async (cloudinaryFilePath) => {
  try {
    if (!cloudinaryFilePath) {
      throw new Error("can not find the file");
    }
    //uploading file in cloudinary
    const response = await cloudinary.uploader.destroy(cloudinaryFilePath, {
      resource_type: "auto",
    });
    //file is uploaded successfully
    return response;
  } catch (error) {
    throw new ApiError(400, "Issue in deleting files");
  }
};
export { deleteFile };
