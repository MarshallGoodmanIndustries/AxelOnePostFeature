
// /routes/conversations.js
const express = require('express');
const router = express.Router();
const Conversation = require('../models/conversations');
const authenticate = require('../middleware/authentication'); // Your auth middleware

// router.use(authenticate);

// Create a new conversation
router.post('/newconversation/:receiverId', authenticate, async (req, res) => {
    const { receiverId } = req.params;
    const senderId = String(req.user.id);

    if (!senderId || !receiverId) {
        return res.status(400).json({ error: 'Both sender and receiver IDs are required' });
    }
    try {
        const newConversation = new Conversation({ members: [senderId, receiverId] });
        const savedConversation = await newConversation.save();
        res.status(200).json(savedConversation);
    } catch (err) {
        res.status(500).json({ error: 'Something went wrong' });
    }
});

// Get conversations by userId
router.get('/:userId', async (req, res) => {
    try {
        const conversations = await Conversation.find({ members: req.params.userId });
        res.status(200).json(conversations);
    } catch (err) {
        res.status(500).json({ error: 'Something went wrong' });
    }
});

module.exports = router;