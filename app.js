const express = require('express');
const cors = require("cors");
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const postRouter = require('./routes/postRoute'); // Adjust path accordingly
const listingRouter = require('./routes/listingRoute'); // Adjust path accordingly
const conversationRouter = require('./routes/conversations'); // Adjust path accordingly
const messageRouter = require('./routes/messages'); // Adjust path accordingly

const http = require('http');
const socketIo = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = socketIo(server);
// Middleware
app.use(bodyParser.json());
app.use(cors({origin: true}));
// Routes
app.use('/api', postRouter);
app.use('/api', listingRouter);
app.use('/api', conversationRouter);
app.use('/api', messageRouter);

// mongoose.connect('mongodb://localhost:27017/axeloneposts');

// Connect to MongoDB
mongoose.connect("mongodb+srv://bellsehr:password1234@bellsehr.bwuj4eh.mongodb.net/?retryWrites=true&w=majority").then(() => {
    console.log('Connected to MongoDB');
}).catch(err => {
    console.error('Could not connect to MongoDB', err);
});

// Socket.IO setup
io.on('connection', (socket) => {
    console.log('A user connected', socket.id);
  
    socket.on('joinRoom', ({ roomId, userId }) => {
      socket.join(roomId);
      console.log(`${userId} joined room: ${roomId}`);
      socket.to(roomId).emit('userJoined', { userId });
    });
  
    socket.on('sendMessage', ({ roomId, message, userId }) => {
      console.log(`Message from ${userId} in room ${roomId}: ${message}`);
      socket.to(roomId).emit('receiveMessage', { userId, message });
    });
  
    socket.on('disconnect', () => {
      console.log('A user disconnected', socket.id);
    });
  });
  
  
// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
