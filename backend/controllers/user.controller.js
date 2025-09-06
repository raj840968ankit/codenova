import { User } from "../models/user.models.js";
import { createUser, getAllUsers } from "../services/user.service.js";
import { validationResult } from "express-validator";  //!install express-validator for validating fields
// import redisClient from "../services/redis.service.js";

export const createUserController = async (req, res) => {
    //?check for validation errors  
    const errors = validationResult(req)
    if(!errors.isEmpty()){
        return res.status(400).json({errors : errors.array()})
    }

    try {
        const {email, password} = req.body;

        const userExists = await User.findOne({email})

        if(userExists){
            return res.status(400).json({errors : "User already exists"})
        }

        const user = await createUser(req.body)

        const token = user.generateJWT()  //generate JWT token for the user

        const isProduction = process.env.NODE_ENV === 'production';
        // Set token in HttpOnly cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: isProduction, // true only on HTTPS
            sameSite: isProduction ? 'None' : 'Lax', // Or 'None' if frontend is on different domain and using HTTPS
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        delete user._doc.password;  //remove password from user object before sending it to the client
        delete user._doc.__v;  //remove __v field from user object before sending it to the client
        
        res.status(201).send({user})

    } catch (error) {
        console.log('❌ Server Register Error:', error); 
        res.status(400).send(error.message);
    }
}

export const loginUserController = async (req, res) => {
    //?check for validation errors  
    const errors = validationResult(req)
    if(!errors.isEmpty()){
        return res.status(400).json({errors : errors.array()})
    }

    try {
        const {email, password} = req.body
        const user = await User.findOne({email}).select('+password')  //select password field as it is not selected by default
        if(!user) {
            return res.status(401).json({errors: 'Invalid credentials'})
        }

        const isValidPassword = await user.isValidPassword(password)  //check if password is valid
        if(!isValidPassword) {
            return res.status(401).json({errors: 'Invalid credentials'})
        }

        const token = user.generateJWT()  //generate JWT token for the user

        const isProduction = process.env.NODE_ENV === 'production';
        // Set token in HttpOnly cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: isProduction, // true only on HTTPS
            sameSite: isProduction ? 'None' : 'Lax', // Or 'None' if frontend is on different domain and using HTTPS
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        delete user._doc.password;  //remove password from user object before sending it to the client
        delete user._doc.__v;  //remove __v field from user object before sending it to the client
        
        res.status(201).json({user})

    } catch (error) {
        console.log('❌ Server Login Error:', error); 
        res.status(400).send(error.message);
    }
}

export const getUserProfileController = async (req, res) => {
    try {        
        res.status(200).json({
            user : req.user
        })
    } catch (error) {
        console.log('❌ Server Profile Error:', error); 
        res.status(400).send(error.message);
    }
}

export const logoutUserController = async (req, res) => {
    try {
        const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
        
        // //! we have set token in redis when user log out and will check it in auth middleware for blacklisting
        // await redisClient.set(token, 'logout', 'EX', 60 * 60 * 24 * 7);

        const isProduction = process.env.NODE_ENV === 'production';
        // 🧼 Clear the cookie
        res.clearCookie('token', {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? 'None' : 'Lax', // Or 'None' if frontend is on different domain and using HTTPS
        });

        res.status(200).json({ message: 'User logged out successfully' });
        
    } catch (error) {
        console.log('❌ Server Logout Error:', error);
        res.status(400).send(error.message);
    }
}

export const getAllUsersController = async (req, res) => {
    try {
        const loggedInUser = await User.findOne({ email: req.user.email });

        const users = await getAllUsers({ userId: loggedInUser._id });
        res.status(200).json(users);
    } catch (error) {
        console.log('❌ Server Get All Users Error:', error);
        res.status(400).send(error.message);
    }
}