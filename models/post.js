const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
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
        type: Number,
        required: true
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Post', postSchema);
