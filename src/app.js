import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"

const app=express()


app.use(cors({
    origin:process.env.CORS_ORIGIN,
    credentials:true
}))

app.use(express.json())
//BUILT IN MIDDLEWARE THAT PARSES INCOMING JSON REQUESTS

app.use(express.urlencoded({extended:true}))
//BUILT IN MIDDLEWARE THAT IS USED FOR PARSING THE DATA THAT IS OBTAINED THROUGH THE LINK, [PARAMS]. BASICALLY CONVERTS THE PARAMS INTO OBJECT.
//WE WRITE `extended:true` SO THAT IT CAN STORES MULTIPLE DATA UNDER A SINGLE OBJECT PROPERTY.

app.use(express.static("public"))
//BUILT IN MIDDLEWARE THAT SERVES THE STATIC FILES DIRECTLY. CAN SERVER IT MANUALLY USING `res.sendFile`

app.use(cookieParser())
//COOKIES ARE SMALL AMOUNT OF DATA STORED IN THE BROWSER AND SENT ALONG EVERY REQUEST. PARSES THE INCOMING COOKIE INTO AN JAVASCRIPT OBJECT


//ROUTES IMPORT
import userRouter from "./routes/user.routes.js"


//ROUTES DECLARATION
app.use('/routes',userRouter)

export {app}