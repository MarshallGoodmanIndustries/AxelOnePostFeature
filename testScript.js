const io = require('socket.io-client');
const jwt = require('jsonwebtoken');

// Replace with your valid JWT token
const token = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwczovL2FwaS5meW5kYWguY29tL2FwaS92MS9hdXRoL2xvZ2luIiwiaWF0IjoxNzE3NTA5NDkwLCJleHAiOjE3MTc1MTMwOTAsIm5iZiI6MTcxNzUwOTQ5MCwianRpIjoiczI5bURGdXJNbFRzdUM1NSIsInN1YiI6IjU4IiwicHJ2IjoiMjNiZDVjODk0OWY2MDBhZGIzOWU3MDFjNDAwODcyZGI3YTU5NzZmNyJ9.sFLzMz4lVfq91WRcRPyxYyX7XD9IhfqTis4ZIC6lbgI';
const roomId = '665f0870f43ab1cca06ad107'; // Replace with your room ID
const userId = '58'; // Replace with your user ID

const socket = io('http://localhost:3000', {
    query: { token }
});

socket.on('connect', () => {
    console.log('Connected to the server with socket ID:', socket.id);

    // Join the room
    socket.emit('joinRoom', { roomId, userId });

    // Listen for messages
    socket.on('receiveMessage', (data) => {
        console.log(`Received message from ${data.sender}: ${data.message}`);
    });

    // Optionally, send a message to the room
    // socket.emit('sendMessage', { roomId, message: 'Hello, this is a test message' }, (error, response) => {
    //     if (error) {
    //         console.error('Error sending message:', error);
    //     } else {
    //         console.log('Message sent successfully:', response);
    //     }
    // });
});

socket.on('disconnect', () => {
    console.log('Disconnected from the server');
});

socket.on('connect_error', (error) => {
    console.error('Connection error:', error);
});
