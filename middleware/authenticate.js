
const jwt = require('jsonwebtoken');
const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

const authenticate = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SEC);
        req.user = decoded;
        const response = await axios.get('https://api.fyndah.com/api/v1/users/profile', {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        const userData = response.data.data.user;
        req.user.email = userData.email;
        req.user.username = userData.username;
        req.user.id = userData.id;
        req.user.organization_id = userData.organization_id;

        next();
    } catch (error) {
        console.error('Authentication error:', error);
        res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }
};


const checkOrganization = async (req, res, next) => {
    const organizationId = req.user.organization_id;

    if (!organizationId) {
        return res.status(400).json({ status: 'error', message: 'Organization ID is required' });
    }

    try {
        // Fetch organization details from the Laravel API
        const response = await axios.get(`https://api.fyndah.com/api/v1/organization/${organizationId}?org_key=${organizationId}`);
        const organization = response.data.data;

        // Log the organization details for debugging
        console.log('Organization details:', organization);

        // Check if the user is the creator of the organization
        // const userIsCreator = organization.creator_id === req.user.id;
        // console.log('User is creator:', userIsCreator);

        // if (!userIsCreator) {
        //     return res.status(403).json({ status: 'error', message: 'User is not the creator of the organization' });
        // }

        next();
    } catch (error) {
        console.error('Error fetching organization details:', error.response ? error.response.data : error.message);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

module.exports = { authenticate, checkOrganization };
