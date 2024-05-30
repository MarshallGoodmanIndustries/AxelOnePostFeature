const express = require('express');
const cors = require("cors");
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const postRouter = require('./routes/postRoute'); // Adjust path accordingly
const listingRouter = require('./routes/listingRoute'); // Adjust path accordingly

const http = require('http');
const socketIo = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = socketIo(server);
// Middleware
app.use(bodyParser.json());
app.use(cors({origin: true}));
// Routes
app.use('/api', postRouter);
app.use('/api', listingRouter);

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
