const express = require('express');
const router = express.Router();
const { authenticate, checkOrganization } = require('../middleware/authenticate');
const upload = require('../middleware/multerConfig');
const Comment = require('../models/comments')
const Listing = require("../models/listing")
const customError = require("../utils/customError")
const Message = require("../models/message");
const app = express();
const http = require('http');
const socketIo = require('socket.io');
const server = http.createServer(app);
const io = socketIo(server);

//create post
router.post('/listing', authenticate, checkOrganization, upload.single('image'), async (req, res) => {
    try {
        const { title, description, contactEmail, contactPhone, type, location, status } = req.body;
        console.log('req.user.email', req.user.email, req.user.id, req.user.username)
        // Debug log to check req.user
        console.log('req.user before creating listing:', req.user.email);

        let imageUrl = '';
        if (req.file) {
            imageUrl = req.file.path; // Cloudinary URL
        }

        // Create new post
        const newListing = new Listing({
            title,
            description,
            author: req.user.id,
            authorEmail: req.user.email,
            authorUsername: req.user.username,
            contactEmail, 
            contactPhone, 
            type, 
            location, 
            status,
            image: imageUrl // Add image URL to the post document

        });
       
        await newListing.save();

        res.status(201).json({ status: 'success', data: { post: newListing } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
});

//edit post
router.put('/listing/:listingId', authenticate, checkOrganization, async (req, res) => {
    try {
        const listingId = req.params.listingId;
        const { title, description, contactPhone, type, location, status} = req.body;

        // Find the post by ID
        const listing = await Listing.findById(listingId);

        // Check if the post exists
        if (!listing) {
            return res.status(404).json({ status: 'error', message: 'Listing not found' });
        }

        // Check if the current user is the author of the post
        if (listing.author !== req.user.id) {
            return res.status(403).json({ status: 'error', message: 'You are not authorized to edit this listing' });
        }

        // Update the post
        listing.title = title;
        listing.description = description;
        listing.contactPhone = contactPhone;
        listing.type = type;
        listing.location = location;
        listing.status = status;

        await listing.save();

        res.status(200).json({ status: 'success', data: { listing } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
});

//delete post
router.delete('/listing/:listingId', authenticate, async (req, res) => {
    try {
        const listingId = req.params.listingId;

        // Find the post by ID
        const listing = await Listing.findById(listingId);

        // Check if the post exists
        if (!listing) {
            return res.status(404).json({ status: 'error', message: 'Listing not found' });
        }

        // Check if the current user is the author of the post
        if (listing.author !== req.user.id) {
            return res.status(403).json({ status: 'error', message: 'You are not authorized to delete this listing' });
        }

        // Delete the post
        await Listing.findByIdAndDelete(listingId);

        res.status(200).json({ status: 'success', message: 'Listing deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
});

//like and dislike

// Like a listing
router.post('/listings/:id/like', authenticate, async (req, res) => {
    try {
        const listing = await Listing.findById(req.params.id);

        if (!listing) {
            return res.status(404).json({ status: 'error', message: 'Listing not found' });
        }

        // Check if user has already liked the listing
        if (listing.likes.includes(req.user.id)) {
            return res.status(400).json({ status: 'error', message: 'You have already liked this listing' });
        }

        // Add user ID to likes array
        listing.likes.push(req.user.id);
        await listing.save();

        res.status(200).json({ status: 'success', data: listing });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
});
// Unlike a listing
router.post('/listings/:id/unlike', authenticate, async (req, res) => {
    try {
        const listing = await Listing.findById(req.params.id);

        if (!listing) {
            return res.status(404).json({ status: 'error', message: 'Listing not found' });
        }

        // Check if user has not liked the listing
        if (!listing.likes.includes(req.user.id)) {
            return res.status(400).json({ status: 'error', message: 'You have not liked this listing' });
        }

        // Remove user ID from likes array
        listing.likes = listing.likes.filter(id => id.toString() !== req.user.id.toString());
        await listing.save();

        res.status(200).json({ status: 'success', data: listing });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
});

//Comment on a Listing
router.post('/comment/listing/:listingId', authenticate, async (req, res) => {
    try{

        // Find the listing the comment is to be associated with
        const listing = await Listing.findById(req.params.listingId);
        if (!listing) {
            return res.status(404).json({ status: 'error', message: 'Listing not found' });
        }

        //create new comment
        const newComment = await Comment.create({
            ...req.body,
               author: req.user.email,
               listing: listing._id
        });

        listing.comments.push(newComment);
        await listing.save();
        res.status(201).json({ status: 'success', data: { newComment} });
    } catch (err) {
        console.log(err)
    }
});

//Customer Reviews a listing after purchase

//Buy Now


module.exports = router;
