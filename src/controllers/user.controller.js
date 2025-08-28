import {asyncHandler} from "../utils/asyncHandler.js"
import {User} from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import jwt from "jsonwebtoken"
import mongoose from "mongoose"




const genrateAccessAndRefreshTokens=async(userId)=>{
    try{
        const user=await User.findById(userId)
        const accessToken=user.genrateAccessToken();
        const refreshToken=user.genrateRefreshToken()

        user.refreshToken=refreshToken
        //FOR ONLY UPDATING ONLY FIELD=>REFRESH TOKEN, WITHOUT KICKING IN THE VALIDATION FIELD THAT IS THE SCHEMA
        await user.save( {validateBeforeSave:false})

        return {accessToken,refreshToken}
    }catch(error){
        console.log("SOMETHING WENT WRONG WHILE GENRATING ACCESS AND REFRESH TOKEN")
    }
}







//EXTRACT ALL THE INFORMATION, ALSO BCRYT THE PASSWORD
//CHECK IF IT IS VALID AND STORE IT IN THE DATABASE
//MAYBE SEND THE ACCESS AND THE REFRESH TOKEN
const registerUser=async (req,res)=>{
    try{
        const {username,email,fullname,password}=req.body
        // console.log(username)
        // if(fullname===""){
        //     res.status(400).json({msg:"please provie a fullname"})
        // }
        if([fullname,email,username,password].some((field)=> field?.trim()==="")){
            res.status(400).json({msg:"ALL FIELDS ARE REQUIRED"})
        }
        const existedUser=await User.findOne({
            $or:[{email} , {username}]
        })
        if(existedUser){
            res.staus(400).json("USER ALREADY EXISTED")
        }

        // console.log("reached")

        const avatarLocalPath=req.files?.avatar[0]?.path;
        const coverImageLocalPath=req.files?.coverImage[0]?.path;

        // console.log(avatarLocalPath)

        if(!avatarLocalPath){
            res.status(400).send({msg:"avatar file is required"})
        }

        const avatar=await uploadOnCloudinary(avatarLocalPath)
        const coverImage=await uploadOnCloudinary(coverImageLocalPath)

        if(!avatar){
            res.status(400).send({msg:"avatar error"})
        }

        const user=await User.create({
            fullname,
            avatar:avatar.url,
            coverImage:coverImage?.url || "",
            email,
            password,
            username:username.toLowerCase()
        })

        const createdUser=await User.findById(user._id).select(
            "-password -refreshToken"
        )
        if(!createdUser){
            res.status(500).send({msg:"something went wrong while registering a user"})
        }

        res.status(201).json({createdUser})


    }catch(err){
        res.status(500).send("ERROR")
    }
    
}

//VERIFY THE USER FROM THE DATABASE(JWT VERFIY FOR PASSWORD)
//IF PRESENT THAN LOGIN THE USER AND CREATE A REFRESH AND AN ACCESS TOKEN, STORE THE REFRESH TOKEM IN THE DATABSE. ALSO SEND THE ACCESS AND THE REFRESH TOKEN TO THE USER
const loginUser=async(req,res)=>{
    try{
        const {email,username,password}=req.body;

        if(!username && !email){
            res.status(400).send({msg:"username or email is required"})
        }

        const user=await User.findOne({
            $or:[{username},{email}]
        })

        if(!user){
            res.status(404).send({msg:"USER DOES NOT EXIST"})
        }

        const isPasswordValid=await user.isPasswordCorrect(password);
        if(!isPasswordValid){
            res.status(401).send({msg:"PASSWORD INVALID"})
        }

        const {accessToken,refreshToken}=await genrateAccessAndRefreshTokens(user._id);

        const loggedInUser=await User.findById(user._id).select("-password -refreshToken");


        // BY THIS OPTIONS ONLY THE SERVER CAN MODIFY THE COOKIE, NOT MODIFIABLE THROUGH THE FRONTEND
        const options={
            httpOnly:true,
            secure:true
        }

        return res
        .status(200)
        .cookie("accessToken",accessToken,options)
        .cookie("refreshToken",refreshToken,options)
        .json({user:loggedInUser,accessToken,refreshToken},"user logged in successfully")

    }catch(err){
        console.log("ERROR",err)
    }
}

const logoutUser=async(req,res)=>{
    try{
        await User.findByIdAndUpdate(
            req.user._id,
            {
                $set:{
                    refreshToken:""
                }
            },
            {
                new:true
            }
        )

        const options={
            httpOnly:true,
            secure:true
        }
        return res
        .status(200)
        .clearCookie("accessToken",options)
        .clearCookie("refreshToken",options)
        .json("USER LOGOUT OUT SUCCESSFULLY")
    }catch(error){
        console.log(error)
    }
}


const refreshAccessToken=async(req,res)=>{
    try{
        const incomingRefreshToken=req.cookies.refreshToken;
        if(!incomingRefreshToken){
            res.status(400).json("NO REFRESH TOKEN")
        }
        const decodedToken=jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET)

        const user=await User.findById(decodedToken._id)
        if(!user){
            res.status(400).send({msg:"Invalid refresh token"})
        }
        if(incomingRefreshToken!==user?.refreshToken){
            res.status(400).send({msg:"refresh token is expired"})
        }
        const options={
            httpOnly:true,
            secure:true,
        }
        const {accessToken,refreshToken}=await genrateAccessAndRefreshTokens(user._id);
        return res
        .status(200)
        .cookie("accessToken",accessToken,options)
        .cookie("refreshToken",refreshToken,options)
        .json("SUCCESSFULLY UPDATED THE TOKENS")
    }catch(err){
        res.status(500).send({msg:"error"})
    }
}



const changeCurrentPassword=async(req,res)=>{
    try {
        const {oldPassword,newPassword}=req.body;

        //IF HE IS ABLE TO CHANGE THE PASSWORD THAN THE USER IS LOGED IN. SO THE req ALREADY HAS THE user PROPERTY ATTACHED
        const user=await User.findById(req.user?._id)
        
        const isPasswordCorrect=await user.isPasswordCorrect(oldPassword);
        if(!isPasswordCorrect){
            res.status(401).send({msg:"INVAALID OLD PASSWORD"})
        }
        user.password=newPassword
        await user.save({validateBeforeSave:false})
        res.status(200).send({msg:"PASSWORD UPDATED SUCCESSFULLY"})
    } catch (error) {
        res.status(500).send({msg:"ERROR"})
    }
}

const getCurrentUser=async(req,res)=>{
    try {
        return res
        .status(200)
        .json(req.user)
    } catch (error) {
        res.status(500).send({msg:"ERROR"})
    }
}


const updateAccountDetails=async(req,res)=>{
    try {
        const {fullname,email}=req.body;

        if(!fullname || !email){
            res.status(400).send({msg:"ALL FIELDS ARE REQUIRED"})
        }

        const user=await User.findByIdAndUpdate(
            req.user?._id,
            {
                $set:{
                    fullname:fullname,
                    email:email,
                }
            },
            {new:true}
        ).select("-password")
        res.status(200).json("UPDATES SUCCESSFULLY",user)
    } catch (error) {
        res.status(500).send({msg:"ERROR"})
    }
}

const updateAvatar=async(req,res)=>{
    try {
        const avatarLocalPath=req.file?.path;
        if(!avatarLocalPath){
            res.status(400).send({msg:"DID NOT RECIEVED THE AVATAR FILE"})
        }

        const avatar=await uploadOnCloudinary(avatarLocalPath);

        if(!avatar){
            res.status(500).send({msg:"ERROR ON UPLOADING ON CLOUDINARY"})
        }
        await User.findByIdAndUpdate(
            req.user?._id,
            {
                $set:{
                    avatar:avatar.url
                }
            },
            {new:true}
        ).select("-password")
        res.status(200).json("AVATAR UPDATED SUCCESSFULLY")
    } catch (error) {
        res.status(500).send({msg:"ERROR"})
    }
}

const updateUserCoverImage=async(req,res)=>{
    try {
        const coverImageLocalPath=req.file?.path;
        if(!coverImageLocalPath){
            res.status(400).send({msg:"DID NOT RECIEVED THE COVER IMAGE FILE"})
        }

        const coverImage=await uploadOnCloudinary(coverImageLocalPath);

        if(!coverImage){
            res.status(500).send({msg:"ERROR ON UPLOADING ON CLOUDINARY"})
        }
        await User.findByIdAndUpdate(
            req.user?._id,
            {
                $set:{
                    coverImage:coverImage.url
                }
            },
            {new:true}
        ).select("-password")
        res.status(200).json("COVER IMAGE UPDATED SUCCESSFULLY")
    } catch (error) {
        res.status(500).send({msg:"ERROR"})
    }
}


const getUserChannelProfile=async(req,res)=>{
    try {
        const {username}=req.params

        if(!username?.trim()){
            res.status(400).send({msg:"USERNAME IS MISSING"});
        }
        // User.find({username})=>CAN ALSO USE FIND TO FIND THE _ID THAN USE FIND ALL TO RETURN ALL THE SUBSCRIBERS AND CHANNEL HE IS SUBSCRIBED TO.
        const channel=await User.aggregate([
            {
                $match:{
                    username:username?.toLowerCase()
                }
            },
            {
                $lookup:{
                    from:"subscriptions",
                    localField:"_id",
                    foreignField:"channel",
                    as:"subscribers"
                }
            },
            {
                $lookup:{
                    from:"subscriptions",
                    localField:"_id",
                    foreignField:"subsciber",
                    as:"subscriberdTo"
                }
            },
            {
                $addFields:{
                    subscribersCount:{
                        $size:"$subscribers"
                    },
                    channelsSubscribedToCount:{
                        $size:"$subscriberdTo"
                    },
                    isSubscribed:{
                        $cond:{
                            if:{$in:[req.user?._id,"$subscribers.subscriber"]},
                            then:true,
                            else:false
                        }
                    }
                }
            },
            {
                $project:{
                    fullname:1,
                    username:1,
                    subscribersCount:1,
                    channelsSubscribedToCount:1,
                    isSubscribed:1,
                    avatar:1,
                    coverImage:1,
                    email:1
                }
            }
        ])

        if(channel.length?.length){
            res.status(400).send({msg:"CHANNEL DOES NOT EXIST"})
        }
        return res
        .status(200)
        .json(channel[0],"USER CHANNEL FETCHED SUCCESSFULLY")
    } catch (error) {
        res.status(500).send({msg:"error"})
    }
}

//WHEN WE DO user._id => THIS _id IS A STING. IN MONGODB IT IS AN OBJECT. MONGOOSE CONVERTS THIS STRING INTO AN OBJECT
const getWatchHistory=async(req,res)=>{
    try {
        const user=await User.aggregate([
            {
                $match:{
                    //JUST TO BE SAFE THAT IF THE req.user._id IS A STRING THAN CONVERTING IT INTO AN OBJECT.
                    // _id:new mongoose.Types.ObjectId(req.user._id)
                    //DEPRECIATED=>new
                    _id:mongoose.Types.ObjectId(req.user._id)
                }
            },{
                $lookup:{
                    from:"videos",
                    localField:"watchHistory",
                    foreignField:"_id",
                    as:"watchHistory",
                    pipeline:[
                        {
                            $lookup:{
                                from:"users",
                                localField:"owner",
                                foreignField:"_id",
                                as:"owner",
                                pipeline:[
                                    {
                                        $project:{
                                            fullname:1,
                                            username:1,
                                            avatar:1
                                        }
                                    }
                                ]
                            }
                        },{
                            $addFields:{
                                owner:{
                                    $first:"$owner"
                                }
                            }
                        }
                    ]
                }
            }
        ])

        return res
        .status(200)
        .json(user[0].watchHistory,"WATCH HISTORY FETCHED SUCCESSFULLY")
    } catch (error) {
        res.status(500).send({msg:"ERROR"})
    }
}



export {registerUser,loginUser,logoutUser,refreshAccessToken,changeCurrentPassword,getCurrentUser,updateAccountDetails,updateAvatar,updateUserCoverImage,getUserChannelProfile,getWatchHistory}