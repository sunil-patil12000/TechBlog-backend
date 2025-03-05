const asyncHandler = require('express-async-handler');
const Category = require('../models/category');

// @desc    Get all categories
// @route   GET /api/category/all
// @access  Public
exports.getAllCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find().sort({ name: 1 });
  
  res.status(200).json({
    success: true,
    count: categories.length,
    data: categories
  });
});

// @desc    Create a new category
// @route   POST /api/category
// @access  Private/Admin
exports.createCategory = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  
  if (!name) {
    return res.status(400).json({
      success: false,
      message: 'Category name is required'
    });
  }

  const category = await Category.create({
    name,
    description,
    createdBy: req.user._id
  });

  res.status(201).json({
    success: true,
    message: 'Category created successfully',
    data: category
  });
});
