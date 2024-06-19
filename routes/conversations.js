
// /routes/conversations.js
const express = require('express');
const router = express.Router();
const Conversation = require('../models/conversations');
const NodeCache = require("node-cache");
const profileCache = new NodeCache({ stdTTL: 600 }); // Cache for 10 minutes
const axios = require('axios');
const authenticate = require('../middleware/authenticator')

// Create a new conversation

router.post('/newconversation/:receiverId', authenticate, async (req, res) => {
    let receiverId = req.params.receiverId.trim(); // Trim whitespace from receiverId
    const senderId = req.user.org_msg_id ? req.user.org_msg_id : req.user.msg_id;

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

router.get('/orgconversations/:org_msg_Id', authenticate, async (req, res) => {
    const {org_msg_Id } = req.params;

    try {
        const options = {
            headers: { Authorization: `Bearer ${req.token}` },
            timeout: 10000
        };

        let allUsers = [];
        let allOrganizations = [];

        // Step 1: Fetch all users and organizations from the external API using axios
        try {
            const allUsersResponse = await fetchWithRetry('https://api.fyndah.com/api/v1/users/all', options);
            allUsers = allUsersResponse.data;
            console.log('Fetched users:', allUsers);
        } catch (error) {
            console.error('Error fetching users:', error.message);
            return res.status(500).json({ error: 'Failed to fetch users' });
        }

        try {
            const allOrganizationsResponse = await fetchWithRetry('https://api.fyndah.com/api/v1/organization', options);
            allOrganizations = allOrganizationsResponse.data;
            console.log('Fetched organizations:', allOrganizations);
        } catch (error) {
            console.error('Error fetching organizations:', error.message);
            return res.status(500).json({ error: 'Failed to fetch organizations' });
        }

        // Step 2: Create maps for quick lookup
        const userMap = allUsers.reduce((map, user) => {
            map[user.msg_id] = user;
            return map;
        }, {});

        const organizationMap = allOrganizations.reduce((map, org) => {
            map[org.msg_id] = org;
            return map;
        }, {});

        console.log('User Map:', userMap);
        console.log('Organization Map:', organizationMap);

        // Step 3: Fetch conversations for the organization
        const conversations = await Conversation.find({ members: org_msg_Id }).sort({ updatedAt: -1 });

        if (!conversations || conversations.length === 0) {
            return res.status(404).json({ error: 'No conversations found for this organization' });
        }

        // Step 4: Map conversations to include member names dynamically
        const results = conversations.map(convo => ({
            _id: convo._id,
            members: convo.members.map(member => ({
                id: member,
                name: getNameById(member, userMap, organizationMap)
            })),
            updatedAt: convo.updatedAt,
            __v: convo.__v
        }));

        // Step 5: Return the results
        res.status(200).json(results);
    } catch (err) {
        console.error('Error fetching conversations:', err.message);
        res.status(500).json({ error: 'Something went wrong' });
    }
});


router.get('/userconversations/:user_msg_Id', authenticate, async (req, res) => {
    const user_msg_Id = req.params.user_msg_Id;

    try {
        const options = {
            headers: { Authorization: `Bearer ${req.token}` },
            timeout: 10000
        };

        let allUsers = [];
        let allOrganizations = [];

        // Fetch all users and organizations from the external API using axios
        try {
            const allUsersResponse = await fetchWithRetry('https://api.fyndah.com/api/v1/users/all', options);
            allUsers = allUsersResponse.data;
            console.log('Fetched users:', allUsers);
        } catch (error) {
            console.error('Error fetching users:', error.message);
            return res.status(500).json({ error: 'Failed to fetch users' });
        }

        try {
            const allOrganizationsResponse = await fetchWithRetry('https://api.fyndah.com/api/v1/organization', options);
            allOrganizations = allOrganizationsResponse.data;
            console.log('Fetched organizations:', allOrganizations);
        } catch (error) {
            console.error('Error fetching organizations:', error.message);
            return res.status(500).json({ error: 'Failed to fetch organizations' });
        }

        // Create maps for quick lookup
        const userMap = allUsers.reduce((map, user) => {
            map[user.msg_id] = user;
            return map;
        }, {});

        const organizationMap = allOrganizations.reduce((map, org) => {
            map[org.msg_id] = org;
            return map;
        }, {});

        console.log('User Map:', userMap);
        console.log('Organization Map:', organizationMap);

        // Fetch conversations for the authenticated user
        const conversations = await Conversation.find({ members: user_msg_Id }).sort({ updatedAt: -1 });

        if (!conversations || conversations.length === 0) {
            return res.status(404).json({ error: 'No conversations found for this user' });
        }

        // Map conversations to include member names dynamically
        const results = conversations.map(convo => ({
            _id: convo._id,
            members: convo.members.map(member => ({
                id: member,
                name: getNameById(member, userMap, organizationMap)
            })),
            updatedAt: convo.updatedAt,
            __v: convo.__v
        }));

        // Return the results
        res.status(200).json(results);
    } catch (err) {
        console.error('Error fetching conversations:', err.message);
        res.status(500).json({ error: 'Something went wrong' });
    }
});



// Helper function to fetch data with retry logic using axios
const fetchWithRetry = async (url, options, retries = 3) => {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await axios.get(url, options);
            return response.data; // Assuming response is JSON
        } catch (error) {
            console.error(`Attempt ${i + 1} failed: ${error.message}`);
            if (i === retries - 1) throw error;
        }
    }
};

// Function to get name by msg_id from userMap or organizationMap
const getNameById = (msg_id, userMap, organizationMap) => {
    const user = userMap[msg_id];
    const organization = organizationMap[msg_id];
    return user ? user.firstname : (organization ? organization.org_name : 'Unknown');
};


module.exports = router;