import mongoose,{Schema} from "mongoose"


//WE ARE NOT USING AN ARRAY BECAUSE SUPPOSE A CHANNEL HAS A MILLION SUBSCRIBERS OR SUPPOSE A USER SUBSCRIBERS TO A MILLION CHANNEL. THAN THE FIND OR UPDATING THAT ARRAY IN MONGODB BECOMES TOO DIFFICULT. ALSO MONGODB ARRAY ARE NOT EFFICIENT AT VERY LARGE SCALE. SO WE ARE CREATING A NEW ENTRY FOR EVERY SUBSCRIPTION

const subscriptionSchema=new Schema({
    //ONE WHO IS SUBSCRIBING
    subscriber:{
        type:Schema.Types.ObjectId,
        ref:"User"
    },
    //THE ONE WHO HE SUBSCRIBES TO
    channel:{
        type:Schema.Types.ObjectId,
        ref:"User"
    }
},{timestamps:true})


export const Subscription=mongoose.model("Subscription",subscriptionSchema)