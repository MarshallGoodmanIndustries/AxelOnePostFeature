const mongoose = require('mongoose');

const ConversationSchema = new mongoose.Schema({
    members: {
        type: [String],
        required: true
    },
    lastMessage: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Message' 
    },
    deletedFor: { 
        type: [String], 
        default: [] 
    },
    updatedAt: { type: Date, default: Date.now }
}, { 
    timestamps: true 
});

module.exports = mongoose.model('Conversation', ConversationSchema);
