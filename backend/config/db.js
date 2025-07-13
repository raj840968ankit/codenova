import mongoose from "mongoose";
import { env } from "./env.js";


export const connect = async () => {
    try {
        await mongoose.connect(`${env.MONGODB_URI}`)
        console.log('Atlas connected');

    } catch (error) {
        console.error("Mongo DB connect error : ", error);
    }
}





