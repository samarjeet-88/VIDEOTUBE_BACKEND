import {v2 as cloudinary} from "cloudinary"
import fs from "fs"

cloudinary.config({
    cloud_name:process.env.CLOUD_NAME,
    api_key:process.env.APi_KEY,
    api_secret:process.env.API_SECRET
})

const uploadOnCloudinary=async(localFilePath)=>{
    try{
        if(!localFilePath) return null;
        //upload the file on cloudinary
        const response=await cloudinary.uploader.upload(localFilePath,{
            resource_type:"auto"
        })
        //file has been uploaded successfully
        console.log("file is uploaded on cloudinary",response.url)
        return response
    }catch(error){
        //to remove the file that has been uploaded on the public server
        fs.unlinkSync(localFilePath);
        console.error(error.message)
        return null;
    }
}


export {uploadOnCloudinary}

