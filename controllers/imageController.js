const asyncHandler = require('express-async-handler');
const Post = require('../models/post');
const ErrorResponse = require('../utils/errorResponse');
const upload = require('../utils/fileUpload');

// @desc    Upload post image
// @route   PUT /api/v1/posts/:id/image
// @access  Private
exports.uploadPostImage = asyncHandler(async (req, res, next) => {
  const post = await Post.findById(req.params.id);

  if (!post) {
    return next(new ErrorResponse(`Post not found with id of ${req.params.id}`, 404));
  }

  // Make sure user is post owner
  if (post.author.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to update this post`,
        401
      )
    );
  }

  if (!req.file) {
    return next(new ErrorResponse(`Please upload a file`, 400));
  }

  await Post.findByIdAndUpdate(req.params.id, { 
    featuredImage: `/uploads/${req.file.filename}`,
    updatedAt: Date.now()
  });

  res.status(200).json({
    success: true,
    data: req.file.filename
  });
});

// @desc    Upload image
// @route   POST /api/images/upload
// @access  Private
exports.uploadImage = asyncHandler(async (req, res) => {
  return new Promise((resolve, reject) => {
    upload.single('image')(req, res, function(err) {
      if (err) {
        return res.status(400).json({ success: false, error: err.message });
      }
      
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'Please upload a file' });
      }
      
      res.status(200).json({ 
        success: true, 
        data: { 
          filename: req.file.filename,
          path: `/uploads/${req.file.filename}`
        } 
      });
    });
  });
});

// @desc    Get image
// @route   GET /api/images/:filename
// @access  Public
exports.getImage = asyncHandler(async (req, res) => {
  const filename = req.params.filename;
  // This assumes your images are stored in a public uploads folder
  // The actual file serving would typically be handled by Express static middleware
  res.status(200).json({ 
    success: true, 
    data: { 
      path: `/uploads/${filename}`
    } 
  });
});
