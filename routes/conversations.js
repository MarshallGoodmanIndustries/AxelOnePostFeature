
// /routes/conversations.js
const express = require('express');
const router = express.Router();
const Conversation = require('../models/conversations');
const authenticate = require('../middleware/authentication'); // Your auth middleware
const axios = require('axios');
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
        const existingConversation = await Conversation.findOne({
            members: { $all: [senderId, receiverId] }
        });

        if (existingConversation) {
            return res.status(200).json(existingConversation);
        }

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



router.get('/myconversations', authenticate, async (req, res) => {
    try {
        const userId = req.user.id.toString();
        const organizationId = req.user.organization_id ? req.user.organization_id.toString() : null;

        const queryConditions = [{ members: userId }];
        if (organizationId) queryConditions.push({ members: organizationId });

        let conversations = await Conversation.find({ $or: queryConditions }).sort({ updatedAt: -1 });

        if (!conversations || conversations.length === 0) {
            return res.status(404).json({ error: 'No conversations found for this user' });
        }

        const memberIds = [...new Set(conversations.flatMap(convo => convo.members))];

        const allUsersResponse = await axios.get('https://api.fyndah.com/api/v1/users/all', {
            headers: { 'Authorization': `Bearer ${req.token}` }
        });
        const allUsers = allUsersResponse.data;

        const userMap = allUsers.reduce((map, user) => {
            map[user.id] = user;
            return map;
        }, {});

        const organizationResponses = await Promise.all(memberIds.map(id => 
            axios.get(`https://api.fyndah.com/api/v1/organization/${id}?org_key=${id}`, {
                headers: { 'Authorization': `Bearer ${req.token}` }
            })
        ));
        const organizations = organizationResponses.map(response => response.data);

        const organizationMap = organizations.reduce((map, org) => {
            map[org.id] = org;
            return map;
        }, {});

        conversations = conversations.map(convo => ({
            ...convo._doc,
            members: convo.members.map(memberId => ({
                id: memberId,
                name: userMap[memberId]?.username || organizationMap[memberId]?.name || 'Unknown'
            }))
        }));

        res.status(200).json(conversations);
    } catch (err) {
        console.error('Error fetching conversations:', err);
        res.status(500).json({ error: 'Something went wrong' });
    }
});



module.exports = router;