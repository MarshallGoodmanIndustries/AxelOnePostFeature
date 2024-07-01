const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  senderId:{
    type: String,
    required: true
  },
  sender: {
    type: String,
    required: true
  },
  recipient: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  conversationId: {
    type: String,
    required: true,
    index: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  isStaredBySender: {
    type: Boolean,
    default: false,
    index: true
  },
  isStaredByRecipient: {
    type: Boolean,
    default: false,
    index: true
  },
  isReadByRecipient: {
    type: Boolean,
    default: false
  },
  deletedFor: { 
    type: [String], 
    default: [] 
  },
  tagsBySender: {
    type: [String],
    default: []
  },
  tagsByRecipient: {
    type: [String],
    default: []
  },
  categoryBySender: {
    type: String,
    default: ''
  },
  categoryByRecipient: {
    type: String,
    default: ''
  }
},
{ timestamps: true }
);

// Indexes to optimize query performance
messageSchema.index({ sender: 1, recipient: 1 });
messageSchema.index({ recipient: 1, isReadByRecipient: 1 });
messageSchema.index({ recipient: 1, isStaredByRecipient: 1 });
messageSchema.index({ sender: 1, isStaredBySender: 1 });
messageSchema.index({ recipient: 1, tagsByRecipient: 1 });
messageSchema.index({ recipient: 1, categoryByRecipient: 1 });
messageSchema.index({ conversationId: 1, timestamp: -1 });

module.exports = mongoose.model('Message', messageSchema);