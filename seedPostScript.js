const mongoose = require('mongoose');
const fs = require('fs');
const Post = require('./models/Post'); 
const Message = require('./models/message');
const Conversation = require('./models/conversations');
    // Adjust the path as needed

mongoose.connect("mongodb+srv://bellsehr:password1234@bellsehr.bwuj4eh.mongodb.net/?retryWrites=true&w=majority").then(() => {
    console.log('Connected to MongoDB');
}).catch(err => {
    console.error('Could not connect to MongoDB', err);
});

// const seedPosts = async () => {
//     try {
//         const data = fs.readFileSync('seed.json', 'utf-8');
//         const posts = JSON.parse(data);

//         // Clear existing posts before seeding new ones (optional)
//         await Post.deleteMany({});
        
//         await Post.insertMany(posts);

//         console.log('Data successfully seeded!');
//         mongoose.connection.close();
//     } catch (error) {
//         console.error('Error seeding data:', error);
//         mongoose.connection.close();
//     }
// };

const conversation = async() => {
    try {

        // Clear existing posts before seeding new ones (optional)
      await  Conversation.deleteMany({});

        console.log('Data successfully deleted!');
        mongoose.connection.close();
    } catch (error) {
        console.error('Error seeding data:', error);
        mongoose.connection.close();
    }
};


// seedPosts();
conversation();
