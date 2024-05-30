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
        type: String,
        required: true
    },
    organizationId: {
        type: String,
        required: true
    },
    author: {
        type: String,
        required: true
    },
    authorEmail: {
        type: String,
        required: true
    },
    authorUsername: {
        type: String,
        required: true
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
