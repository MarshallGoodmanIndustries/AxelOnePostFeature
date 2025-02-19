
// /routes/conversations.js
const express = require('express');
const router = express.Router();
const Conversation = require('../models/conversations');
const Message = require('../models/message');
const authenticate = require('../middleware/authenticator');
const {excludeSoftDeleted, fetchWithRetry, getNameById} = require("../utils/fetchWithRetry");


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

// Route to get conversations for an organization excluding soft deleted ones
router.get('/orgconversations/:org_msg_Id', authenticate, async (req, res) => {
    const { org_msg_Id } = req.params;
    const orgId = req.user.org_msg_id;

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
        } catch (error) {
            console.error('Error fetching users:', error.message);
            return res.status(500).json({ error: 'Failed to fetch users' });
        }

        try {
            const allOrganizationsResponse = await fetchWithRetry('https://api.fyndah.com/api/v1/organization', options);
            allOrganizations = allOrganizationsResponse.data;
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

        console.log({message: "org message id:", orgId})
         // Fetch conversations for the organization excluding soft deleted ones
         const conversations = await Conversation.find({
                        members: org_msg_Id,
                        deletedFor: { $ne: orgId },
                        isArchivedFor: false
                    }).sort({ updatedAt: -1 });

        if (!conversations || conversations.length === 0) {
            return res.status(404).json({ error: 'No conversations found for this organization' });
        }

        // Find unread messages for the recipient
        const unreadMessages = await Message.find({ recipient: orgId, isReadByRecipient: false });

        // Group unread messages by conversation ID and count them
        const unreadMessagesByConversation = unreadMessages.reduce((acc, message) => {
            const { conversationId } = message;
            if (!acc[conversationId]) {
                acc[conversationId] = 0;
            }
            acc[conversationId]++;
            return acc;
        }, {});

 // Map conversations to include member names, logos, profile photo paths and unread messages count dynamically
const results = await Promise.all(conversations.map(async (convo) => {
    // Ensure the organization's ID
    const organizationId = orgId;

    // Find the index of the organization in the members array
    const organizationIndex = convo.members.findIndex(member => member === organizationId);

    // Ensure the other member's ID is at index 1
    if (organizationIndex !== -1 && convo.members.length > 1) {
        // Swap the members so that the other member is at index 1
        const otherMemberIndex = organizationIndex === 0 ? 1 : 0;
        [convo.members[1], convo.members[otherMemberIndex]] = [convo.members[otherMemberIndex], convo.members[1]];
    }

    // Find last message for the conversation
    const lastMessage = await Message.findOne({ conversationId: convo._id })
        .sort({ createdAt: -1 })
        .select('message createdAt');

    return {
        _id: convo._id,
        members: convo.members.map(member => {
            const memberInfo = getNameById(member, userMap, organizationMap);
            return {
                id: member,
                name: memberInfo.name,
                profilePhotoPath: memberInfo.profilePhotoPath,
                logo: memberInfo.logo
            };
        }),
        updatedAt: convo.updatedAt,
        lastMessage: lastMessage ? { message: lastMessage.message, createdAt: lastMessage.createdAt } : null,
        unreadCount: unreadMessagesByConversation[convo._id] || 0,
        __v: convo.__v
    };
}));

// Return the results
res.status(200).json(results);

    } catch (err) {
        console.error('Error fetching conversations:', err.message);
        res.status(500).json({ error: 'Something went wrong' });
    }
});

router.get('/userconversations/:user_msg_Id', authenticate, excludeSoftDeleted, async (req, res) => {
    const user_msg_Id = req.params.user_msg_Id;
    const userId = req.userId;
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
        const conversations = await Conversation.find({
                        members: user_msg_Id,
                        deletedFor: { $ne: userId },
                        isArchivedFor: false
                    }).sort({ updatedAt: -1 });

        if (!conversations || conversations.length === 0) {
            return res.status(404).json({ error: 'No conversations found for this user' });
        }

         // Find unread messages for the recipient
         const unreadMessages = await Message.find({ recipient: userId, isReadByRecipient: false });

         // Group unread messages by conversation ID and count them
         const unreadMessagesByConversation = unreadMessages.reduce((acc, message) => {
             const { conversationId } = message;
             if (!acc[conversationId]) {
                 acc[conversationId] = 0;
             }
             acc[conversationId]++;
             return acc;
         }, {});


 // Map conversations to include member names, logos, and profile photo paths dynamically
const results = await Promise.all(conversations.map(async (convo) => {
    // Ensure the logged-in user's ID
    const loggedInUserId = userId;

    // Find the index of the logged-in user in the members array
    const loggedInUserIndex = convo.members.findIndex(member => member === loggedInUserId);

    // Ensure the other member's ID is at index 1
    if (loggedInUserIndex !== -1 && convo.members.length > 1) {
        // Swap the members so that the other member is at index 1
        const otherMemberIndex = loggedInUserIndex === 0 ? 1 : 0;
        [convo.members[1], convo.members[otherMemberIndex]] = [convo.members[otherMemberIndex], convo.members[1]];
    }

    // Fetch detailed member information
    const detailedMembers = await Promise.all(convo.members.map(async member => {
        const memberInfo = await getNameById(member, userMap, organizationMap);
        return {
            id: member,
            name: member === 'admin_msg_id' ? 'Fyndah' : memberInfo.name, // Replace 'admin_msg_id' with 'Fyndah'
            profilePhotoPath: memberInfo.profilePhotoPath,
            logo: memberInfo.logo
        };
    }));

    // Find last message for the conversation
    const lastMessage = await Message.findOne({ conversationId: convo._id })
        .sort({ createdAt: -1 })
        .select('message createdAt');

    return {
        _id: convo._id,
        members: detailedMembers,
        updatedAt: convo.updatedAt,
        lastMessage: lastMessage ? { message: lastMessage.message, createdAt: lastMessage.createdAt } : null,
        unreadCount: unreadMessagesByConversation[convo._id] || 0,
        __v: convo.__v
    };
}));

// Return the results
res.status(200).json(results);

 } catch (err) {
        console.error('Error fetching conversations:', err.message);
        res.status(500).json({ error: 'Something went wrong' });
    }
});

module.exports = router;