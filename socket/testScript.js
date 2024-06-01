const io = require('socket.io-client');
const jwt = require('jsonwebtoken');

// Generate a JWT token for testing (ensure the secret matches the server)
const token = jwt.sign({ userId: 'user1_id' }, 'your_jwt_secret');

const socket = io('http://localhost:3000', {
    query: { token: token }
});

socket.on('connect', () => {
    console.log('Connected to server with id:', socket.id);

    // Join a room
    socket.emit('joinRoom', { roomId: 'room1', userId: 'user1_id' });

    // Listen for messages
    socket.on('receiveMessage', (data) => {
        console.log('Message received:', data);
    });

    // Send a test message
    setTimeout(() => {
        socket.emit('sendMessage', { roomId: 'room1', message: 'Hello from client!', userId: 'user1_id' });
    }, 1000);
});

socket.on('userJoined', (data) => {
    console.log('User joined:', data);
});

socket.on('disconnect', () => {
    console.log('Disconnected from server');
});

socket.on('error', (error) => {
    console.error('Error:', error);
});
