const express = require('express');
const router = express.Router();
const { getAllCategories, createCategory } = require('../controllers/categoryController');
const { protect, admin } = require('../middlewares/authMiddleware');

// Public routes - Make sure these are accessible without authentication
router.get('/all', getAllCategories);
router.get('/', getAllCategories); // Add this line to handle /api/categories or /api/category directly

// Protected routes
router.post('/', protect, admin, createCategory);

module.exports = router;