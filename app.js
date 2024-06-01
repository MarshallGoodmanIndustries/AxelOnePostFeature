// server.js
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const postRouter = require('./routes/postRoute'); // Adjust path accordingly
const listingRouter = require('./routes/listingRoute'); // Adjust path accordingly
const conversationRouter = require('./routes/conversations');
const messageRouter = require('./routes/messages');
const http = require('http');
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');

const authenticate = require('./middleware/authenticate'); // Your auth middleware

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: '*',
    }
});

// Middleware
app.use(bodyParser.json());
app.use(cors({ origin: true }));

// Routes
app.use('/api', postRouter);
app.use('/api', listingRouter);
app.use('/api/conversations', conversationRouter);
app.use('/api/messages', messageRouter);

// Connect to MongoDB
mongoose.connect('mongodb+srv://bellsehr:password1234@bellsehr.bwuj4eh.mongodb.net/?retryWrites=true&w=majority').then(() => {
    console.log('Connected to MongoDB');
}).catch(err => {
    console.error('Could not connect to MongoDB', err);
});

// Socket.IO setup
io.use((socket, next) => {
    const token = socket.handshake.query.token;
    if (token) {
        jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
            if (err) {
                return next(new Error('Authentication error'));
            }
            socket.user = user;
            next();
        });
    } else {
        next(new Error('Authentication error'));
    }
});

io.on('connection', (socket) => {
    console.log('A user connected', socket.id);

    socket.on('joinRoom', ({ roomId, userId }) => {
        socket.join(roomId);
        console.log(`${userId} joined room: ${roomId}`);
        socket.to(roomId).emit('userJoined', { userId });
    });

    socket.on('sendMessage', async ({ roomId, message, userId }) => {
        console.log(`Message from ${userId} in room ${roomId}: ${message}`);
        socket.to(roomId).emit('receiveMessage', { userId, message });
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected', socket.id);
    });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});















// const express = require('express');
// const cors = require("cors");
// const mongoose = require('mongoose');
// const bodyParser = require('body-parser');
// const postRouter = require('./routes/postRoute'); // Adjust path accordingly
// const listingRouter = require('./routes/listingRoute'); // Adjust path accordingly
// const conversationRouter = require('./routes/conversations'); // Adjust path accordingly
// const messageRouter = require('./routes/messages'); // Adjust path accordingly

// const http = require('http');
// const socketIo = require('socket.io');
// const app = express();
// const server = http.createServer(app);
// const io = socketIo(server);
// // Middleware
// app.use(bodyParser.json());
// app.use(cors({origin: true}));
// // Routes
// app.use('/api', postRouter);
// app.use('/api', listingRouter);
// app.use('/api', conversationRouter);
// app.use('/api', messageRouter);

// // mongoose.connect('mongodb://localhost:27017/axeloneposts');

// // Connect to MongoDB
// mongoose.connect("mongodb+srv://bellsehr:password1234@bellsehr.bwuj4eh.mongodb.net/?retryWrites=true&w=majority").then(() => {
//     console.log('Connected to MongoDB');
// }).catch(err => {
//     console.error('Could not connect to MongoDB', err);
// });

// // Socket.IO setup
// io.on('connection', (socket) => {
//     console.log('A user connected', socket.id);
  
//     socket.on('joinRoom', ({ roomId, userId }) => {
//       socket.join(roomId);
//       console.log(`${userId} joined room: ${roomId}`);
//       socket.to(roomId).emit('userJoined', { userId });
//     });
  
//     socket.on('sendMessage', ({ roomId, message, userId }) => {
//       console.log(`Message from ${userId} in room ${roomId}: ${message}`);
//       socket.to(roomId).emit('receiveMessage', { userId, message });
//     });
  
//     socket.on('disconnect', () => {
//       console.log('A user disconnected', socket.id);
//     });
//   });
//   //////////////////////////////////////////
// // Direct Message an Org
// ///////////////////////////////////////////


// router.get('/messages/:listingId', async (req, res) => {
//   const { listingId } = req.params;
//   const messages = await Message.find({ listingId }).sort({ timestamp: 1 });
//   res.json(messages);
// });


// //socket io connection
// io.on("connection", (socket) => {
//   console.log("New client connected");

//   socket.on("join", ({listingId, userId}) => {
//       socket.join(listingId);
//       console.log(`${userId} joined ${listingId}`);
//   });

//   socket.on("sendMessage", async ({sender, recipient, listingId, messageId}) =>{
//       const newMessage = new Message ({sender, recipient, listingId, message});

//       await newMessage.save();

//       io.to(listingId).emit("recievedMessage", newMessage);
//   })

//   socket.on("disconnect", () => {
//       console.log("client disconnected");
//   })

// })


// // Apply middleware to chat routes
// app.use('/messages', authenticate);
// io.use((socket, next) => {
//   const token = socket.handshake.query.token;
//   if (token) {
//       jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
//           if (err) {
//               return next(new Error('Authentication error'));
//           }
//           socket.user = user;
//           next();
//       });
//   } else {
//       next(new Error('Authentication error'));
//   }
// });

// router.post('/send-message', async (req, res) => {
//   const { sender, recipient, listingId, message } = req.body;
//   if (!sender || !recipient || !listingId || !message) {
//     return res.status(400).json({ error: 'All fields are required' });
//   }
//   try {
//     const newMessage = new Message({ sender, recipient, listingId, message });
//     await newMessage.save();
//     io.to(listingId).emit('receiveMessage', newMessage); // This broadcasts the message in real-time
//     res.status(200).json(newMessage);
//   } catch (err) {
//     res.status(500).json({ error: 'Something went wrong' });
//   }
// });

// const message = require('../models/message');

// router.post("/dm", async (req, res) => {
//     const newMessage = new message(req.body)

//     try{
//         const savedMessage = await newMessage.save();
//         res.status(200).json(savedMessage)
//     } catch (err) {
//         res.status(500).json(err)
//     }
// });

// router.get("/:conversationId", async(req, res) => {
//     try{

//         const messages = await message.find({

//             conversationId:req.params.conversationId,

//         })

//         res.status(200).json(messages)

//     } catch (err) {
//         res.status(500).json(err)
//     }
// })


// const Conversation = require('../models/conversations')

// //new conversation
// router.post("/conversation", async (req, res) => {
//     const newConversation = new Conversation({
//         members: [req.body.senderId, req.body.recieverId],
//     });

//     try {

//         const savedConversation = await newConversation.save()
//         res.status(200).json(savedConversation);

//     } catch (err){
//         res.status(500).json(err)
//     }
// });

// //get conversation by org id

// router.get("/conversation/:userId", async(req, res) => {
//     try{
//         const conversation = await Conversation.find({
//             members: { $in: [req.params.userId]},
//         })

//         res.status(200).json(conversation)

//     } catch (err) {
//         res.status(500).json(err);
//     }
// })
  
// // Start the server
// const PORT = process.env.PORT || 3000;
// server.listen(PORT, () => {
//     console.log(`Server running on port ${PORT}`);
// });
