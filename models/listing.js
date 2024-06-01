const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Define Listing schema
const listingSchema = new Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    image: {
        type: String
    },
    description: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['product', 'service', 'real_estate', 'job', 'event'],
        required: true
    },
    // price: {
    //     type: Number,
    //     required: function() {
    //         return this.type === 'product' || this.type === 'service';
    //     }
    // },
    contactEmail: {
        type: String,
        required: true
    },
    contactPhone: {
        type: String,
        required: false
    },
    author: {
        type: Number,
        required: true
    },
    likes: [{
        type: Number,
        required: true
    }],
    location: {
        type: String,
        required: false
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
    comments:[{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Comment" // Ensure this matches the model name of your Comment model
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date
    }
});

// Add pre-save hook to update `updatedAt` field
listingSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Listing', listingSchema);