const jwt = require('jsonwebtoken');
const axios = require('axios');

const authenticate = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SEC);
        const response = await axios.get('https://api.fyndah.com/api/v1/users/profile', {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        req.user = {
            ...decoded,
            email: response.data.data.user.email,
            username: response.data.data.user.username,
            id: response.data.data.user.id
        };
        next();
    } catch (error) {
        console.error(error);
        res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }
};

module.exports = authenticate;
