const asyncHandler = require('express-async-handler');
const Post = require('../models/post');
const upload = require('../utils/fileUpload');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get all posts
// @route   GET /api/posts
// @access  Public
exports.getPosts = asyncHandler(async (req, res) => {
  const posts = await Post.find()
    .populate('author', 'name')
    .sort({ createdAt: -1 });  // Sort by newest first
    
  res.status(200).json({ 
    success: true, 
    count: posts.length,
    data: posts 
  });
});

// @desc    Get single post
// @route   GET /api/posts/:id
// @access  Public
exports.getPost = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id).populate('author', 'name');
  if (!post) {
    throw new ErrorResponse(`Post not found with id of ${req.params.id}`, 404);
  }
  res.status(200).json({ success: true, data: post });
});

// @desc    Get post by slug
// @route   GET /api/posts/slug/:slug
// @access  Public
exports.getPostBySlug = asyncHandler(async (req, res) => {
  const post = await Post.findOne({ slug: req.params.slug })
    .populate('author', 'name');

  if (!post) {
    throw new ErrorResponse(`Post not found with slug of ${req.params.slug}`, 404);
  }

  res.status(200).json({
    success: true,
    data: post
  });
});

// @desc    Create post
// @route   POST /api/posts
// @access  Private
exports.createPost = async (req, res) => {
  try {
    // Add the logged-in user as author
    const post = await Post.create({
      ...req.body,
      author: req.user._id
    });

    res.status(201).json({
      success: true,
      data: post
    });
  } catch (error) {
    console.error('Create post error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Could not create post'
    });
  }
};

// @desc    Update post
// @route   PUT /api/posts/:id
// @access  Private
exports.updatePost = asyncHandler(async (req, res) => {
  let post = await Post.findById(req.params.id);
  if (!post) {
    throw new ErrorResponse(`Post not found with id of ${req.params.id}`, 404);
  }
  
  if (post.author.toString() !== req.user.id && req.user.role !== 'admin') {
    throw new ErrorResponse(`User not authorized to update this post`, 401);
  }
  
  post = await Post.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });
  
  res.status(200).json({ success: true, data: post });
});

// @desc    Delete post
// @route   DELETE /api/posts/:id
// @access  Private
exports.deletePost = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) {
    throw new ErrorResponse(`Post not found with id of ${req.params.id}`, 404);
  }
  
  if (post.author.toString() !== req.user.id && req.user.role !== 'admin') {
    throw new ErrorResponse(`User not authorized to delete this post`, 401);
  }
  
  await post.remove();
  res.status(200).json({ success: true, data: {} });
});

// @desc    Upload post image
// @route   POST /api/posts/:id/image
// @access  Private
exports.uploadImage = async (req, res) => {
  try {
    const uploadMiddleware = upload.single('image');
    
    uploadMiddleware(req, res, async function(err) {
      if (err) {
        return res.status(400).json({ success: false, error: err.message });
      }
      
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'Please upload a file' });
      }
      
      const post = await Post.findByIdAndUpdate(
        req.params.id,
        { image: `/uploads/${req.file.filename}` },
        { new: true, runValidators: true }
      );
      
      if (!post) {
        return res.status(404).json({ success: false, error: 'Post not found' });
      }
      
      res.status(200).json({ success: true, data: post });
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
