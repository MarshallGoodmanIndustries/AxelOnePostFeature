// /routes/messages.js
const express = require('express');
const router = express.Router();
const Message = require('../models/message');
const authenticate = require('../middleware/authenticate'); // Your auth middleware

// router.use(authenticate);

// Get messages by conversationId
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



// Send a message
router.post('/send-message', async (req, res) => {
    const { sender, recipient, listingId, conversationId, message } = req.body;
    if (!sender || !recipient || !message || !conversationId) {
        return res.status(400).json({ error: 'Sender, recipient, and message are required' });
    }
    try {
        const newMessageData = { sender, recipient, message };
        if (conversationId) {
            newMessageData.conversationId = conversationId;
        }
        const newMessage = new Message(newMessageData);
        await newMessage.save();
        res.status(200).json(newMessage);
    } catch (err) {
        console.error('Error saving message:', err);
        res.status(500).json({ error: 'Something went wrong' });
    }
});


module.exports = router;
