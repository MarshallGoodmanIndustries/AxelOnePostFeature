const mongoose = require('mongoose');
const Post = require('./models/Post'); // Adjust the path to your Post model
const axios = require('axios');

async function updatePosts() {
    try {
        await mongoose.connect('mongodb+srv://bellsehr:password1234@bellsehr.bwuj4eh.mongodb.net/?retryWrites=true&w=majority', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        // Fetch organization details
        const organizationResponse = await axios.get('https://api.fyndah.com/api/v1/organization', {
            headers: { Authorization: `eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwczovL2FwaS5meW5kYWguY29tL2FwaS92MS9hdXRoL2xvZ2luIiwiaWF0IjoxNzE5MjQ2Mjc0LCJleHAiOjE3MTkyNDk4NzQsIm5iZiI6MTcxOTI0NjI3NCwianRpIjoiTllHdTBFTzd1TFdqWk1naSIsInN1YiI6IjQiLCJwcnYiOiIyM2JkNWM4OTQ5ZjYwMGFkYjM5ZTcwMWM0MDA4NzJkYjdhNTk3NmY3In0.8B0BHD7poSBE1nmDYOBcI4SXNIjx3IqT_9HeuuEviik` }, // Replace with appropriate token
            timeout: 10000
        });

        const organizations = organizationResponse.data.data;

        const updatePromises = organizations.map(async (org) => {
            const { id, org_name } = org;

            await Post.updateMany(
                { organization: id },
                { $set: { authorUsername: org_name } }
            );
        });

        await Promise.all(updatePromises);

        console.log('Database updated successfully');
        mongoose.connection.close();
    } catch (error) {
        console.error('Error updating posts:', error);
        mongoose.connection.close();
    }
}

updatePosts();
