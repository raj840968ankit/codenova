import { Router } from "express";
import * as userController from '../controllers/user.controller.js'
import { body } from "express-validator";
import { authUser } from "../middleware/auth.middleware.js";

const router = Router()

router.post('/register', [   
    body('email').isEmail().withMessage('Invalid email'),    //!if there will be errors, they will be caught in the controller
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
], userController.createUserController)  //create user

router.post('/login', [
    body('email').isEmail().withMessage('Invalid email'),
    body('password').notEmpty().withMessage('Password is required'),
], userController.loginUserController)  //login user

router.get('/profile', authUser, userController.getUserProfileController)  //get user profile

router.get('/logout', authUser, userController.logoutUserController)  //logout user

router.get('/all', authUser, userController.getAllUsersController)  //get all users

export const userRoutes = router

