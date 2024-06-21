const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const http = require('http');
const socketIo = require('socket.io');
const postRouter = require('./routes/postRoute');
const listingRouter = require('./routes/listingRoute');
const conversationRouter = require('./routes/conversations');
const messageRouter = require('./routes/messages');
const Conversation = require('./models/conversations')
const authenticate = require('./middleware/authenticate');
const socketAuthenticate = require('./middleware/socketAuthenticate');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: ['https://fyndah.vercel.app', 'https://fyndah.com', 'http://localhost:5173', 'http://localhost:5174'],
        methods: ['GET', 'POST'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true
    }
});

// Middleware
app.use(bodyParser.json());

app.use(cors({
    origin: ['https://fyndah.vercel.app', 'https://fyndah.com', 'http://localhost:5173', 'http://localhost:5174'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    optionsSuccessStatus: 200
}));

// Routes
app.use('/api', postRouter);
app.use('/api', listingRouter);
app.use('/api/conversations', conversationRouter);
app.use('/api/messages', (req, res, next) => {
    req.io = io; // Attach the io instance to the request
    next();
}, messageRouter);

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI).then(() => {
    console.log('Connected to MongoDB');
}).catch(err => {
    console.error('Could not connect to MongoDB', err);
});

// Socket.IO authentication middleware
io.use(socketAuthenticate);

// Socket.IO connection handler
io.on('connection', (socket) => {
    console.log('A user connected', socket.id);

    socket.on('joinRoom', ({ roomId }) => {
        let userId;
        if (socket.user.org_msg_id) {
            userId = socket.user.org_msg_id; // Use org_msg_id if available
        } else {
            userId = socket.user.msg_id; // Use msg_id if org_msg_id is not available
        }

        socket.join(roomId);
        console.log(`${userId} joined room: ${roomId}`);
        socket.to(roomId).emit('userJoined', { userId });
    });

    socket.on('sendMessage', async ({ roomId, message }, callback) => {
        const senderId = socket.user.org_msg_id || socket.user.msg_id || socket.user.id; // Priority on org_msg_id
        console.log(`Message from ${senderId} in room ${roomId}: ${message}`);
        
        try {
            // Fetch the conversation to get the recipient
            const conversation = await Conversation.findById(roomId);
            if (!conversation) {
                throw new Error('Conversation not found');
            }
            
            const recipient = conversation.members.find(memberId => memberId !== senderId);

            // Save the message to the database
            await sendMessage({ sender: senderId, recipient, conversationId: roomId, message });

            // Emit the message to other users in the room
            socket.to(roomId).emit('receiveMessage', { sender: senderId, message });
           
            callback(null, { success: true });
        } catch (error) {
            console.error('Error sending message:', error);
            callback(error);
        }
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected', socket.id);
    });

    // Emitting a notification event to a specific room
    // io.to('9').emit('notification', { message: 'This is a notification message' });
    
    // Emitting a notification event to all connected clients
    io.emit('notification', { message: 'This is a notification message' });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
