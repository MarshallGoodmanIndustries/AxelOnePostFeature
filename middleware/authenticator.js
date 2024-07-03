const axios = require('axios');
const jwt = require('jsonwebtoken');
const { fetchWithRetry, refreshToken} = require("../utils/fetchWithRetry");

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
        
        // If the token is valid but lacks org_msg_id, refresh it
        if (!userProfile.org_msg_id) {
            token = await refreshToken(token);
            authHeader = `Bearer ${token}`;
            response = await fetchWithRetry('https://api.fyndah.com/api/v1/users/profile', {
                headers: { Authorization: authHeader },
                timeout: 10000
            });
            userProfile = response.data.user;
            decoded = jwt.verify(token, process.env.JWT_SEC);
        }

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
