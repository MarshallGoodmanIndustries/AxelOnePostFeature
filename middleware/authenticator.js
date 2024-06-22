const axios = require('axios');
const jwt = require('jsonwebtoken');

// Helper function to fetch data with retry logic
const fetchWithRetry = async (url, options, retries = 3) => {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await axios(url, options);
            return response.data;
        } catch (error) {
            console.error(`Attempt ${i + 1} failed: ${error.message}`);
            if (i === retries - 1) throw error;
        }
    }
};

const authenticate = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    try {
        const response = await fetchWithRetry('https://api.fyndah.com/api/v1/users/profile', {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 10000
        });
        const userProfile = response.data.user;

        const decoded = jwt.verify(token, process.env.JWT_SEC);

        req.user = {
            ...decoded,
            email: userProfile.email,
            username: userProfile.username,
            id: userProfile.id,
            msg_id: userProfile.msg_id,
            org_msg_id: userProfile.org_msg_id
        };
        req.token = token;

        next();
    } catch (error) {
        console.error('Authentication error:', error.message);
        res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }
};

module.exports = authenticate;
