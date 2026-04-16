const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    return {
      folder: 'noteshare',
      resource_type: 'auto', // handles PDF, images, docs automatically
      public_id: Date.now() + '-' + file.originalname.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, ''),
      format: undefined, // keep original format, don't convert
    };
  },
});

module.exports = { cloudinary, storage };
