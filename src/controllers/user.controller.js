import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/apiError.js";
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/apiResponse.js";

const registerUser = asyncHandler (async (req, res) => {
       
       //Getting Data from Frontend
       const {fullName, email, userName, password} = req.body;
       
       //Validate 

       if ([fullName, email, userName, password].some (() => field?.trim() === ""))
              {
                     throw new ApiError(400, "All Fields are required");
              }

       //User Already Exist
       const existedUser = User.findOne({
              $or: [{email},{userName}]
       })
       
       if (existedUser){
              throw new ApiError(400, "User already exists");
       }

       //Images
       const avatarLocalPath = req.files?.avatar[0]?.path;
       const coverImageLocalPath = req.files?.coverImage[0]?.path

       if (!avatarLocalPath){
              throw new ApiError (409, "Avatar File is required")
       }

       const avatar = await uploadOnCloudinary(avatarLocalPath)
       const coverImage = await uploadOnCloudinary(coverImageLocalPath)

       if (!avatar){
              throw new ApiError(409, "Avatar Upload Failed")
       }

       //create user object
       const user = await User.create({
              fullName,
              avatar : avatar.url,
              coverImage : coverImage?.url || "",
              email,
              userName : userName.toLowerCase(),
              password

       })

       //remove password and refresh Token
       const createduser = await User.findById(user._id).select(
              "-password -refreshToken"
       )

       //check for user creation
       if (!createduser){
              throw new ApiError(500, "Something Went wrong")
       }

       //check response
       return res.status(201).json(
              new ApiResponse(200,createduser,"User Registered")
       )


}) 

export {registerUser}