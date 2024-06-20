const express = require('express');
const router = express.Router();
const Message = require('../models/message');
const Conversation = require('../models/conversations');
const authenticate = require('../middleware/authenticator')
const axios = require('axios'); // Assuming you use axios for HTTP requests

router.get('/:conversationId', authenticate, async (req, res) => {
    try {
        const { conversationId } = req.params;
        console.log('Fetching messages for conversationId:', conversationId);

        const messages = await Message.find({ conversationId }).sort({ createdAt: 1 });

        // Generate the welcome message
        const welcomeMessage = {
            _id: 'welcome-message',
            conversationId: conversationId,
            sender: 'System',
            recipient: null, // or any default value, if you don't use recipient for system messages
            senderId: 'system',
            message: 'Welcome to the conversation!',
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
router.get('/user/messages/unread', authenticate, async (req, res) => {
    try {
        const recipientId = req.user.msg_id;

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



router.delete('/messages/:messageId', authenticate, async (req, res) => {
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
