
// /routes/conversations.js
const express = require('express');
const router = express.Router();
const Conversation = require('../models/conversations');
const NodeCache = require("node-cache");
const profileCache = new NodeCache({ stdTTL: 600 }); // Cache for 10 minutes
const axios = require('axios');
const jwt = require('jsonwebtoken');

const authenticate = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }
    const token = authHeader.split(' ')[1];
    try {
        let userProfile = profileCache.get(token);
        if (!userProfile) {
            const response = await fetchWithRetry('https://api.fyndah.com/api/v1/users/profile', {
                headers: { Authorization: `Bearer ${token}` },
                timeout: 10000  // Increase to 10 seconds
            });
            userProfile = response.data.data.user;
            profileCache.set(token, userProfile); // Cache the profile
        }
        const decoded = jwt.verify(token, process.env.JWT_SEC);
        req.user = {
            ...decoded,
            email: userProfile.email,
            username: userProfile.username,
            id: userProfile.id,
            msg_id: userProfile.msg_id
        };
        req.token = token; // Ensure the token is available for further API calls
        next();
    } catch (error) {
        console.error(error);
        res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }
};

const fetchWithRetry = async (url, options, retries = 3, delay = 1000) => {
    try {
        return await axios.get(url, options);
    } catch (error) {
        if (retries === 0) throw error;
        console.warn(`Retrying in ${delay}ms... (${retries} attempts left)`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return await fetchWithRetry(url, options, retries - 1, delay * 2);
    }
};

// Create a new conversation

router.post('/newconversation/:receiverId', authenticate, async (req, res) => {
    const { receiverId } = req.params;
    const senderId = String(req.user.id);
    const senderType = req.user.id ? 'user' : 'organization';

    if (!senderId || !receiverId) {
        return res.status(400).json({ error: 'Both sender and receiver IDs are required' });
    }

    try {
        let senderToUse = senderId;

        // Fetch organization data from the API
        const response = await axios.get('https://api.fyndah.com/api/v1/organization', {
            headers: { Authorization: `Bearer ${req.token}` } // Assuming the token is available in req.token
        });

        const organizations = response.data.data;

        // If sender is an organization, use msg_id instead of user ID
        if (senderType === 'organization') {
            const organization = organizations.find(org => org.msg_id === req.org.msg_id);
            if (!organization) {
                return res.status(400).json({ error: 'Organization not found' });
            }
            senderToUse = String(req.org.msg_id);
        }

        // Check if a conversation already exists between the sender and receiver
        const existingConversation = await Conversation.findOne({
            members: { $all: [senderToUse, receiverId] }
        });

        if (existingConversation) {
            return res.status(200).json(existingConversation);
        }

        // Create a new conversation
        const newConversation = new Conversation({ members: [senderToUse, receiverId] });
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


router.get('/myconversations', authenticate, async (req, res) => {
    try {
        const userId = req.user.id.toString();
        const msgId = req.org ? req.org.msg_id : null; // Get msg_id if the user is an organization

        const options = {
            headers: { Authorization: `Bearer ${req.token}` },
            timeout: 10000  // Increase to 10 seconds
        };

        // Fetch all users and organizations
        let allUsers = [];
        let allOrganizations = [];

        try {
            const allUsersResponse = await fetchWithRetry('https://api.fyndah.com/api/v1/users/all', options);
            allUsers = allUsersResponse.data.data;
        } catch (error) {
            console.error('Error fetching users:', error);
            return res.status(500).json({ error: 'Failed to fetch users' });
        }

        try {
            const allOrganizationsResponse = await fetchWithRetry('https://api.fyndah.com/api/v1/organization', options);
            allOrganizations = allOrganizationsResponse.data.data;
        } catch (error) {
            console.error('Error fetching organizations:', error);
            return res.status(500).json({ error: 'Failed to fetch organizations' });
        }

        const userMap = allUsers.reduce((map, user) => {
            map[user.id] = user;
            return map;
        }, {});

        const organizationMap = allOrganizations.reduce((map, org) => {
            map[org.msg_id] = org;
            return map;
        }, {});

        let conversations;

        if (msgId && organizationMap[msgId]) {
            // Fetch conversations for the organization
            conversations = await Conversation.find({ members: msgId }).sort({ updatedAt: -1 });

            if (!conversations || conversations.length === 0) {
                return res.status(404).json({ error: 'No conversations found for this organization' });
            }

            conversations = conversations.map(convo => ({
                ...convo._doc,
                members: convo.members.map(memberId => {
                    if (memberId.length === 20) {  // Assuming organization IDs are 20 characters long
                        const organization = organizationMap[memberId];
                        return {
                            id: memberId,
                            name: organization ? organization.org_name : 'Unknown'
                        };
                    } else {
                        const user = userMap[memberId];
                        return {
                            id: memberId,
                            name: user ? user.username : 'Unknown'
                        };
                    }
                })
            }));
        } else {
            // Fetch conversations for the user
            conversations = await Conversation.find({ members: userId }).sort({ updatedAt: -1 });

            if (!conversations || conversations.length === 0) {
                return res.status(404).json({ error: 'No conversations found for this user' });
            }

            conversations = conversations.map(convo => ({
                ...convo._doc,
                members: convo.members.map(memberId => {
                    if (memberId.length === 20) {  // Assuming organization IDs are 20 characters long
                        const organization = organizationMap[memberId];
                        return {
                            id: memberId,
                            name: organization ? organization.org_name : 'Unknown'
                        };
                    } else {
                        const user = userMap[memberId];
                        return {
                                                        id: memberId,
                                                        name: user ? user.username : 'Unknown'
                                                    };
                                                }
                                            })
                                        }));
                                    }
                            
                                    res.status(200).json(conversations);
                                } catch (err) {
                                    console.error('Error fetching conversations:', err);
                                    res.status(500).json({ error: 'Something went wrong' });
                                }
                            });


module.exports = router;