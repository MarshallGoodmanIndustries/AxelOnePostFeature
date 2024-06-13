const mongoose = require('mongoose');

const ConversationSchema = new mongoose.Schema({
    members: {
        type: [String],
        required: true
    },
    lastMessage: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Message' 
    }
}, { 
    timestamps: true 
});

module.exports = mongoose.model('Conversation', ConversationSchema);
