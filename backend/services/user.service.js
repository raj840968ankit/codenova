import { User } from "../models/user.models.js";

export const createUser = async ({email, password}) => {
    if(!email || !password){
        throw new Error('email and password are required')
    }

    const hashPassword = await User.hashPassword(password)
    const user = await User.create({
        email,
        password : hashPassword,
    });
    return user;
}

export const getAllUsers = async ({userId}) => {
    const users = await User.find({_id : { $ne: userId }});  // Exclude the requesting user;
    return users;
}

