const jwt = require('jsonwebtoken');
const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

const socketAuthenticate = async (socket, next) => {
    const token = socket.handshake.query.token;
      console.log('Received token:', token)
    if (!token) {
        return next(new Error('Authentication error: No token provided'));
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SEC);
        const response = await axios.get('https://api.fyndah.com/api/v1/users/profile', {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        socket.user = {
            ...decoded,
            email: response.data.data.user.email,
            username: response.data.data.user.username,
            id: response.data.data.user.id,
            msg_id: userProfile.msg_id,
            org_msg_id: userProfile.org_msg_id
        };
        next();
    } catch (error) {
        console.error('Authentication error:', error);
        next(new Error('Authentication error'));
    }
};



module.exports = socketAuthenticate;
