import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import redisClient from '../services/redis.service.js';

export const authUser = async (req, res, next) => {
    try {
        // console.log("🔍 Incoming headers:", req.headers);
        // console.log("🔍 Cookies parsed:", req.cookies);
        
        const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];
        
        // Check if token is provided in cookies or in the Authorization header
        // If using Authorization header, it should be in the format "Bearer <token
        
        if (!token) {
            return res.status(401).send({ error: 'Unauthorized User' });
        }

        const isBlackListed = await redisClient.get(token);
        // Check if the token is blacklisted in Redis after logout
        // If the token is blacklisted, it means the user has logged out

        const isProduction = process.env.NODE_ENV === 'production';
        if(isBlackListed === 'logout') {
            res.clearCookie('token', {
                httpOnly: true,
                secure: isProduction, // true only on HTTPS
                sameSite: isProduction ? 'None' : 'Lax', // Or 'None' if frontend is on different domain and using HTTPS
            });
            return res.status(401).send({ error: 'Unauthorized User' });
        }

        const decoded = jwt.verify(token, env.JWT_SECRET);
        // Verify the token using the secret key
        req.user = decoded;
        next();
    } catch (error) {
        console.error('❌ Authentication Error:', error);
        return res.status(401).send({ error: 'Unauthorized User' });
    }
};
