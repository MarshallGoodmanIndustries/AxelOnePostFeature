const jwt = require('jsonwebtoken');
const axios = require('axios');
const dotenv  = require("dotenv");
dotenv.config()

const authenticate = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SEC);
        req.user = decoded;


          // Log decoded token for debugging
          console.log('Decoded JWT:', decoded);
   

        const response = await axios.get('https://api.fyndah.com/api/v1/users/profile', {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        // Log API response for debugging
        console.log('User Profile Response:', response.data);

        req.user.email = response.data.data.user.email;

        next();
    } catch (error) {
        console.error(error);
        res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }
};

module.exports = authenticate;
