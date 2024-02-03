import { Router } from "express";
import {
  changePassword,
  getCurrentUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  registerUser,
  updateUserAvatar,
  updateUserCoverImage,
  updateUserDetails,
} from "../controllers/user.controller.js";
import { uploadLocally } from "../middlewares/multer.middleware.js";
import { verifyJwt } from "../middlewares/auth.middleware.js";

const router = Router();

//this upload.fields is a middleware which works as a middle man
router.route("/register").post(
  uploadLocally.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
    {
      name: "coverImage",
      maxCount: 1,
    },
  ]),
  registerUser
);

router.route("/login").post(loginUser);

//secured route
// it means that first verify the access token and then goes to the next step
//if there is no valid token then the second task will not execute
router.route("/logout").post(verifyJwt, logoutUser);
router.route("/refreshToken").post(refreshAccessToken);
router.route("/changePassword").post(verifyJwt, changePassword);
router.route("/changeAvatar").post(
  verifyJwt,
  uploadLocally.fields([
    {
      name: "newAvatar",
      maxCount: 1,
    },
  ]),
  updateUserAvatar
);
router.route("/changeCoverImage").post(
  verifyJwt,
  uploadLocally.fields([
    {
      name: "newCoverImage",
      maxCount: 1,
    },
  ]),
  updateUserCoverImage
);
router.route("/getCurrentUser").post(verifyJwt, getCurrentUser);
router.route("/updateUserDetails").post(verifyJwt, updateUserDetails);
export default router;
