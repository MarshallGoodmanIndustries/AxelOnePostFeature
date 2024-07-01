const { v2: cloudinary } = require('cloudinary');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const sharp = require('sharp');

cloudinary.config({
	cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
	api_key: process.env.CLOUDINARY_API_KEY,
	api_secret: process.env.CLOUDINARY_API_SECRET,
});

const validFileTypes = ['image/jpeg', 'image/jpg', 'image/png'];

const fileFilter = (req, file, cb) => {
	if (validFileTypes.includes(file.mimetype)) {
		cb(null, true);
	} else {
		cb(
			new Error('Invalid file type. Only CSV, JPEG, PNG, JPG files are allowed')
		);
	}
};

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
        // Resize image to 300x200 pixels using sharp
        const resizedImageBuffer = await sharp(file.buffer)
            .resize({ width: 300, height: 200 })
            .toBuffer();

        // Return upload parameters
        return {
            folder: 'EHR', // Cloudinary folder
            public_id: `${Date.now()}-${file.originalname.toLowerCase().replace(/ /g, '-')}`, // Unique public ID
            resource_type: 'auto', // Automatically detect the resource type (image/video/raw)
            format: 'png', // Format to save in Cloudinary (adjust as needed)
            transformation: [{ quality: 'auto' }], // Transformation options (optional)
        };
    },
});

const upload = multer({
	fileFilter,
	limits: {
		files: 6,
		fileSize: 1024 * 1024 * 100, //10MB (max file size)
	},
	storage: storage,
});

module.exports = upload;
