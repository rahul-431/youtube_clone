import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUINARY_API_KEY,
  api_secret: process.env.CLOUINARY_API_SECRET,
});
const upload = async (localFilePath) => {
  try {
    if (!localFilePath) {
      throw new Error("can not find the path");
    }
    //uploading file in cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    //file is uploaded successfully
    // console.log("file is uploaded successfully! at ", response.url);
    fs.unlinkSync(localFilePath);
    return response;
  } catch (error) {
    //for remove the locally saved temporary file as the upload operation is failed
    fs.unlinkSync(localFilePath);
    return null;
  }
};
export { upload };
