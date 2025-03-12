const asyncHandler = require('express-async-handler');
const Tag = require('../models/tag');
const Post = require('../models/post');
const slugify = require('slugify');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get all tags with post counts
// @route   GET /api/tags
// @access  Public
exports.getTags = asyncHandler(async (req, res) => {
  // Add pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 50;
  const startIndex = (page - 1) * limit;
  
  // Filter options
  const filter = {};
  if (req.query.search) {
    filter.name = { $regex: req.query.search, $options: 'i' };
  }
  
  // Sort options
  const sortField = req.query.sort || 'name';
  const sortOrder = req.query.order === 'desc' ? -1 : 1;
  const sortOptions = {};
  sortOptions[sortField] = sortOrder;

  const tags = await Tag.find(filter)
    .sort(sortOptions)
    .skip(startIndex)
    .limit(limit);

  // Add post count for each tag
  const tagsWithPostCount = await Promise.all(
    tags.map(async (tag) => {
      const postCount = await Post.countDocuments({ tags: tag._id, published: true });
      return {
        ...tag.toObject(),
        postCount
      };
    })
  );
    
  // Get total documents
  const total = await Tag.countDocuments(filter);
    
  res.status(200).json({ 
    success: true, 
    count: tags.length,
    pagination: {
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      total
    },
    data: tagsWithPostCount 
  });
});

// @desc    Get single tag by ID
// @route   GET /api/tags/:id
// @access  Public
exports.getTagById = asyncHandler(async (req, res) => {
  const tag = await Tag.findById(req.params.id);

  if (!tag) {
    return res.status(404).json({
      success: false,
      message: `Tag not found with id of ${req.params.id}`
    });
  }

  // Get post count for this tag
  const postCount = await Post.countDocuments({ tags: tag._id, published: true });

  res.status(200).json({ 
    success: true, 
    data: {
      ...tag.toObject(),
      postCount
    }
  });
});

// @desc    Create a new tag
// @route   POST /api/tags
// @access  Private/Admin
exports.createTag = asyncHandler(async (req, res) => {
  const { name, description } = req.body;

  // Check if tag with this name already exists
  const existingTag = await Tag.findOne({ name });
  if (existingTag) {
    return res.status(400).json({
      success: false,
      message: 'Tag with this name already exists'
    });
  }

  // Create slug from name
  const slug = slugify(name, { lower: true });

  const tag = await Tag.create({
    name,
    slug,
    description
  });

  res.status(201).json({
    success: true,
    data: tag
  });
});

// @desc    Update a tag
// @route   PUT /api/tags/:id
// @access  Private/Admin
exports.updateTag = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  const updateData = { description };

  // If name is being updated, update slug as well
  if (name) {
    // Check if another tag with this name already exists
    const existingTag = await Tag.findOne({ name, _id: { $ne: req.params.id } });
    if (existingTag) {
      return res.status(400).json({
        success: false,
        message: 'Another tag with this name already exists'
      });
    }

    updateData.name = name;
    updateData.slug = slugify(name, { lower: true });
  }

  const tag = await Tag.findByIdAndUpdate(
    req.params.id,
    updateData,
    { new: true, runValidators: true }
  );

  if (!tag) {
    return res.status(404).json({
      success: false,
      message: `Tag not found with id of ${req.params.id}`
    });
  }

  res.status(200).json({
    success: true,
    data: tag
  });
});

// @desc    Delete a tag
// @route   DELETE /api/tags/:id
// @access  Private/Admin
exports.deleteTag = asyncHandler(async (req, res) => {
  const tag = await Tag.findById(req.params.id);

  if (!tag) {
    return res.status(404).json({
      success: false,
      message: `Tag not found with id of ${req.params.id}`
    });
  }

  // Check if tag is used in any posts
  const postCount = await Post.countDocuments({ tags: tag._id });
  if (postCount > 0) {
    return res.status(400).json({
      success: false,
      message: `Cannot delete tag that is used in ${postCount} posts`
    });
  }

  await tag.remove();

  res.status(200).json({
    success: true,
    data: {}
  });
}); 