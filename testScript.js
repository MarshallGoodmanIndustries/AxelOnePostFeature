const socket = io('http://localhost:3000', {
    query: { token: 'YOUR_JWT_TOKEN_HERE' }
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
