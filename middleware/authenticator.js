const jwt = require('jsonwebtoken');
const {fetchWithRetry} = require("../utils/fetchWithRetry");

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
