
const socket = io('http://localhost:3000', {
    query: { token: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwczovL2FwaS5meW5kYWguY29tL2FwaS92MS9hdXRoL2xvZ2luIiwiaWF0IjoxNzE3NDk0NDQ2LCJleHAiOjE3MTc0OTgwNDYsIm5iZiI6MTcxNzQ5NDQ0NiwianRpIjoiTmd4TnpHYXRyY1c0R0JBYyIsInN1YiI6IjIiLCJwcnYiOiIyM2JkNWM4OTQ5ZjYwMGFkYjM5ZTcwMWM0MDA4NzJkYjdhNTk3NmY3In0.zi8oMohSyq_76kYXeDC4LCiOtMBgzmGKokXqA4F6M30' }
});


const messageContainer = document.getElementById('message-container');
const messageForm = document.getElementById('send-container');
const messageInput = document.getElementById('message-input');

socket.on('connect', () => {
    console.log('Connected to server with id:', socket.id);

    // Join a room
    socket.emit('joinRoom', { roomId: 'room1' });

    // Listen for messages
    socket.on('receiveMessage', (data) => {
        console.log('Message received:', data);
        appendMessage(`${data.userId}: ${data.message}`);
    });
});

socket.on('userJoined', (data) => {
    console.log('User joined:', data);
    appendMessage(`User ${data.userId} joined`);
});

socket.on('disconnect', () => {
    console.log('Disconnected from server');
});

socket.on('error', (error) => {
    console.error('Error:', error);
});

messageForm.addEventListener('submit', e => {
    e.preventDefault();
    const message = messageInput.value;
    appendMessage(`You: ${message}`);
    socket.emit('sendMessage', { roomId: 'room1', message: message });
    messageInput.value = '';
});

function appendMessage(message) {
    const messageElement = document.createElement('div');
    messageElement.innerText = message;
    messageContainer.append(messageElement);
}
