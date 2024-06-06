
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
        // Check if a conversation already exists between the sender and receiver
        // const existingConversation = await Conversation.findOne({
        //     members: { $all: [senderId, receiverId] }
        // });

        // if (existingConversation) {
        //     return res.status(200).json(existingConversation);
        // }

        // Create a new conversation
        const newConversation = new Conversation({ members: [senderId, receiverId] });
        const savedConversation = await newConversation.save();

        // Check if the members field is populated correctly
        if (!savedConversation.members || savedConversation.members.length === 0) {
            return res.status(500).json({ error: 'Failed to create conversation, members field is empty' });
        }

        res.status(200).json(savedConversation);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Something went wrong' });
    }
});


// Get conversations by userId
router.get('/myconversations', authenticate, async (req, res) => {
    try {
        const userId = req.user.id.toString();
        const organizationId = req.user.organization_id ? req.user.organization_id.toString() : null;

        // Construct query conditions
        const queryConditions = [{ members: userId }];
        if (organizationId) {
            queryConditions.push({ members: organizationId });
        }

        console.log('Query Conditions:', queryConditions);

        // Fetch conversations
        let conversations = [];
        if (queryConditions.length > 0) {
            conversations = await Conversation.find({
                $or: queryConditions
            }).sort({ updatedAt: -1 });
        }

        console.log('Fetched Conversations:', conversations);

        // Check if conversations are found
        if (!conversations || conversations.length === 0) {
            return res.status(404).json({ error: 'No conversations found for this user' });
        }

        res.status(200).json(conversations);
    } catch (err) {
        console.error('Error fetching conversations:', err);
        res.status(500).json({ error: 'Something went wrong' });
    }
});




module.exports = router;