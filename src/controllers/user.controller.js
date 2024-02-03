import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import { upload } from "../utils/fileUpload.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import { deleteFile } from "../utils/fileDelete.js";
import mongoose from "mongoose";
const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;

    //saving the refresh token to database
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating refresh and access token"
    );
  }
};

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
  //this $or is a mongodb's operator
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

const loginUser = asyncHandler(async (req, res) => {
  //---steps
  //get the email,username,password
  // empty validation
  //check if email exist or not
  // then check the password
  //generate both accesstoken and refresh token
  //send secured cookie

  //getting data from client
  const { email, password, username } = req.body;
  console.log("a:", email, password, username);
  //empty validation
  if ((!email || !username) && !password) {
    throw new ApiError("Username or email or password is required");
  }

  // check if email does not exist
  const user = await User.findOne({ $or: [{ email }, { username }] });
  if (!user) {
    throw new ApiError(
      400,
      `User with ${email || username} does not exist, please register first`
    );
  }
  //check password
  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Password is incorrect");
  }
  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

  const loggedInUser = User.findById(user._id).select(
    "-password -refreshToken"
  );

  //sending access token in cookie
  //after adding this option true then cookie can not be modified by the client side
  // so we must need to set these options true while sending cookie
  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        201,
        { user: user, accessToken, refreshToken },
        "user is logged in successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  // console.log(req.user._id);
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true,
    }
  );
  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User Logged out successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;
  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized request");
  }
  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
    const user = await User.findById(decodedToken._id);
    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }
    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or used");
    }
    const options = {
      httpOnly: true,
      secure: true,
    };
    const { newAccessToken, newRefreshToken } =
      await generateAccessAndRefreshToken(user._id);
    return res
      .status(200)
      .cookie("accessToken", newAccessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { newAccessToken, newRefreshToken },
          "Access token refreshed successfully"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});

const changePassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!(oldPassword && newPassword)) {
    throw new ApiError(400, "All fields are requried");
  }
  const user = await User.findById(req.user?._id);
  const isPasswordCorrect = user.isPasswordCorrect(oldPassword);
  if (!isPasswordCorrect) {
    throw new ApiError(400, "Incorrect old password");
  }
  user.password = newPassword;
  await user.save({ validateBeforeSave: true });
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password reset successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current user successfully passed"));
});

const updateUserDetails = asyncHandler(async (req, res) => {
  const { fullName, email } = req.body;
  if (!(fullName && email)) {
    throw new ApiError(400, "All fields are required");
  }
  const updatedUser = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullName,
        email,
      },
    },
    { new: true }
  ).select("-password");
  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedUser, "Account Details updated successfully")
    );
});
const updateUserAvatar = asyncHandler(async (req, res) => {
  //old image url
  const oldAvatar = req.user.avatar;
  console.log("old image: ", oldAvatar);
  //new image path
  const newAvatarLocalPath = req.files?.newAvatar[0]?.path;
  console.log("new avatar", newAvatarLocalPath);
  if (!newAvatarLocalPath) {
    throw new ApiError(400, "Avatar file is missing");
  }
  const avatarCloudinaryUrl = await upload(newAvatarLocalPath);
  if (!avatarCloudinaryUrl) {
    throw new ApiError(400, "Error while uploading new Avatar");
  }
  const updatedUser = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatarCloudinaryUrl.url,
      },
    },
    { new: true }
  ).select("-password");

  // for deleting old image on cloudinary

  //#later todo
  // const isFileDeleted = await deleteFile(oldAvatar);
  // if (!isFileDeleted) {
  //   throw new ApiError(200, "New image uploaded, but can not delete old image");
  // }

  //finally returning the response
  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedUser, "cover image updated successfully")
    );
});
const updateUserCoverImage = asyncHandler(async (req, res) => {
  //old cover image for delete purpose
  const oldCoverImage = req.user?.coverImage;
  //new cover image
  const coverImageLocalpath = req.files?.newCoverImage[0]?.path;
  console.log(coverImageLocalpath);
  if (!coverImageLocalpath) {
    throw new ApiError(400, "Cover image file is missing");
  }
  const coverImageCloudinaryUrl = await upload(coverImageLocalpath);
  if (!coverImageCloudinaryUrl) {
    throw new ApiError(400, "Error while uploading new Avatar");
  }
  const updatedUser = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImageCloudinaryUrl.url,
      },
    },
    { new: true }
  ).select("-password");
  // # later todo
  // const isOldCoverImageDeleted = await deleteFile(oldCoverImage);
  // if (!isOldCoverImageDeleted) {
  //   throw new ApiError(
  //     200,
  //     "New cover image uploaded, but can not delet the older one"
  //   );
  // }
  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedUser, "cover image updated successfully")
    );
});
const getUserProfile = asyncHandler(async (req, res) => {
  const { username } = req.param;
  if (!username?.trim()) {
    throw new ApiError(400, "username is missing");
  }
  const channel = await User.aggregate([
    {
      $match: { username: username?.toLowerCase() },
    },
    {
      $lookup: {
        from: "subscription",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "subscription",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        subscriberCount: {
          $size: "$subscribers",
        },
        channelsSubscribedToCount: {
          $size: "$subscribedTo",
        },
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        fullName: 1,
        username: 1,
        subscriberCount: 1,
        channelsSubscribedToCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1,
        email: 1,
      },
    },
  ]);
  if (!channel?.length) {
    throw new ApiError(404, "Channel does not exist");
  }
  console.log(channel);
  return res
    .status(200)
    .json(
      new ApiResponse(200, channel[0], "User profile fetched successfully")
    );
});
const getWatchHistory = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user?.id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullName: 1,
                    username: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: {
                $first: "$owner",
              },
            },
          },
        ],
      },
    },
  ]);
});
return res
  .status(200)
  .json(
    new ApiResponse(
      200,
      user[0].watchHistory,
      "Watch history fetched successfully"
    )
  );

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changePassword,
  getCurrentUser,
  updateUserDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserProfile,
  getWatchHistory,
};
