const axios = require('axios');

const fetchWithRetry = async (url, options, retries = 3) => {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await axios.get(url, options);
            return response.data; // Assuming response is JSON
        } catch (error) {
            console.error(`Attempt ${i + 1} failed: ${error.message}`);
            if (i === retries - 1) throw error;
        }
    }
};

// Function to get name by msg_id from userMap or organizationMap
const getNameById = (id, userMap, organizationMap) => {
    if (userMap[id]) {
        return {
            name: userMap[id].username,
            profilePhotoPath: userMap[id].profile_photo_path
        };
    } else if (organizationMap[id]) {
        return {
            name: organizationMap[id].org_name,
            logo: organizationMap[id].logo
        };
    } else {
        return { name: 'Unknown' };
    }
};

// Middleware to exclude soft deleted conversations and messages
async function excludeSoftDeleted(req, res, next) {
    try {
        const userId = req.user.msg_id;

        req.userId = userId;

        next();
    } catch (error) {
        console.error('Error excluding soft deleted:', error);
        res.status(500).json({ error: 'Something went wrong' });
    }
}

// Middleware to exclude soft deleted conversations and messages for organizations
async function excludeSoftDeletedForOrg(req, res, next) {
    try {
        const orgId = req.user.org_msg_id;

        req.orgId = orgId;

        next();
    } catch (error) {
        console.error('Error excluding soft deleted for organizations:', error);
        res.status(500).json({ error: 'Something went wrong' });
    }
}


module.exports = {
    fetchWithRetry,
    getNameById,
    excludeSoftDeleted,
    excludeSoftDeletedForOrg
}