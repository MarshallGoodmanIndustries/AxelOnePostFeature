const express = require('express');
const router = express.Router();
const { authenticate, checkOrganization } = require('../middleware/authenticate');
const multer = require('multer');
const { storage } = require('../middleware/multerConfig'); // Adjust the path as necessary
const upload = multer({ storage });
const Post = require('../models/post');
const Listings = require('../models/listing'); // Adjust the path as necessary
const Comment = require('../models/comments');
//fetch one post
const WebSocket = require('ws');

// Create a WebSocket server
const wss = new WebSocket.Server({ port: 8080});

// Create post
router.post('/post', authenticate, checkOrganization, upload.single('image'), async (req, res) => {
    try {
        const { title, description} = req.body;
        console.log('req.user.email', req.user.email, req.user.id, req.user.username, req.user.organization_id);
        
        // Debug log to check req.user
        console.log('req.user before creating post:', req.user.email);
        console.log('Request Body:', req.body);
        
        // Optional image handling
        let imageUrl = '';
        if (req.file) {
            imageUrl = req.file.path; // Cloudinary URL
        }

        // Create new post
        const newPost = new Post({
            title,
            description,
            author: req.user.id,
            authorEmail: req.user.email,
            authorUsername: req.user.username,
            image: imageUrl // Add image URL to the post document
        });

        await newPost.save();

        res.status(201).json({ status: 'success', data: { post: newPost } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
});


//edit post
router.put('/post/:postId', authenticate, checkOrganization,  async (req, res) => {
    try {
        const postId = req.params.postId;
        const { title, description } = req.body;

        // Find the post by ID
        const post = await Post.findById(postId);

        // Check if the post exists
        if (!post) {
            return res.status(404).json({ status: 'error', message: 'Post not found' });
        }

        // Check if the current user is the author of the post
        if (post.author !== req.user.id) {
            return res.status(403).json({ status: 'error', message: 'You are not authorized to edit this post' });
        }

        // Update the post
        post.title = title;
        post.description = description;

        await post.save();

        res.status(200).json({ status: 'success', data: { post } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
});

//delete post
router.delete('/post/:postId', authenticate, checkOrganization,  async (req, res) => {
    try {
        const postId = req.params.postId;

        // Find the post by ID
        const post = await Post.findById(postId);

        // Check if the post exists
        if (!post) {
            return res.status(404).json({ status: 'error', message: 'Post not found' });
        }

        // Check if the current user is the author of the post
        if (post.author !== req.user.id) {
            return res.status(403).json({ status: 'error', message: 'You are not authorized to delete this post' });
        }

        // Delete the post
        await Post.findByIdAndDelete(postId);

        res.status(200).json({ status: 'success', message: 'Post deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
});


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

//get post
router.get('/homePage', async (req, res) => {
    try {
        // Querying posts and populating comments and likes
        const posts = await Post.find().populate('comments likes');

        // Adding total number of likes for each post
        const postsWithLikeCount = posts.map(post => {
            return {
                ...post._doc,
                likesCount: post.likes.length
            };
        });

        // Querying listings (if needed)
        // const listings = await Listings.find().populate('comments');

        // Sending both posts and listings in the response
        res.status(200).json({ 
            status: "success", 
            data: { 
                posts: postsWithLikeCount 
            } 
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({ status: "error", message: "Internal Server Error" });
    }
});

//comment on a post
router.post('/comment/:postId', authenticate, async (req, res) => {
    try{

        // Find the post the comment is to be associated with
        const post = await Post.findById(req.params.postId);
        if (!post) {
            return res.status(404).json({ status: 'error', message: 'Post not found' });
        }

        //create new comment
        const newComment = await Comment.create({
            ...req.body,
               author: req.user.username,
               post: post._id
        });

        post.comments.push(newComment);
        await post.save();
        res.status(201).json({ status: 'success', data: { newComment} });
    } catch (err) {
        console.log(err)
    }
});

router.get('/comments/:postId', async (req, res) => {
    try {
        const postId = req.params.postId;

        // Query comments associated with the specified post
        const comments = await Comment.find({ post: postId });

        res.status(200).json({ status: 'success', data: { comments } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
});
//edit a comment
router.patch('/comment/edit/:commentId', authenticate, async (req, res) => {
    try {
        const commentId = req.params.commentId;
        const comment = await Comment.findById(commentId);

        if (!comment) {
            return res.status(404).json({ status: 'error', message: 'Comment not found' });
        }

        // Check if the current user is the author of the comment
        if (comment.author !== req.user.id) {
            return res.status(403).json({ status: 'error', message: 'You are not authorized to edit this comment' });
        }

        // Update the comment content
        comment.comment = req.body.comment; // Assuming 'comment' is the field for the comment content

        // Save the updated comment
        await comment.save();

        res.status(200).json({ status: 'success', message: 'Comment updated successfully', data: comment });
    } catch (err) {
        console.error(err);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
});

//////websockets///////////////////
// Handle WebSocket connections
wss.on('connection', function connection(ws) {
    console.log('Client connected');
});

async function saveCommentToDatabase(commentData) {
    try {
        // Create a new instance of the Comment model with the provided data
        const newComment = new Comment(commentData);
        
        // Save the new comment to the database
        await newComment.save();
        
        // Return the saved comment
        return newComment;
    } catch (error) {
        // Handle any errors that occur during the saving process
        throw new Error('Failed to save comment to the database');
    }
}

// Your route to handle comment addition
router.post('/comments/:postId', authenticate, async(req, res) => {
    try {
        // Add your logic to save the comment to the database
        const newComment = await saveCommentToDatabase(req.body);

        // Broadcast the new comment to all connected clients
        wss.clients.forEach(function each(client) {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(newComment));
            }
        });

        res.status(200).json({ status: "success", data: { comment: newComment } });
    } catch (err) {
        console.log(err);
        res.status(500).json({ status: "error", message: "Internal Server Error" });
    }
});

//////websockets///////////////////

//delete a comment
router.delete("/comment/delete/:commentId", authenticate, async(req, res) => {
    try{
        const commentId = req.params.commentId;
        const comment = await Comment.findById(commentId);

        if (!comment) {
            return res.status(404).json({ status: 'error', message: 'Comment not found' });
        }

        // Check if the current user is the author of the comment
        if (comment.author !== req.user.id) {
            return res.status(403).json({ status: 'error', message: 'You are not authorized to delete this comment' });
        }

        // Remove the comment from the database
        await Comment.findByIdAndDelete(commentId);

        res.status(200).json({ status: 'success', message: 'Comment deleted successfully' });

    } catch (err){
        console.log(err)
        res.status(401).json({status:"success", message: "internal server error. Could not delete comment"})
    }
});

//like a post
router.post('/post/:id/like', authenticate, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);

        if (!post) {
            return res.status(404).json({ status: 'error', message: 'Post not found' });
        }

        // Check if user has already liked the Post
        if (post.likes.includes(req.user.id)) {
            return res.status(400).json({ status: 'error', message: 'You have already liked this post' });
        }

        // Add user ID to likes array
        post.likes.push(req.user.id);
        await post.save();

        res.status(200).json({ status: 'success', data: { likesCount: post.likes.length }});
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
});

// Unlike a post
router.post('/post/:id/unlike', authenticate, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);

        if (!post) {
            return res.status(404).json({ status: 'error', message: 'Post not found' });
        }

        // Check if user has not liked the post
        if (!post.likes.includes(req.user.id)) {
            return res.status(400).json({ status: 'error', message: 'You have not liked this post' });
        }

        // Remove user ID from likes array
        post.likes = post.likes.filter(id => id.toString() !== req.user.id.toString());
        await post.save();

        res.status(200).json({ status: 'success',  data: { likesCount: post.likes.length }});
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
});




module.exports = router;
