const { v2: cloudinary } = require('cloudinary');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

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

const upload = multer({
	fileFilter,
	limits: {
		files: 6,
		fileSize: 1024 * 1024 * 100, //10MB (max file size)
	},
	storage: new CloudinaryStorage({
		cloudinary: cloudinary,
		params: {
			folder: 'EHR',
			public_id: (req, file) =>
				`${Date.now()}-${file.originalname.toLowerCase()}`,
		},
	}),
});

module.exports = { upload };
