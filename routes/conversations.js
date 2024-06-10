
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
            organization_id: userProfile.organization_id
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

        const options = {
            headers: { Authorization: `Bearer ${req.token}` },
            timeout: 10000  // Increase to 10 seconds
        };

        // Fetch all users
        const allUsersResponse = await fetchWithRetry('https://api.fyndah.com/api/v1/users/all', options);
        const allUsers = allUsersResponse.data.data;

        // Fetch all organizations
        const allOrganizationsResponse = await fetchWithRetry('https://api.fyndah.com/api/v1/organization', options);
        const allOrganizations = allOrganizationsResponse.data.data;

        const userMap = allUsers.reduce((map, user) => {
            map[user.id] = user;
            return map;
        }, {});

        const organizationMap = allOrganizations.reduce((map, org) => {
            map[org.id] = org;
            return map;
        }, {});

        conversations = conversations.map(convo => ({
            ...convo._doc,
            members: convo.members.map((memberId, index) => {
                if (index === 0) {
                    // First member is a user
                    const user = userMap[memberId];
                    return {
                        id: memberId,
                        name: user ? user.username : 'Unknown User'
                    };
                } else if (index === 1) {
                    // Second member is an organization
                    const organization = organizationMap[memberId];
                    return {
                        id: memberId,
                        name: organization ? organization.org_name : 'Unknown Organization'
                    };
                } else {
                    // For any additional members, you can decide how to handle them (optional)
                    return {
                        id: memberId,
                        name: 'Additional Member'
                    };
                }
            })
        }));

        res.status(200).json(conversations);
    } catch (err) {
        console.error('Error fetching conversations:', err);
        res.status(500).json({ error: 'Something went wrong' });
    }
});


// router.get('/myconversations', authenticate, async (req, res) => {
//     try {
//         const userId = req.user.id.toString();
//         const organizationId = req.user.organization_id ? req.user.organization_id.toString() : null;

//         // Build query conditions for MongoDB query
//         const queryConditions = [{ members: userId }];
//         if (organizationId) queryConditions.push({ members: organizationId });

//         // Fetch conversations from database
//         let conversations = await Conversation.find({ $or: queryConditions }).sort({ updatedAt: -1 });

//         if (!conversations || conversations.length === 0) {
//             return res.status(404).json({ error: 'No conversations found for this user' });
//         }

//         const options = {
//             headers: { Authorization: `Bearer ${req.token}` },
//             timeout: 10000  // Increase to 10 seconds
//         };

//         // Fetch all organizations
//         const allOrganizationsResponse = await fetchWithRetry('https://api.fyndah.com/api/v1/organization', options);
//         const allOrganizations = allOrganizationsResponse.data.data;

//         // Create map for quick lookup of organizations
//         const organizationMap = allOrganizations.reduce((map, org) => {
//             map[org.id] = org;
//             return map;
//         }, {});

//         // Map conversations with resolved organization names
//         conversations = conversations.map(convo => ({
//             ...convo._doc,
//             members: convo.members.map(memberId => {
//                 const organization = organizationMap[memberId];
//                 return {
//                     id: memberId,
//                     name: organization ? organization.org_name : 'Unknown'
//                 };
//             })
//         }));

//         res.status(200).json(conversations);
//     } catch (err) {
//         console.error('Error fetching conversations:', err);
//         res.status(500).json({ error: 'Something went wrong' });
//     }
// });

// router.get('/myconversations', authenticate, async (req, res) => {
//     try {
//         const userId = req.user.id.toString();
//         const organizationId = req.user.organization_id ? req.user.organization_id.toString() : null;

//         // Build query conditions for MongoDB query
//         const queryConditions = [{ members: userId }];
//         if (organizationId) queryConditions.push({ members: organizationId });

//         // Fetch conversations from database
//         let conversations = await Conversation.find({ $or: queryConditions }).sort({ updatedAt: -1 });

//         if (!conversations || conversations.length === 0) {
//             return res.status(404).json({ error: 'No conversations found for this user' });
//         }

//         const options = {
//             headers: { Authorization: `Bearer ${req.token}` },
//             timeout: 10000  // Increase to 10 seconds
//         };

//         // Fetch all users and organizations concurrently
//         const [allUsersResponse, allOrganizationsResponse] = await Promise.all([
//             fetchWithRetry('https://api.fyndah.com/api/v1/users/all', options),
//             fetchWithRetry('https://api.fyndah.com/api/v1/organization', options)
//         ]);

//         const allUsers = allUsersResponse.data.data;
//         const allOrganizations = allOrganizationsResponse.data.data;

//         // Create maps for quick lookup
//         const userMap = allUsers.reduce((map, user) => {
//             map[user.id] = user;
//             return map;
//         }, {});

//         const organizationMap = allOrganizations.reduce((map, org) => {
//             map[org.id] = org;
//             return map;
//         }, {});

//         // Create a function to identify the entity type
//         const identifyEntity = async (id) => {
//             if (userMap[id]) {
//                 return { id, name: userMap[id].username, type: 'user' };
//             } else if (organizationMap[id]) {
//                 return { id, name: organizationMap[id].org_name, type: 'organization' };
//             } else {
//                 // Fetch user data by ID
//                 const userResponse = await fetchWithRetry(`https://api.fyndah.com/api/v1/users/${id}`, options);
//                 if (userResponse.data) {
//                     return { id, name: userResponse.data.username, type: 'user' };
//                 }

//                 // Fetch organization data by ID
//                 const orgResponse = await fetchWithRetry(`https://api.fyndah.com/api/v1/organization/${id}`, options);
//                 if (orgResponse.data) {
//                     return { id, name: orgResponse.data.org_name, type: 'organization' };
//                 }

//                 return { id, name: 'Unknown', type: 'unknown' };
//             }
//         };

//         // Resolve members for each conversation
//         conversations = await Promise.all(conversations.map(async convo => {
//             const members = await Promise.all(convo.members.map(identifyEntity));
//             return { ...convo._doc, members };
//         }));

//         res.status(200).json(conversations);
//     } catch (err) {
//         console.error('Error fetching conversations:', err);
//         res.status(500).json({ error: 'Something went wrong' });
//     }
// });


module.exports = router;