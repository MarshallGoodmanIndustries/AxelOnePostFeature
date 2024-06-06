const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
    title: {
        type: String
    },
    description: {
        type: String,
        required: true
    },
    image: {
        type: String
    },
    organization: {
        type: String
    },
    author: {
        type: String
    },
    authorEmail: {
        type: String
    },
    authorUsername: {
        type: String
    },
    comments:[{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Comment" // Ensure this matches the model name of your Comment model
    }],
    likes: [{
        type: Number
    }]
},
{timestamps: true}
);

module.exports = mongoose.model('Post', postSchema);
