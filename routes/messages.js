const express = require('express');
const router = express.Router();
const Message = require('../models/message');
const Conversation = require('../models/conversations');
const authenticate = require('../middleware/authentication');
const axios = require('axios'); // Assuming you use axios for HTTP requests

router.get('/:conversationId', async (req, res) => {
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
//     const senderId = req.user.id;
//     const sender = req.user.username;
//     const senderType = req.user.msg_id ? 'organization' : 'user'; // Assuming msg_id indicates an organization

//     if (!message) {
//         console.error('Message is required');
//         return res.status(400).json({ error: 'Message is required' });
//     }

//     try {
//         // Fetch the conversation to find the recipient
//         const conversation = await Conversation.findById(conversationId);
//         if (!conversation) {
//             return res.status(404).json({ error: 'Conversation not found' });
//         }

//         // Find the recipient in the conversation members
//         const recipientId = conversation.members.find(member => member !== senderId);
//         if (!recipientId) {
//             return res.status(400).json({ error: 'Recipient not found' });
//         }

//         const recipientType = recipientId.length === 20 ? 'organization' : 'user'; // Assuming organization IDs are 20 characters long

//         // Check if sender can send message to recipient based on sender and recipient types
//         if ((senderType === 'organization' && recipientType === 'user') ||
//             (senderType === 'user' && recipientType === 'organization')) {
//             // Sender is an organization sending to a user or vice versa
//             const newMessage = new Message({
//                 sender,
//                 senderId,
//                 recipient: recipientId,
//                 conversationId,
//                 message,
//                 timestamp: new Date()
//             });
//             await newMessage.save();

//             const io = req.io;
//             io.to(conversationId).emit('receiveMessage', { senderId, message });

//             // Emit a notification to the recipient
//             io.to(recipientId).emit('notification', { message: `New message from ${req.user.username}: ${message}` });

//             res.status(200).json(newMessage);
//         } else {
//             // Sender cannot send message to recipient
//             return res.status(403).json({ error: 'Sender is not allowed to send message to recipient' });
//         }
//     } catch (err) {
//         console.error('Error saving message:', err);
//         res.status(500).json({ error: 'Something went wrong' });
//     }
// });
router.post('/send-message/:conversationId', authenticate, async (req, res) => {
    const { conversationId } = req.params;
    const { message } = req.body;
    const senderId = req.user.id;
    const sender = req.user.username;
    const senderType = req.user.id ? 'user' : 'organization'; // Assuming user.id indicates a user

    if (!message) {
        console.error('Message is required');
        return res.status(400).json({ error: 'Message is required' });
    }

    try {
        // Fetch the conversation to find the recipient
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
            return res.status(404).json({ error: 'Conversation not found' });
        }

        // Fetch organization data from the API
        const response = await axios.get('https://api.fyndah.com/api/v1/organization', {
            headers: { Authorization: `Bearer ${req.token}` } // Assuming the token is available in req.token
        });

        const organizations = response.data.data;

        // Find the recipient in the conversation members
        const recipientId = conversation.members.find(member => member !== senderId.toString());

        if (!recipientId) {
            return res.status(400).json({ error: 'Recipient not found' });
        }

        // Determine if the recipient is an organization or user
        const recipientType = recipientId.length === 20 ? 'organization' : 'user'; // Assuming organization IDs are 20 characters long

        // Check if sender can send message to recipient based on sender and recipient types
        if ((senderType === 'organization' && recipientType === 'user') ||
            (senderType === 'user' && recipientType === 'organization') ||
            (senderType === 'user' && recipientType === 'user')) {

            // Sender is an organization sending to a user, or vice versa, or a user sending to another user
            const newMessage = new Message({
                sender,
                senderId,
                recipient: recipientId,
                conversationId,
                message,
                timestamp: new Date()
            });
            await newMessage.save();

            const io = req.io;
            io.to(conversationId).emit('receiveMessage', { senderId, message });

            // Emit a notification to the recipient
            io.to(recipientId).emit('notification', { message: `New message from ${req.user.username}: ${message}` });

            res.status(200).json(newMessage);
        } else {
            // Sender cannot send message to recipient
            return res.status(403).json({ error: 'Sender is not allowed to send message to recipient' });
        }
    } catch (err) {
        console.error('Error saving message:', err);
        res.status(500).json({ error: 'Something went wrong' });
    }
});



// Explicit setting route
// 

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
router.post('/messages/:messageId/toggle-read', authenticate, async (req, res) => {
    try {
        const { messageId } = req.params;
        const userId = req.user.id; // Ordinary user ID
        const organizationId = req.user.msg_id; // Organization ID

        // Log the IDs to debug
        console.log('User ID:', userId);
        console.log('Organization ID:', organizationId);

        const message = await Message.findById(messageId);

        if (!message) {
            return res.status(404).json({ error: 'Message not found' });
        }

        // Log the recipient of the message
        console.log('Message Recipient:', message.recipient.toString());

        // Check if the recipient is either the user or the organization
        if (message.recipient.toString() === userId.toString() || message.recipient.toString() === organizationId.toString()) {
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
        const userId = req.user.id; // Ordinary user ID
        const organizationId = req.user.msg_id; // Organization ID

        // Log the IDs to debug
        console.log('User ID:', userId);
        console.log('Organization ID:', organizationId);

        // Find the message by ID
        const message = await Message.findById(messageId);

        if (!message) {
            return res.status(404).json({ error: 'Message not found' });
        }

        // Determine if the user is the sender or the recipient and toggle the respective field
        if (message.senderId.toString() === userId.toString() || message.senderId.toString() === organizationId) {
            // Toggle archive status for the sender
            message.isArchivedBySender = !message.isArchivedBySender;
        } else if (message.recipient.toString() === userId.toString() || message.recipient.toString() === organizationId.toString()) {
            // Toggle archive status for the recipient
            message.isArchivedByRecipient = !message.isArchivedByRecipient;
        } else {
            return res.status(403).json({ error: 'You are not authorized to update this message' });
        }

        // Save the updated message
        await message.save();

        res.status(200).json(message);
    } catch (error) {
        console.error('Error toggling message archive status:', error);
        res.status(500).json({ error: 'Something went wrong' });
    }
});

// Retrieve archived messages
router.get('/messages/archived', authenticate, async (req, res) => {
    const userId = req.user.id;
    const organizationId = req.user.msg_id;

    try {
        // Find messages where the recipient or sender is either the user or the organization and are archived
        const archivedMessages = await Message.find({
            $or: [
                { recipient: userId, isArchivedByRecipient: true },
                { recipient: organizationId, isArchivedByRecipient: true },
                { senderId: userId, isArchivedBySender: true },
                { senderId: organizationId, isArchivedBySender: true }
            ]
        }).sort({ timestamp: -1 });

        res.status(200).json(archivedMessages);
    } catch (err) {
        console.error(err);
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
        const userId = req.user.id.toString();
        const organizationId = req.user.msg_id ? req.user.msg_id.toString() : null;
        const { tags, category } = req.body;

        // Debug logging
        console.log(`User ID: ${userId}`);
        console.log(`Organization ID: ${organizationId}`);
        console.log(`Message ID: ${messageId}`);

        const message = await Message.findById(messageId);

        if (!message) {
            return res.status(404).json({ error: 'Message not found' });
        }

        // Debug logging
        console.log(`Message Sender ID: ${message.senderId.toString()}`);
        console.log(`Message Recipient ID: ${message.recipient.toString()}`);

        // Determine if the user is the sender or recipient and update the appropriate fields
        if (message.senderId.toString() === userId) {
            if (tags) message.tagsBySender = tags;
            if (category) message.categoryBySender = category;
        } else if (message.recipient.toString() === userId || (organizationId && message.recipient.toString() === organizationId)) {
            if (tags) message.tagsByRecipient = tags;
            if (category) message.categoryByRecipient = category;
        } else {
            return res.status(403).json({ error: 'You are not authorized to update this message' });
        }

        await message.save();

        res.status(200).json(message);
    } catch (error) {
        console.error('Error updating message tags/category:', error);
        res.status(500).json({ error: 'Something went wrong' });
    }
});



// Retrieve messages by tags
router.get('/messages/tagged/:tag', authenticate, async (req, res) => {
    const userId = req.user.id.toString();
    const organizationId = req.user.msg_id ? req.user.msg_id.toString() : null;
    const tag = req.params.tag;

    try {
        const taggedMessages = await Message.find({
            $or: [
                { recipient: userId, tagsByRecipient: { $in: [tag] } },
                { senderId: userId, tagsBySender: { $in: [tag] } },
                { recipient: organizationId, tagsByRecipient: { $in: [tag] } }
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
    const userId = req.user.id.toString();
    const organizationId = req.user.msg_id ? req.user.msg_id.toString() : null;
    const category = req.params.category;

    try {
        // Query for messages where the user is either the sender or the recipient and matches the specified category
        const categorizedMessages = await Message.find({
            $or: [
                { senderId: userId,  categoryBySender: { $in: category } }, // User is the sender
                { recipient: userId, categoryByRecipient: { $in: category } }, // User is the recipient
                { recipient: organizationId, categoryByRecipient: { $in: category } } // Organization is the recipient
            ]
        }).sort({ timestamp: -1 });

        res.status(200).json(categorizedMessages);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Something went wrong' });
    }
});





module.exports = router;
