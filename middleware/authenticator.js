const axios = require('axios');
const jwt = require('jsonwebtoken');
// const { refreshToken } = require("../utils/fetchWithRetry");

// Function to delay execution
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Function to fetch with retry mechanism
const fetchWithRetry = async (url, options, retries = 3, backoff = 300) => {
    for (let attempt = 0; attempt < retries; attempt++) {
        try {
            const response = await axios(url, options);
            return response;
        } catch (error) {
            if (error.response && error.response.status === 429) {
                console.warn(`Rate limit exceeded. Retrying in ${backoff}ms...`);
                await delay(backoff);
                backoff *= 2; // Exponential backoff
            } else {
                throw error;
            }
        }
    }
    throw new Error('Max retries exceeded');
};

const authenticate = async (req, res, next) => {
    let authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }

    let token = authHeader.split(' ')[1];
    try {
        let response = await fetchWithRetry('https://api.fyndah.com/api/v1/users/profile', {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 10000
        });
        let userProfile = response.data.user;

        let decoded = jwt.verify(token, process.env.JWT_SEC);

        // // If the token is valid but lacks org_msg_id, refresh it
        // if (!userProfile.org_msg_id) {
        //     token = await refreshToken(token);
        //     authHeader = `Bearer ${token}`;
        //     response = await fetchWithRetry('https://api.fyndah.com/api/v1/users/profile', {
        //         headers: { Authorization: authHeader },
        //         timeout: 10000
        //     });
        //     userProfile = response.data.user;
        //     decoded = jwt.verify(token, process.env.JWT_SEC);
        // }

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
