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



router.post('/messages/:messageId/read', authenticate, async (req, res) => {
    try {
        const { messageId } = req.params;
        const { isRead } = req.body;

        if (typeof isRead !== 'boolean') {
            return res.status(400).json({ error: 'isRead must be a boolean' });
        }

        const userId = req.user.id; // The authenticated user's ID
        const organizationId = req.user.msg_id; // The authenticated user's organization ID (if any)

        console.log(`User ID: ${userId}, Organization ID: ${organizationId}`);

        // Find the message by ID
        const message = await Message.findById(messageId);

        if (!message) {
            return res.status(404).json({ error: 'Message not found' });
        }

        // Allow only the recipient to update the read status
        if (message.recipient === userId || message.recipient === organizationId) {
            message.isReadByRecipient = isRead;
        } else {
            return res.status(403).json({ error: 'You are not authorized to update this message' });
        }

        // Save the updated message
        await message.save();

        res.status(200).json(message);
    } catch (error) {
        console.error('Error updating message read status:', error);
        res.status(500).json({ error: 'Something went wrong' });
    }
});


// Toggling route
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
router.get('/messages/unread', authenticate, async (req, res) => {
    try {
        let recipientId;
        if (req.user.msg_id) {
            recipientId = req.user.msg_id;
        } else {
            recipientId = req.user.id;
        }

        const unreadMessages = await Message.find({ recipient: recipientId, isReadByRecipient: false }).sort({ timestamp: -1 });
        res.status(200).json(unreadMessages);
    } catch (err) {
        console.error(err);
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
