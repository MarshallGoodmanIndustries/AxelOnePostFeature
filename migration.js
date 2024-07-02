const mongoose = require('mongoose');
const Messages = require('./models/message'); // Adjust path as per your project structure

mongoose.connect('mongodb+srv://bellsehr:password1234@bellsehr.bwuj4eh.mongodb.net/?retryWrites=true&w=majority', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(async () => {
    try {
        // Run an aggregation pipeline to update the documents
        const result = await Messages.updateMany(
            {
                $or: [
                    { deletedForSender: { $exists: true } },
                    { deletedForRecipient: { $exists: true } }
                ]
            },
            [
                {
                    $set: {
                        deletedFor: {
                            $setUnion: [
                                { $cond: [{ $ne: ["$deletedForSender", null] }, ["$deletedForSender"], []] },
                                { $cond: [{ $ne: ["$deletedForRecipient", null] }, ["$deletedForRecipient"], []] }
                            ]
                        }
                    }
                },
                {
                    $unset: ["deletedForSender", "deletedForRecipient"]
                }
            ]
        );

        console.log(`Migration completed successfully. Modified ${result.nModified} documents.`);
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        mongoose.disconnect();
    }
}).catch(error => {
    console.error('MongoDB connection error:', error);
});
