const express = require('express');
const router = express.Router();
const Message = require('../models/message');
const Conversation = require('../models/conversations');
const authenticate = require('../middleware/authenticator')
const axios = require('axios'); // Assuming you use axios for HTTP requests

// Middleware to exclude soft deleted conversations and messages
async function excludeSoftDeleted(req, res, next) {
    try {
        const userId = req.user.msg_id;

        req.userId = userId;

        next();
    } catch (error) {
        console.error('Error excluding soft deleted:', error);
        res.status(500).json({ error: 'Something went wrong' });
    }
}

// Middleware to exclude soft deleted conversations and messages for organizations
async function excludeSoftDeletedForOrg(req, res, next) {
    try {
        const orgId = req.user.org_msg_id;

        req.orgId = orgId;

        next();
    } catch (error) {
        console.error('Error excluding soft deleted for organizations:', error);
        res.status(500).json({ error: 'Something went wrong' });
    }
}

// Route to get messages of a conversation excluding soft deleted ones

router.get('/:conversationId', authenticate, excludeSoftDeleted, async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { userId } = req;

        console.log('Fetching messages for conversationId:', conversationId);

        const messages = await Message.find({ 
            conversationId,
            $or: [
                { deletedForSender: { $ne: userId } },
                { deletedForRecipient: { $ne: userId } }
            ] 
        }).sort({ createdAt: 1 });

        // Generate the welcome message
        const welcomeMessage = {
            _id: 'welcome-message',
            conversationId: conversationId,
            sender: 'System',
            recipient: null, // or any default value, if you don't use recipient for system messages
            senderId: 'system',
            message: 'Welcome! Start typing below to send a message. Fyndah wishes you the best experience!',
            createdAt: new Date(),
            isReadByRecipient: true // Mark the welcome message as read
        };

        // Insert the welcome message at the beginning of the messages array
        const allMessages = [welcomeMessage, ...messages];

        if (messages.length === 0) {
            console.log('No messages found for conversationId:', conversationId);
        } else {
            console.log('Messages found:', messages);
        }

        res.json(allMessages);
    } catch (err) {
        console.error('Error fetching messages:', err);
        res.status(500).json({ error: 'Something went wrong' });
    }
});

// Route to get messages of a conversation for an organization excluding soft deleted ones
router.get('/orgmessages/:conversationId', authenticate, excludeSoftDeletedForOrg, async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { orgId } = req;

        console.log('Fetching messages for conversationId:', conversationId);

        const messages = await Message.find({ 
            conversationId,
            $or: [
                { deletedForSender: { $ne: orgId } },
                { deletedForRecipient: { $ne: orgId } }
            ]
        }).sort({ createdAt: 1 });

        // Generate the welcome message
        const welcomeMessage = {
            _id: 'welcome-message',
            conversationId: conversationId,
            sender: 'System',
            recipient: null, // or any default value, if you don't use recipient for system messages
            senderId: 'system',
            message: 'Welcome! Start typing below to send a message. Fyndah wishes you the best experience!',
            createdAt: new Date(),
            isReadByRecipient: true // Mark the welcome message as read
        };

        // Insert the welcome message at the beginning of the messages array
        const allMessages = [welcomeMessage, ...messages];

        if (messages.length === 0) {
            console.log('No messages found for conversationId:', conversationId);
        } else {
            console.log('Messages found:', messages);
        }

        res.json(allMessages);
    } catch (err) {
        console.error('Error fetching messages:', err);
        res.status(500).json({ error: 'Something went wrong' });
    }
});

// router.post('/send-message/:conversationId', authenticate, async (req, res) => {
//     const { conversationId } = req.params;
//     const { message } = req.body;
//     const senderName = req.user.username;
//     const senderId = req.user.org_msg_id ? req.user.org_msg_id : req.user.msg_id;

//     console.log('Received request to send message');
//     console.log('conversationId:', conversationId);
//     console.log('senderId:', senderId);

//     try {
//         // Check if the conversation exists and the sender is a member
//         const conversation = await Conversation.findOne({
//             _id: conversationId,
//             members: { $in: [senderId] }
//         });

//         if (!conversation) {
//             console.log('Conversation not found or sender is not a member');
//             console.log('Conversation:', conversation);
//             console.log('Sender ID:', senderId);
//             return res.status(404).json({ error: 'Conversation not found or sender is not a member' });
//         }

//         // Find the recipient in the conversation members
//         const recipientId = conversation.members.find(member => member !== senderId);
//         if (!recipientId) {
//             console.log('Recipient not found');
//             return res.status(400).json({ error: 'Recipient not found' });
//         }

//         // Create a new message
//         const newMessage = new Message({
//             sender: senderName,
//             conversationId,
//             recipient: recipientId,
//             senderId,
//             message
//         });

//         // Save the message
//         const savedMessage = await newMessage.save();
//         const io = req.io;
//         io.to(conversationId).emit('receiveMessage', { senderId, message });

//         // Emit a notification to the recipient
//         io.to(recipientId).emit('notification', { message: `New message from ${req.user.username}: ${message}` });

//         // Update conversation metadata
//         conversation.lastMessage = savedMessage._id;
//         conversation.updatedAt = new Date();
//         await conversation.save();

//         console.log('Message sent successfully:', savedMessage);
//         res.status(200).json(savedMessage);
//     } catch (error) {
//         console.error('Error sending message:', error.message);
//         res.status(500).json({ error: 'Failed to send message' });
//     }
// });

router.post('/send-message/org/:conversationId', authenticate, async (req, res) => {
    const { conversationId } = req.params;
    const { message } = req.body;
    const senderName = req.user.username;
    const senderId = req.user.org_msg_id;

    if (!senderId) {
        return res.status(400).json({ error: 'Organization ID not found' });
    }

    console.log('Received request to send message from organization');
    console.log('conversationId:', conversationId);
    console.log('senderId:', senderId);

    try {
        // Check if the conversation exists and the sender is a member
        const conversation = await Conversation.findOne({
            _id: conversationId,
            members: { $in: [senderId] }
        });

        if (!conversation) {
            console.log('Conversation not found or sender is not a member');
            return res.status(404).json({ error: 'Conversation not found or sender is not a member' });
        }

        // Find the recipient in the conversation members
        const recipientId = conversation.members.find(member => member !== senderId);
        if (!recipientId) {
            console.log('Recipient not found');
            return res.status(400).json({ error: 'Recipient not found' });
        }

        // Create a new message
        const newMessage = new Message({
            sender: senderName,
            conversationId,
            recipient: recipientId,
            senderId,
            message
        });

        // Save the message
        const savedMessage = await newMessage.save();
        const io = req.io;
        
        // Emit the message to the conversation room
        io.to(conversationId).emit('receiveMessage', { senderId, message });

        // Emit a notification to the recipient
        io.to(recipientId).emit('notification', { message: `New message from ${req.user.username}: ${message}` });

        // Update conversation metadata
        conversation.lastMessage = savedMessage._id;
        conversation.updatedAt = new Date();
        await conversation.save();

        console.log('Message sent successfully:', savedMessage);
        res.status(200).json(savedMessage);
    } catch (error) {
        console.error('Error sending message:', error.message);
        res.status(500).json({ error: 'Failed to send message' });
    }
});


router.post('/send-message/user/:conversationId', authenticate, async (req, res) => {
    const { conversationId } = req.params;
    const { message } = req.body;
    const senderName = req.user.username;
    const senderId = req.user.msg_id;

    if (!senderId) {
        return res.status(400).json({ error: 'User ID not found' });
    }

    console.log('Received request to send message from user');
    console.log('conversationId:', conversationId);
    console.log('senderId:', senderId);

    try {
        // Check if the conversation exists and the sender is a member
        const conversation = await Conversation.findOne({
            _id: conversationId,
            members: { $in: [senderId] }
        });

        if (!conversation) {
            console.log('Conversation not found or sender is not a member');
            return res.status(404).json({ error: 'Conversation not found or sender is not a member' });
        }

        // Find the recipient in the conversation members
        const recipientId = conversation.members.find(member => member !== senderId);
        if (!recipientId) {
            console.log('Recipient not found');
            return res.status(400).json({ error: 'Recipient not found' });
        }

        // Create a new message
        const newMessage = new Message({
            sender: senderName,
            conversationId,
            recipient: recipientId,
            senderId,
            message
        });

        // Save the message
        const savedMessage = await newMessage.save();
        const io = req.io;
        
        // Emit the message to the conversation room
        io.to(conversationId).emit('receiveMessage', { senderId, message });

        // Emit a notification to the recipient
        io.to(recipientId).emit('notification', { message: `New message from ${req.user.username}: ${message}` });

        // Update conversation metadata
        conversation.lastMessage = savedMessage._id;
        conversation.updatedAt = new Date();
        await conversation.save();

        console.log('Message sent successfully:', savedMessage);
        res.status(200).json(savedMessage);
    } catch (error) {
        console.error('Error sending message:', error.message);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

router.post('/user/messages/read', authenticate, async (req, res) => {
    try {
        const { messageIds, isRead } = req.body;

        if (!Array.isArray(messageIds) || messageIds.length === 0) {
            return res.status(400).json({ error: 'messageIds must be a non-empty array' });
        }

        if (typeof isRead !== 'boolean') {
            return res.status(400).json({ error: 'isRead must be a boolean' });
        }

        const userId = req.user.msg_id; // The authenticated user's ID

        console.log(`User ID: ${userId}`);

        // Find messages by IDs
        const messages = await Message.find({ _id: { $in: messageIds }, recipient: userId });

        if (!messages || messages.length === 0) {
            return res.status(404).json({ error: 'Messages not found' });
        }

        // Update the read status for valid messages
        await Message.updateMany(
            { _id: { $in: messages.map(msg => msg._id) } },
            { $set: { isReadByRecipient: isRead } }
        );

        res.status(200).json({ message: 'Messages updated successfully' });
    } catch (error) {
        console.error('Error updating message read status:', error);
        res.status(500).json({ error: 'Something went wrong' });
    }
});

router.post('/organization/messages/read', authenticate, async (req, res) => {
    try {
        const { messageIds, isRead } = req.body;

        if (!Array.isArray(messageIds) || messageIds.length === 0) {
            return res.status(400).json({ error: 'messageIds must be a non-empty array' });
        }

        if (typeof isRead !== 'boolean') {
            return res.status(400).json({ error: 'isRead must be a boolean' });
        }

        const organizationId = req.user.org_msg_id; // The authenticated user's organization ID

        console.log(`Organization ID: ${organizationId}`);

        // Find messages by IDs
        const messages = await Message.find({ _id: { $in: messageIds }, recipient: organizationId });

        if (!messages || messages.length === 0) {
            return res.status(404).json({ error: 'Messages not found' });
        }

        // Update the read status for valid messages
        await Message.updateMany(
            { _id: { $in: messages.map(msg => msg._id) } },
            { $set: { isReadByRecipient: isRead } }
        );

        res.status(200).json({ message: 'Messages updated successfully' });
    } catch (error) {
        console.error('Error updating message read status:', error);
        res.status(500).json({ error: 'Something went wrong' });
    }
});

// Toggling route
router.post('/messages/:messageId/toggle-read', authenticate, async (req, res) => {
    try {
        const { messageId } = req.params;
        const userId = req.user.msg_id; // User ID (can be either user or organization)
        
        // Find the message by ID
        const message = await Message.findById(messageId);

        if (!message) {
            return res.status(404).json({ error: 'Message not found' });
        }

        // Check if the authenticated user (user or organization) is the recipient
        if (message.recipient.toString() === userId) {
            message.isReadByRecipient = !message.isReadByRecipient;
            await message.save();
            res.status(200).json(message);
        } else {
            return res.status(403).json({ error: 'You are not authorized to update this message' });
        }

    } catch (error) {
        console.error('Error toggling message read status:', error);
        res.status(500).json({ error: 'Something went wrong' });
    }
});


//find all unread messages
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
            $or: [
                { deletedForSender: { $ne: userId } },
                { deletedForRecipient: { $ne: userId } }
            ]
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

        // Map conversations to include member names, logos, profile photo paths dynamically
        const results = await Promise.all(conversations.map(async (convo) => {
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

        // Return the results with total unread conversations count
        res.status(200).json(results);
    } catch (err) {
        console.error('Error fetching conversations:', err.message);
        res.status(500).json({ error: 'Something went wrong' });
    }
});



router.get('/org/messages/unread', authenticate, async (req, res) => {
    try {
        const recipientId = req.user.org_msg_id;

        // Find unread messages for the recipient
        const unreadMessages = await Message.find({ recipient: recipientId, isReadByRecipient: false }).sort({ timestamp: -1 });

        // Group unread messages by conversation ID and count them
        const groupedUnreadMessages = unreadMessages.reduce((acc, message) => {
            const { conversationId } = message;
            if (!acc[conversationId]) {
                acc[conversationId] = {
                    unreadMessages: [],
                    unreadCount: 0
                };
            }
            acc[conversationId].unreadMessages.push(message);
            acc[conversationId].unreadCount += 1;
            return acc;
        }, {});

        // Convert the grouped object to an array of objects
        const unreadMessagesByConversation = Object.keys(groupedUnreadMessages).map(conversationId => ({
            conversationId,
            unreadMessages: groupedUnreadMessages[conversationId].unreadMessages,
            unreadCount: groupedUnreadMessages[conversationId].unreadCount
        }));
        // Send the unread messages grouped by conversation in the response
        res.status(200).json(unreadMessagesByConversation);
    } catch (err) {
        console.error('Error fetching unread messages:', err);
        res.status(500).json({ error: 'Something went wrong' });
    }
});


// Route to toggle archive status
router.post('/messages/:messageId/toggle-archive', authenticate, async (req, res) => {
    try {
        const { messageId } = req.params;
        const userId = req.user.msg_id; // User ID (can be either user or organization)
        
        // Find the message by ID
        const message = await Message.findById(messageId);

        if (!message) {
            return res.status(404).json({ error: 'Message not found' });
        }

        // Determine if the user is the sender or recipient and toggle the respective field
        if (message.senderId.toString() === userId || message.recipient.toString() === userId) {
            if (message.senderId.toString() === userId) {
                // Toggle archive status for the sender
                message.isArchivedBySender = !message.isArchivedBySender;
            }
            if (message.recipient.toString() === userId) {
                // Toggle archive status for the recipient
                message.isArchivedByRecipient = !message.isArchivedByRecipient;
            }
            // Save the updated message
            await message.save();
            res.status(200).json(message);
        } else {
            return res.status(403).json({ error: 'You are not authorized to update this message' });
        }
    } catch (error) {
        console.error('Error toggling message archive status:', error);
        res.status(500).json({ error: 'Something went wrong' });
    }
});


// Retrieve archived messages
router.get('/messages/archived', authenticate, async (req, res) => {
    const userId = req.user.msg_id; // User ID (can be either user or organization)

    try {
        // Find archived messages where the user is either the sender or recipient
        const archivedMessages = await Message.find({
            $or: [
                { recipient: userId, isArchivedByRecipient: true },
                { senderId: userId, isArchivedBySender: true }
            ]
        }).sort({ timestamp: -1 });

        res.status(200).json(archivedMessages);
    } catch (err) {
        console.error('Error retrieving archived messages:', err);
        res.status(500).json({ error: 'Something went wrong' });
    }
});



router.delete('/delete/:messageId', authenticate, async (req, res) => {
    try {
        const { messageId } = req.params;

        const message = await Message.findByIdAndDelete(messageId);

        if (!message) {
            return res.status(404).json({ error: 'Message not found' });
        }

        res.status(200).json({ message: 'Message deleted successfully' });
    } catch (error) {
        console.error('Error deleting message:', error);
        res.status(500).json({ error: 'Something went wrong' });
    }
});

// Route to soft delete a conversation and its messages for a sender or recipient
router.delete('/delete/conversation/:conversationId', authenticate, async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = req.user.msg_id;

        // Find the conversation
        const conversation = await Conversation.findById(conversationId);

        if (!conversation) {
            return res.status(404).json({ error: 'Conversation not found' });
        }

        // Determine if the user is the sender or recipient
        const isSender = conversation.members.includes(userId);
        if (!isSender) {
            return res.status(403).json({ error: 'You are not authorized to delete this conversation' });
        }

        // Soft delete the conversation for the sender or recipient
        if (conversation.members[0] === userId) {
            conversation.deletedForSender = userId;
        } else if (conversation.members[1] === userId) {
            conversation.deletedForRecipient = userId;
        }

        await conversation.save();

        // Soft delete the messages for the sender or recipient
        const updateField = conversation.members[0] === userId ? 'deletedForSender' : 'deletedForRecipient';
        await Message.updateMany(
            { conversationId },
            { $set: { [updateField]: userId } }
        );

        res.status(200).json({ message: 'Conversation and its messages soft deleted successfully' });
    } catch (error) {
        console.error('Error soft deleting conversation:', error);
        res.status(500).json({ error: 'Something went wrong' });
    }
});


// Route to soft delete a conversation and its messages for an organization as sender or recipient
router.delete('/delete/org/conversation/:conversationId', authenticate, async (req, res) => {
    try {
        const { conversationId } = req.params;
        const orgId = req.user.org_msg_id;

        // Find the conversation
        const conversation = await Conversation.findById(conversationId);

        if (!conversation) {
            return res.status(404).json({ error: 'Conversation not found' });
        }

        // Determine if the organization is the sender or recipient
        const isMember = conversation.members.includes(orgId);
        if (!isMember) {
            return res.status(403).json({ error: 'You are not authorized to delete this conversation' });
        }

        // Soft delete the conversation for the sender or recipient
        if (conversation.members[0] === orgId) {
            conversation.deletedForSender = orgId;
        } else if (conversation.members[1] === orgId) {
            conversation.deletedForRecipient = orgId;
        }

        await conversation.save();

        // Soft delete the messages for the sender or recipient
        const updateField = conversation.members[0] === orgId ? 'deletedForSender' : 'deletedForRecipient';
        await Message.updateMany(
            { conversationId },
            { $set: { [updateField]: orgId } }
        );

        res.status(200).json({ message: 'Conversation and its messages soft deleted successfully' });
    } catch (error) {
        console.error('Error soft deleting conversation:', error);
        res.status(500).json({ error: 'Something went wrong' });
    }
});

// Endpoint for tagging and categorizing messages
router.post('/messages/:messageId/tag', authenticate, async (req, res) => {
    try {
        const { messageId } = req.params;
        const userId = req.user.msg_id; // Assuming msg_id uniquely identifies users and organizations
        const { tags, category } = req.body;

        // Find the message by ID
        const message = await Message.findById(messageId);

        if (!message) {
            return res.status(404).json({ error: 'Message not found' });
        }

        // Check if the authenticated user is either the sender or recipient
        if (message.senderId === userId) {
            if (tags) message.tagsBySender = tags;
            if (category) message.categoryBySender = category;
        } else if (message.recipient === userId) {
            if (tags) message.tagsByRecipient = tags;
            if (category) message.categoryByRecipient = category;
        } else {
            return res.status(403).json({ error: 'You are not authorized to update this message' });
        }

        // Save the updated message
        await message.save();

        res.status(200).json(message);
    } catch (error) {
        console.error('Error updating message tags/category:', error);
        res.status(500).json({ error: 'Something went wrong' });
    }
});




// Retrieve messages by tags
router.get('/messages/tagged/:tag', authenticate, async (req, res) => {
    const userId = req.user.msg_id; // Assuming msg_id uniquely identifies users and organizations
    const tag = req.params.tag;

    try {
        const taggedMessages = await Message.find({
            $or: [
                { recipient: userId, tagsByRecipient: { $in: [tag] } },
                { senderId: userId, tagsBySender: { $in: [tag] } }
            ]
        }).sort({ timestamp: -1 });

        res.status(200).json(taggedMessages);
    } catch (err) {
        console.error('Error retrieving tagged messages:', err);
        res.status(500).json({ error: 'Something went wrong' });
    }
});

// Retrieve messages cartegories
router.get('/messages/category/:category', authenticate, async (req, res) => {
    const userId = req.user.msg_id; // Assuming msg_id uniquely identifies users and organizations
    const category = req.params.category;

    try {
        // Query for messages where the user is either the sender or the recipient and matches the specified category
        const categorizedMessages = await Message.find({
            $or: [
                { senderId: userId,  categoryBySender: { $in: [category] } }, // User is the sender
                { recipient: userId, categoryByRecipient: { $in: [category] } } // User is the recipient
            ]
        }).sort({ timestamp: -1 });

        res.status(200).json(categorizedMessages);
    } catch (err) {
        console.error('Error retrieving categorized messages:', err);
        res.status(500).json({ error: 'Something went wrong' });
    }
});





module.exports = router;
