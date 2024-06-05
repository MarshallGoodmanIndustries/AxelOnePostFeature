const express = require('express');
const router = express.Router();
const Message = require('../models/message');
const authenticate = require('../middleware/authentication');

router.get('/:conversationId', async (req, res) => {
    try {
        const { conversationId } = req.params;
        console.log('Fetching messages for conversationId:', conversationId);

        const messages = await Message.find({ conversationId }).sort({ createdAt: 1 });

        if (messages.length === 0) {
            console.log('No messages found for conversationId:', conversationId);
        } else {
            console.log('Messages found:', messages);
        }

        res.json(messages);
    } catch (err) {
        console.error('Error fetching messages:', err);
        res.status(500).json({ error: 'Something went wrong' });
    }
});

router.post('/send-message/:recipientId/:conversationId', authenticate, async (req, res) => {
    const { recipientId, conversationId } = req.params;
    const { message } = req.body;

    if (!message) {
        console.error('Message is required');
        return res.status(400).json({ error: 'Message is required' });
    }

    try {
        const sender = req.user.username;
        console.log(`Sender: ${sender}, Recipient: ${recipientId}, ConversationId: ${conversationId}, Message: ${message}`);

        const newMessage = new Message({
            sender,
            recipient: recipientId,
            message,
            conversationId,
            timestamp: new Date()
        });
        await newMessage.save();

        const io = req.io;
        console.log(`Emitting message to room ${conversationId} ${recipientId}`);
        io.to(conversationId).emit('receiveMessage', { sender, message });

         // Emit a notification to the recipient
         io.to(recipientId).emit('notification', { message: `New message from ${sender}: ${message}` });
        res.status(200).json(newMessage);
    } catch (err) {
        console.error('Error saving message:', err);
        res.status(500).json({ error: 'Something went wrong' });
    }
});

module.exports = router;
