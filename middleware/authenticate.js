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
        
        // Logging API response for debugging
        console.log('User Profile Response:', response.data);
        req.user.email = response.data.data.user.email;
        req.user.username = response.data.data.user.username
        req.user.id = response.data.data.user.id
        next();
    } catch (error) {
        console.error(error);
        res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }
};



// const checkOrganization = async (req, res, next) => {
//     const { organizationId } = req.body; // Assuming organizationId is passed in the request body

//     if (!organizationId) {
//         return res.status(400).json({ status: 'error', message: 'Organization ID is required' });
//     }

//     try {
        
//         // Fetch organization details from the Laravel API
//         const response = await axios.get(`https://api.fyndah.com/api/v1/organization/${organizationId}?org_key=${organizationId}`);

//         const organization = response.data.data;

//         // Check if the user is the creator of the organization
//         const userIsCreator = organization.creator_id === req.user._id;

//         if (!userIsCreator) {
//             return res.status(403).json({ status: 'error', message: 'User is not the creator of the organization' });
//         }

//         next();
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ status: 'error', message: 'Internal server error' });
//     }
// };

module.exports = authenticate;



  // Check if the user is associated with the organization
        // const userIsAssociated = organization.members.some(member => member.id === req.user.id);

        // if (!userIsAssociated) {
        //     return res.status(403).json({ status: 'error', message: 'User is not associated with the organization' });
        // }
