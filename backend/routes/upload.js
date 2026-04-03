const dotenv = require('dotenv');
dotenv.config();
const express = require('express');
const router = express.Router();
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const auth = require('../middleware/auth');

// Config Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'larocca-products',
        allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
    },
});

const parser = multer({ storage: storage });

// @route   POST api/upload/product
// @desc    Upload image to Cloudinary
// @access  Private
router.post('/product', auth, parser.single('image'), async (req, res) => { // 'image' is the form field name
    try {
        if (!req.file) {
            return res.status(400).json({ msg: 'No file uploaded' });
        }
        res.json({ imageUrl: req.file.path, publicId: req.file.filename });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server Error', details: err.message });
    }
});

// @route   DELETE api/upload/:publicId
// @desc    Delete image from Cloudinary
// @access  Private
router.delete('/:publicId', auth, async (req, res) => {
    const { publicId } = req.params;
    try {
        await cloudinary.uploader.destroy(publicId);
        res.json({ msg: 'Image deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
