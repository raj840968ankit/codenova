import { app } from './app.js'
import http from 'http'
import { Server } from 'socket.io'
import jwt from 'jsonwebtoken'
import { env } from './config/env.js'
import mongoose from 'mongoose'
import projectModel from './models/project.model.js'
import { generateResult } from './services/gemini.service.js'
import cookie from 'cookie'

const PORT = process.env.PORT || 3001

const server = http.createServer(app)


const io = new Server(server, {
    cors: {
        origin: env.CLIENT_URL,  // Allow requests from the client URL
        methods: ['GET', 'POST'],  // Allowed HTTP methods
        credentials: true,  // Allow cookies to be sent with requests
    },
})

//! Middleware to authenticate socket.io connections using JWT
//! This middleware checks the token sent in the handshake and verifies it
io.use(async (socket, next) => {
    try {
        // const token = socket.handshake.auth?.token || socket.handshake.headers.authorization?.split(' ')[1];  // Get the token from the handshake

        const { cookie: rawCookie } = socket.handshake.headers;

        const projectId = socket.handshake.query.projectId;  // Get the projectId from the query parameters

        if (!projectId || !mongoose.Types.ObjectId.isValid(projectId)) {
            return next(new Error('Invalid projectId'));
        }

        socket.project = await projectModel.findById(projectId);

        // ✅ Parse cookies and extract token
        const parsedCookie = cookie.parse(rawCookie || '');
        const token = parsedCookie.token;
        
        if (!token) {
            return next(new Error('Authentication error'));
        }

        const decoded = jwt.verify(token, env.JWT_SECRET);  // Verify the token

        if (!decoded) {
            return next(new Error('Invalid token'));
        }
        socket.user = decoded;

        next();
    } catch (error) {
        console.error('Socket.io connection error:', error);
        next(new Error('Authentication error'));
    }
});

io.on('connection', (socket) => {

    console.log('user connected : ', socket.id);


    socket.roomId = socket.project._id.toString();

    socket.join(socket.roomId);  // Join the user to the project room

    socket.on('file-update', ({ fileName, contents, projectId, sender }) => {
        // Broadcast to all users in the room except the sender
        socket.to(projectId).emit('file-update', { fileName, contents, sender });
    });

    socket.on('project-message', async ({ message, sender }) => {
        console.log({ message, sender });

        const aiIsPresentInMessage = message.includes('@ai')

        if (aiIsPresentInMessage) {
            const prompt = message.replace('@ai', '')

            const aiResult = await generateResult(prompt)  //!use package 'markdown-to-jsx' to convert markdown file to jsx given by AI in client

            socket.broadcast.to(socket.roomId).emit('server-message', { message, sender });

            io.to(socket.roomId).emit('server-ai-message', { aiResult, sender: 'AI' })

            return;
        }

        socket.broadcast.to(socket.roomId).emit('server-message', { message, sender });  // Broadcast the message to all users in the project room
    });

    // Example with socket.io
    socket.on('file-delete', ({ fileName, projectId, sender }) => {
        socket.to(projectId).emit('file-delete', { fileName, sender });
    });

    socket.on('disconnect', () => {
        console.log(`User disconnected : ${socket.id}`);
        socket.leave(socket.roomId)
    })
})



server.listen(PORT, () => {
    console.log(`Server is listening at http://localhost:${PORT}`);
})