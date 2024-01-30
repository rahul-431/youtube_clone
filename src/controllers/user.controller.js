import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import { upload } from "../utils/fileUpload.js";
import { ApiResponse } from "../utils/ApiResponse.js";
const registerUser = asyncHandler(async (req, res) => {
  //get user details from frontend
  //validation not-empty
  //check if user already exist :username and email
  //check for image, check for avatar
  //image upload to cloudinary, avatar
  //create user object-create entry in db
  //remove password and refresh token field from response
  //check for user creation
  //return response

  //getting user details from frontend
  const { username, email, fullName, password } = req.body;

  //validation check
  if (
    [username, email, fullName, password].some((item) => item?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }

  //check if user already exist or not
  const existedUser = await User.findOne({ $or: [{ username }, { email }] });
  if (existedUser) {
    throw new ApiError(409, "User with username or email is already exist");
  }

  //checking for image(avatar)
  // console.log(req.files);
  const avatarLocalpath = req.files?.avatar[0]?.path;
  // const coverImageLocalPath = req.files?.coverImage[0].path;
  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }
  if (!avatarLocalpath) {
    throw new ApiError(400, "Avatar is required");
  }

  //image uploading in cloudinary
  const avatar = await upload(avatarLocalpath);
  let coverImage;
  if (coverImageLocalPath) {
    coverImage = await upload(coverImageLocalPath);
  }

  //checking that avatar is successfully uploaded or not if not throw a message
  if (!avatar) {
    throw new ApiError(400, "Avatar is required");
  }

  //creating user and add entry in db
  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });

  //check if user is successfully created or not
  //   and filter the created user by not adding password and refresh token
  //that we dont want to send the response with password or refresh token
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  //   checking if user is created successfully or not
  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering new user");
  }

  //sending the resoponse
  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User registered successfully"));
});

export { registerUser };
