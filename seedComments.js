const mongoose = require('mongoose');
const fs = require('fs');
const Comment = require('./models/comments'); // Adjust the path as needed

mongoose.connect("mongodb+srv://bellsehr:password1234@bellsehr.bwuj4eh.mongodb.net/?retryWrites=true&w=majority").then(() => {
    console.log('Connected to MongoDB');
}).catch(err => {
    console.error('Could not connect to MongoDB', err);
});


const seedComments = async () => {
    try {
        const data = fs.readFileSync('comments.json', 'utf-8');
        const comments = JSON.parse(data);

        // Clear existing comments before seeding new ones (optional)
        await Comment.deleteMany({});
        
        await Comment.insertMany(comments);

        console.log('Data successfully seeded!');
        mongoose.connection.close();
    } catch (error) {
        console.error('Error seeding data:', error);
        mongoose.connection.close();
    }
};

seedComments();
