const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
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
// listingId: {
//     type: String,
//     required: false
// },
conversationId: {
  type: String
}
},
{ timestamps: true }
);

module.exports = mongoose.model('Message', messageSchema);