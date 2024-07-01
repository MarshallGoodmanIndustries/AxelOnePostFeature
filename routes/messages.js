const express = require('express');
const router = express.Router();
const axios = require('axios');
const Message = require('../models/message');
const Conversation = require('../models/conversations');
const authenticate = require('../middleware/authenticator');
const nodemailer = require('nodemailer');
const transporter = require('../utils/nodemailer');
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

        // Ensure the recipient is a valid member and not undefined
        if (!recipientId || !conversation.members.includes(recipientId)) {
            console.log('Recipient not found or not a valid member of the conversation');
            return res.status(400).json({ error: 'Recipient not found or not a valid member of the conversation' });
        }

        // Fetch recipient's details from external APIs using maps for quick lookup
        let recipient;
        try {
            const userResponse = await axios.get('https://api.fyndah.com/api/v1/users/all', {
                headers: { Authorization: `Bearer ${req.token}` },
                timeout: 10000
            });
            const orgResponse = await axios.get('https://api.fyndah.com/api/v1/organization', {
                headers: { Authorization: `Bearer ${req.token}` },
                timeout: 10000
            });

            // Ensure userResponse.data and orgResponse.data.data are arrays
            const usersArray = Array.isArray(userResponse.data.data) ? userResponse.data.data : [userResponse.data.data];
            const orgsArray = Array.isArray(orgResponse.data.data) ? orgResponse.data.data : [orgResponse.data.data];

            // Create maps for quick lookup
            const userMap = new Map(usersArray.map(user => [user.msg_id, user]));
            const orgMap = new Map(orgsArray.map(org => [org.msg_id, org]));

            console.log('User Map Keys:', Array.from(userMap.keys()));
            console.log('Org Map Keys:', Array.from(orgMap.keys()));

            // Normalize recipientId
            const normalizedRecipientId = recipientId.trim();

            // Retrieve recipient details using maps
            recipient = userMap.get(normalizedRecipientId) || orgMap.get(normalizedRecipientId);

            console.log('Recipient ID:', normalizedRecipientId);
            console.log('Recipient details:', recipient);

            if (!recipient) {
                console.log('Recipient not found in external APIs');
                return res.status(404).json({ error: 'Recipient not found' });
            }
        } catch (error) {
            console.error('Error fetching recipient details from external APIs:', error.message);
            return res.status(500).json({ error: 'Failed to fetch recipient details' });
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

        // Send email notification
            const mailOptions = {
            from: process.env.EMAIL_USER,
            to: recipient.email,  // Ensure recipient object is defined and contains email property
            subject: 'New Message on Fyndah',
            text: `Hello ${recipient.username || recipient.name},\n\nYou have received a new message on Fyndah. Please log in to your account to view the message.\n\nBest regards,\nFyndah Team`
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error('Error sending email:', error);
            } else {
                console.log('Email sent:', info.response);
            }
        });

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

        // Ensure the recipient is a valid member and not undefined
        if (!recipientId || !conversation.members.includes(recipientId)) {
            console.log('Recipient not found or not a valid member of the conversation');
            return res.status(400).json({ error: 'Recipient not found or not a valid member of the conversation' });
        }

        // Fetch recipient's details from external APIs using maps for quick lookup
        let recipient;
        try {
            const userResponse = await axios.get('https://api.fyndah.com/api/v1/users/all', {
                headers: { Authorization: `Bearer ${req.token}` },
                timeout: 10000
            });
            const orgResponse = await axios.get('https://api.fyndah.com/api/v1/organization', {
                headers: { Authorization: `Bearer ${req.token}` },
                timeout: 10000
            });

            // Ensure userResponse.data and orgResponse.data.data are arrays
            const usersArray = Array.isArray(userResponse.data.data) ? userResponse.data.data : [userResponse.data.data];
            const orgsArray = Array.isArray(orgResponse.data.data) ? orgResponse.data.data : [orgResponse.data.data];

            // Create maps for quick lookup
            const userMap = new Map(usersArray.map(user => [user.msg_id, user]));
            const orgMap = new Map(orgsArray.map(org => [org.msg_id, org]));

            console.log('User Map Keys:', Array.from(userMap.keys()));
            console.log('Org Map Keys:', Array.from(orgMap.keys()));

            // Normalize recipientId
            const normalizedRecipientId = recipientId.trim();

            // Retrieve recipient details using maps
            recipient = userMap.get(normalizedRecipientId) || orgMap.get(normalizedRecipientId);

            console.log('Recipient ID:', normalizedRecipientId);
            console.log('Recipient details:', recipient);

            if (!recipient) {
                console.log('Recipient not found in external APIs');
                return res.status(404).json({ error: 'Recipient not found' });
            }
        } catch (error) {
            console.error('Error fetching recipient details from external APIs:', error.message);
            return res.status(500).json({ error: 'Failed to fetch recipient details' });
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

        // Send email notification
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: recipient.email,  // Ensure recipient object is defined and contains email property
            subject: 'New Message on Fyndah',
            text: `Hello ${recipient.username || recipient.name},\n\nYou have received a new message on Fyndah. Please log in to your account to view the message.\n\nBest regards,\nFyndah Team`
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error('Error sending email:', error);
            } else {
                console.log('Email sent:', info.response);
            }
        });

        console.log('Message sent successfully:', savedMessage);
        res.status(200).json(savedMessage);
    } catch (error) {
        console.error('Error sending message:', error.message);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

//Welcome Message from fyndah ;-)
router.post('/webhook/user-registered', async (req, res) => {
    const { msg_id, username } = req.body;

    try { 
        // Check if welcome message already sent for this user
        const existingMessage = await Message.findOne({ recipient: msg_id });

        if (existingMessage) {
            console.log('Welcome message already sent for user:', username);
            return res.status(200).json({ message: 'Welcome message already sent' });
        }
        //create a new conversation 
        const conversation = new Conversation({
            members: ['admin_msg_id', msg_id],
            updatedAt: new Date()
        });

        const savedConversation = await conversation.save()

        //create a welcome message
        const welcomeMessage = new Message({
            sender: 'Fyndah',
            conversationId: savedConversation._id,
            recipient: msg_id,
            senderId: 'admin_msg_id',
            message: `
                ${username}
                Welcome to Fyndah, ${username} 🎉
                We're thrilled to have you on board. Start exploring local businesses and services right away. Don’t forget to complete your profile to get the best recommendations and make the most of your Fyndah experience.
                Need help? Check out our support resources or reach out to us anytime. Happy discovering!
                The Fyndah Team 
                 `,
            createdAt: new Date()
        });
        

        const savedMessage = await welcomeMessage.save();

        console.log('Welcome message sent successfully:', savedMessage);
        res.status(200).json({ success: true, savedMessage});
    } catch (error) {
        console.error('Error handling user registration webhook:', error.message);
        res.status(500).json({ error: 'Failed to process webhook' });
    }
});
router.post('/webhook/org-registered', async (req, res) => {
    const { org_msg_id, org_name } = req.body;

    try { 
        // Check if welcome message already sent for this organization
        const existingMessage = await Message.findOne({ recipient: org_msg_id });

        if (existingMessage) {
            console.log('Welcome message already sent for org:', org_name);
            return res.status(200).json({ message: 'Welcome message already sent' });
        }
        //create a new conversation 
        const conversation = new Conversation({
            members: ['admin_msg_id', org_msg_id],
            updatedAt: new Date()
        });

        const savedConversation = await conversation.save()

        //create a welcome message
        const welcomeMessage = new Message({
            sender: 'Fyndah',
            conversationId: savedConversation._id,
            recipient: org_msg_id,
            senderId: 'admin_msg_id',
            message: `
            Hello ${org_name},

            Welcome to Fyndah! 🚀 We’re excited to help you connect with local customers.
            
            Set up your business profile to get started. 
             (Add profile setup link ^) 
            
            Make sure to fund your wallet, check out our lead management tools and advertising opportunities to maximize your reach.
             (Add respective links ^) 
            
            Need tips? We’ve got you covered with our resources and support. Let’s grow together!
            
             The Fyndah Team
                 `,
            createdAt: new Date()
        });
        

        const savedMessage = await welcomeMessage.save();

        console.log('Welcome message sent successfully:', savedMessage);
        res.status(200).json({ success: true, savedMessage});
    } catch (error) {
        console.error('Error handling user registration webhook:', error.message);
        res.status(500).json({ error: 'Failed to process webhook' });
    }
});

router.post('/user/messages/read', authenticate, async (req, res) => {
    try {
        const { conversationId, isRead } = req.body;

        if (!conversationId) {
            return res.status(400).json({ error: 'conversationId is required' });
        }

        if (typeof isRead !== 'boolean') {
            return res.status(400).json({ error: 'isRead must be a boolean' });
        }

        const userId = req.user.msg_id; // The authenticated user's ID

        console.log(`User ID: ${userId}`);

        // Find messages by conversation ID and recipient ID
        const messages = await Message.find({ conversationId, recipient: userId });

        if (!messages || messages.length === 0) {
            return res.status(404).json({ error: 'Messages not found' });
        }

        // Update the read status for valid messages
        await Message.updateMany(
            { _id: { $in: messages.map(msg => msg._id) } },
            { $set: { isReadByRecipient: isRead } }
        );

        // Emit the read status change to all relevant clients
        const io = req.io;
        io.to(conversationId).emit('messageRead', {
            conversationId,
            isRead
        });

        res.status(200).json({ message: 'Messages updated successfully' });
    } catch (error) {
        console.error('Error updating message read status:', error);
        res.status(500).json({ error: 'Something went wrong' });
    }
});

router.post('/organization/messages/read', authenticate, async (req, res) => {
    try {
        const { conversationId, isRead } = req.body;

        if (!conversationId) {
            return res.status(400).json({ error: 'conversationId is required' });
        }

        if (typeof isRead !== 'boolean') {
            return res.status(400).json({ error: 'isRead must be a boolean' });
        }

        const organizationId = req.user.org_msg_id; // The authenticated user's organization ID
        if (!organizationId) {
            return res.status(404).json({ error: 'Not a valid organization. Organization not found' });
        }
        console.log(`Organization ID: ${organizationId}`);
       

       // Find messages by conversation ID and recipient ID
       const messages = await Message.find({ conversationId, recipient: organizationId });

       if (!messages || messages.length === 0) {
           return res.status(404).json({ error: 'Messages not found' });
       }

         // Update the read status for valid messages
         await Message.updateMany(
            { _id: { $in: messages.map(msg => msg._id) } },
            { $set: { isReadByRecipient: isRead } }
        );

        // Emit the read status change to all relevant clients
        const io = req.io;
        io.to(conversationId).emit('messageRead', {
            conversationId,
            isRead
        });

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


//find all conversations with unread messages
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

        // Calculate the total number of conversations with unread messages
        const totalUnreadConversations = unreadMessagesByConversation.length;

        // Send the unread messages grouped by conversation and the total count in the response
        res.status(200).json({
            totalUnreadConversations,
            unreadMessagesByConversation
        });
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

        // Calculate the total number of conversations with unread messages
        const totalUnreadConversations = unreadMessagesByConversation.length;

        // Send the unread messages grouped by conversation and the total count in the response
        res.status(200).json({
            totalUnreadConversations,
            unreadMessagesByConversation
        });
    } catch (err) {
        console.error('Error fetching unread messages:', err);
        res.status(500).json({ error: 'Something went wrong' });
    }
});

// Route to toggle archive status (user)
router.post('/user/:messageId/toggle-archive', authenticate, async (req, res) => {
    try {
        const { messageId } = req.params;
        const userId = req.user.msg_id; 
        
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
router.get('/user/archived-messages', authenticate, async (req, res) => {
    const userId = req.user.msg_id; //user's message id

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
router.post('/org/:messageId/toggle-archive', authenticate, async (req, res) => {
    try {
        const { messageId } = req.params;
        const userId = req.user.org_msg_id; // User ID (can be either user or organization)
        
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
// Retrieve archived messages (org)
router.get('/org/archived-messages', authenticate, async (req, res) => {
    const userId = req.user.org_msg_id; // User ID (can be either user or organization)

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

router.post('/user/messages/:messageId/toggle-star', authenticate, async (req, res) => {
    try {
        const { messageId } = req.params;
        const userId = req.user.org_msg_id; // User ID (can be either user or organization)
        
        // Find the message by ID
        const message = await Message.findById(messageId);

        if (!message) {
            return res.status(404).json({ error: 'Message not found' });
        }

        // Determine if the user is the sender or recipient and toggle the respective field
        if (message.senderId.toString() === userId || message.recipient.toString() === userId) {
            if (message.senderId.toString() === userId) {
                // Toggle star status for the sender
                message.isStaredBySender = !message.isStaredBySender;
            }
            if (message.recipient.toString() === userId) {
                // Toggle archive status for the recipient
                message.isStaredByRecipient = !message.isStaredByRecipient;
            }
            // Save the updated message
            await message.save();
            res.status(200).json(message);
        } else {
            return res.status(403).json({ error: 'You are not authorized to update this message' });
        }
    } catch (error) {
        console.error('Error toggling message star status:', error);
        res.status(500).json({ error: 'Something went wrong' });
    }
});
// Retrieve star messages (user)
router.get('/user/messages/archived', authenticate, async (req, res) => {
    const userId = req.user.org_msg_id; 

    try {
        // Find stared messages where the user is either the sender or recipient
        const staredMessages = await Message.find({
            $or: [
                { recipient: userId, isStaredByRecipient: true },
                { senderId: userId, isStaredBySender: true }
            ]
        }).sort({ timestamp: -1 });

        res.status(200).json( staredMessages);
    } catch (err) {
        console.error('Error retrieving  stared messages:', err);
        res.status(500).json({ error: 'Something went wrong' });
    }
});

//toggle star status for org
router.post('/org/messages/:messageId/toggle-star', authenticate, async (req, res) => {
    try {
        const { messageId } = req.params;
        const userId = req.user.org_msg_id; // User ID (can be either user or organization)
        
        // Find the message by ID
        const message = await Message.findById(messageId);

        if (!message) {
            return res.status(404).json({ error: 'Message not found' });
        }

        // Determine if the user is the sender or recipient and toggle the respective field
        if (message.senderId.toString() === userId || message.recipient.toString() === userId) {
            if (message.senderId.toString() === userId) {
                // Toggle star status for the sender
                message.isStaredBySender = !message.isStaredBySender;
            }
            if (message.recipient.toString() === userId) {
                // Toggle star status for the recipient
                message.isStaredByRecipient = !message.isStaredByRecipient;
            }
            // Save the updated message
            await message.save();
            res.status(200).json(message);
        } else {
            return res.status(403).json({ error: 'You are not authorized to update this message' });
        }
    } catch (error) {
        console.error('Error toggling message star status:', error);
        res.status(500).json({ error: 'Something went wrong' });
    }
});

// Retrieve stared messages messages (org)
router.get('/org/messages/archived', authenticate, async (req, res) => {
    const userId = req.user.org_msg_id; // User ID (can be either user or organization)

    try {
        // Find stared messages where the user is either the sender or recipient
        const staredMessages = await Message.find({
            $or: [
                { recipient: userId, isStaredByRecipient: true },
                { senderId: userId, isStaredBySender: true }
            ]
        }).sort({ timestamp: -1 });

        res.status(200).json(staredMessages);
    } catch (err) {
        console.error('Error retrieving stared messages:', err);
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
