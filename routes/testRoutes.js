const express = require('express');
const router = express.Router();
const { testUpload } = require('../controllers/testController');
const upload = require('../middleware/upload');

// Public test route for debugging uploads
router.post('/upload', upload.single('image'), testUpload);

module.exports = router;
