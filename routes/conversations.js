const express = require('express');
const router = express.Router();
const Conversation = require('../models/conversations')

//new conversation
router.post("/conversation", async (req, res) => {
    const newConversation = new Conversation({
        members: [req.body.senderId, req.body.recieverId],
    });

    try {

        const savedConversation = await newConversation.save()
        res.status(200).json(savedConversation);

    } catch (err){
        res.status(500).json(err)
    }
})

module.exports = router;
