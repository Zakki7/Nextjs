import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/apiResponse.js";
import jwt from "jsonwebtoken";
// ================= REGISTER USER =================
const registerUser = asyncHandler(async (req, res) => {
  // Getting Data from Frontend
  const { fullName, email, username, password } = req.body;

  // Validate
  if ([fullName, email, username, password].some((field) => field?.trim() === "")) {
    throw new ApiError(400, "All Fields are required");
  }

  // User Already Exist
  const existedUser = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (existedUser) {
    throw new ApiError(400, "User already exists");
  }

  // Images
  const avatarLocalPath = req.files?.avatar?.[0]?.path;
  let coverImageLocalPath;
  if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
    coverImageLocalPath = req.files.coverImage[0]?.path;
  }

  if (!avatarLocalPath) {
    throw new ApiError(409, "Avatar File is required");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(409, "Avatar Upload Failed");
  }

  // Create user object
  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    username: username.toLowerCase(),
    password,
  });

  // Remove password and refresh Token
  const createduser = await User.findById(user._id).select("-password -refreshToken");

  // Check for user creation
  if (!createduser) {
    throw new ApiError(500, "Something Went wrong");
  }

  // Check response
  return res.status(201).json(new ApiResponse(200, createduser, "User Registered"));
});

// Generate Token 
const generateAccessTokenAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false }); // saving refresh token in db

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(500, "Something went wrong while generating Refresh and Access Token");
  }
};

// Login USER
const loginUSer = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;

  if (!username && !email) {
    throw new ApiError(401, "Email or Username Required");
  }

  const user = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (!user) {
    throw new ApiError(401, "Doesnot Exist");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid Password");
  }

  const { accessToken, refreshToken } = await generateAccessTokenAndRefreshTokens(user._id);

  const loggedInUSer = await User.findById(user._id).select("-password -refreshToken");

  const option = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, option)
    .cookie("refreshToken", refreshToken, option)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUSer,
          accessToken,
          refreshToken,
        },
        "User Logged In"
      )
    );
});

// Logout User
const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user?._id,  // req.user is populated from auth middleware
    { $set: { refreshToken: undefined } },
    { new: true }
  );

  const option = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", option)
    .clearCookie("refreshToken", option)
    .json({ message: "User Logged Out" });
});

// Refresh token access point 

const refreshAccessToken = asyncHandler(async(req,res) => {
       // access token from cookies
     const incomingRefreshToken =  req.cookie.refreshToken || req.body.refreshToken

     if(!incomingRefreshToken){
       throw new ApiError (401, "Unauthorized Request")
     }

     //verify 
    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
   
        const user = await User.findById(decodedToken?._id)
   
        if(!user){
          throw new ApiError(401, "Invalid refresh Token")
        }
   
        if(incomingRefreshToken !== user?.refreshToken){
          throw new ApiError(401, "Refresh Token is Expired")
        }
   
         const option = {
           httpOnly: true,
           secure: true,
          }
   
          const {accessToken,newrefreshToken} = await generateAccessTokenAndRefreshTokens(user._id)
   
          return res.
          status(200)
          .cookie("accessToken",accessToken,option)
          .cookie("refreshToken", newrefreshToken,option)
          .json(new ApiResponse(
   
                 200,
                 {accessToken, refreshToken : newrefreshToken},
                 "Access token refreshed"
          )
   
          )
   
    } catch (error) {
       throw new ApiError (401, error?.message || "invalid refresh token")
    }
}) 
// Change Password
const changeCurrentPassword = asyncHandler(async(req,re)=> {

    const {oldpassword , newpassword, confirmpassword} = req.body

    if (!(newpassword === confirmpassword)){
      throw new ApiError(400, "Please enter new password and confirm password")
      }

    const user = await User.findById(req.user?._id)

    const isPasswordCorrect = user.isPasswordCorrect(oldpassword)
    if(!isPasswordCorrect){
      throw new ApiError(401, "Invalid Old Password")
      }
    
    if (newpassword === oldpassword){
      throw new ApiError(400, "New password should not be same as old password")
    }

    User.password = newpassword
    await User.save ({validateBeforeSave : false})

    res
    .status(200)
    .json(
      new ApiResponse (
        200,
        {},
        "Password Changed"
        )
    )


})

//current user
const getCurrentUser = asyncHandler(async(req,res) => {
  return res.
  status(200)
  .json(200, req.user, "Current user feched")
})

//Upadating
const updateAccountDetails = asyncHandler(async(req,res) => {
  const {fullName , email} = req.body
  if (!email || !fullName){
    throw new ApiError(400, "Please enter email and full name")
  }
   const user = await User.findByIdAndUpdate(
    user.req?._id,
    {
      $set :{
            fullName : fullName ,
            email : email}, 
    },
    {new : true}

   ).select("-password")

   res
   .status(200)
   .json(new ApiResponse(200, user, "Account updated"))
})

//updating avtar

const updateAvatar = asyncHandler(async(req,res) => {
  const avatarLocalPath = req.file?.path
  if (!avatarLocalPath){
    throw new ApiError(400, "Avatar file missing")
  }
  const avatar  = await uploadOnCloudinary(avatarLocalPath)

  if(!avatar.url){
    throw new ApiError(400, "Avatar upload failed")
  }

  const user = await User.findByIdAndUpdate(
    user.req?._id,
    {$set:{
      avatar : avatar.url
    }},
    {new : true}
  ).select("-password")

   return res
  .status(200)
  .json(new ApiResponse(200, user, "Avatar Image updated"))

}) 

//updating CoverImage
const updateCoverImage = asyncHandler(async(req,res)=>{
  const coverImageLocalPath = req.file?.path
  if(!coverImageLocalPath){
    throw new ApiError(400, "Cover Image file missing")
  }
  const coverImage = await uploadOnCloudinary(coverImageLocalPath) 

  if(!coverImage.url){
    throw new ApiError(400, "Cover Image upload failed")
  }
  const user = User.findByIdAndUpdate(
    user.file?._id,
    {$set:{
      coverImage : coverImage.url
      }},
      {new : true}
  ).select("-password")

  return res
  .status(200)
  .json(new ApiResponse(200, user, "Cover Image updated"))
})

export { registerUser, 
        loginUSer, 
        logoutUser, 
        refreshAccessToken, 
        changeCurrentPassword,
        getCurrentUser,
        updateAccountDetails,
        updateAvatar,
        updateCoverImage};