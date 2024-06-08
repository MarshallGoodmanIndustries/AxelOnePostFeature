const mongoose = require('mongoose');

const ConversationSchema = new mongoose.Schema({
    members: {
        Sender: {
            type: String
        },
        reciever: {
            type: String
        },
        type: Array,
    },
    lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Conversation', ConversationSchema);