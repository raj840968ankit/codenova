import mongoose from "mongoose";
import { env } from "./env.js";


export const connect = async () => {
    try {
        await mongoose.connect(`${env.MONGODB_URI}`, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 30000 // increase from default 10s to 30s
        })
        console.log('Atlas connected');

    } catch (error) {
        console.error("Mongo DB connect error : ", error);
    }
}





