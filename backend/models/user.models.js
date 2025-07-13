import mongoose from "mongoose";
import argon2 from 'argon2'
import { env } from "../config/env.js";
import jwt from "jsonwebtoken";

const userSchema = new mongoose.Schema({
    email : {
        type : String,
        unique : true,
        trim : true,
        lowerCase : true,
        minLength : [6, 'email must be at least 6 characters long'],
        maxLength : [50, 'email cannot be longer than 50 characters']
    },

    password : {type : String, select : false}
})

//here statics methods is used to hash password before saving to database
userSchema.statics.hashPassword = async (password) => {
    return await argon2.hash(password);
}

userSchema.methods.isValidPassword = async function(password) {
    return await argon2.verify(this.password, password)
}

userSchema.methods.generateJWT = function() {
    return jwt.sign(
        { _id: this._id, email: this.email },
        env.JWT_SECRET,
        { expiresIn: '7d' }
    );
}

const User = mongoose.model('user', userSchema)

export {User}
