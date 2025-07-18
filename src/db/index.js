import mongoose from "mongoose";
import {DB_Name} from "../constants.js";

const connectDB = async ()=>{
    try {
        const connected = await mongoose.connect(`${process.env.DB_URI}/${DB_Name}`)
        console.log(`MongoDB connected: ${connected.connection.host}`);
    }
    catch (error) {
        console.error("Error Connecting ",error);
        process.exit(1);
        }
}

export default connectDB;  //export the function to use it in other files