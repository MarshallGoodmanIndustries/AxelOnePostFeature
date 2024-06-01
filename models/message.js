const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
conversationId : {
  type : String
},
sender: {
  type: String
},
text: {
  type: String
},
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Message', messageSchema);


