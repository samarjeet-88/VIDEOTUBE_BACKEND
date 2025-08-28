import jwt from "jsonwebtoken"
import { User } from "../models/user.model.js";

export const verifyJWT=async(req,res,next)=>{
    try{
        const token=req.cookies?.accessToken || req.header('Authorization')?.replace("Bearer ","");
        if(!token){
            res.status(401).send({msg:"UNAUTHORIZED REQUEST"});
        }
        const decodedToken=jwt.verify(token,process.env.ACCESS_TOKEN_SECRET);
        const user=await User.findById(decodedToken?._id).select("-password -refreshToken");
        if(!user){
            res.status(401).send({msg:"INVALID ACCESS TOKEN"})
        }

        //ADDING A NEW PROPERTY
        req.user=user;
        next();
    }catch(error){
        console.log("JWT ERROR",error)
    }
}