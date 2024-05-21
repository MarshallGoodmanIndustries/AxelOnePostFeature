const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const postRouter = require('./routes/postRoute'); // Adjust path accordingly

const app = express();

// Middleware
app.use(bodyParser.json());

// Routes
app.use('/api', postRouter);

// mongoose.connect('mongodb://localhost:27017/axeloneposts');

// Connect to MongoDB
mongoose.connect("mongodb+srv://bellsehr:password1234@bellsehr.bwuj4eh.mongodb.net/?retryWrites=true&w=majority").then(() => {
    console.log('Connected to MongoDB');
}).catch(err => {
    console.error('Could not connect to MongoDB', err);
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
