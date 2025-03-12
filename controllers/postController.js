const asyncHandler = require('express-async-handler');
const Post = require('../models/post');
const ErrorResponse = require('../utils/errorResponse');
const imagePathConfig = require('../utils/imagePathConfig');
const path = require('path');
const fs = require('fs');

// @desc    Get all posts
// @route   GET /api/posts
// @access  Public
exports.getPosts = asyncHandler(async (req, res) => {
  // Add pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;
  
  // Filter options
  const filter = {};
  if (req.query.category) filter.category = req.query.category;
  if (req.query.tag) filter.tags = { $in: [req.query.tag] };
  if (req.query.search) {
    filter.$or = [
      { title: { $regex: req.query.search, $options: 'i' } },
      { content: { $regex: req.query.search, $options: 'i' } }
    ];
  }

  // Published filter - allow admins to see unpublished posts
  if (req.query.published === 'false' && req.user?.role === 'admin') {
    filter.published = false;
  } else if (req.query.published === 'true') {
    filter.published = true;
  } else if (!req.user || req.user.role !== 'admin') {
    // Non-admins can only see published posts
    filter.published = true;
  }
  
  // Filter by publish date
  if (req.query.hasPublishDate === 'true') {
    filter.publishDate = { $exists: true, $ne: null };
  }
  
  // Sort options
  const sortField = req.query.sort || 'createdAt';
  const sortOrder = req.query.order === 'asc' ? 1 : -1;
  const sortOptions = {};
  sortOptions[sortField] = sortOrder;

  const posts = await Post.find(filter)
    .populate('author', 'name avatar')
    .sort(sortOptions)
    .skip(startIndex)
    .limit(limit);

  // Get total documents
  const total = await Post.countDocuments(filter);
    
  res.status(200).json({ 
    success: true, 
    count: posts.length,
    pagination: {
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      total
    },
    data: posts 
  });
});

// @desc    Get single post by ID
// @route   GET /api/posts/:id
// @access  Public
exports.getPostById = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id)
    .populate('author', 'name avatar')
    .populate('comments.author', 'name avatar');

  if (!post) {
    return res.status(404).json({
      success: false,
      message: `Post not found with id of ${req.params.id}`
    });
  }

  res.status(200).json({ 
    success: true, 
    data: post 
  });
});

// @desc    Get post by slug
// @route   GET /api/posts/slug/:slug
// @access  Public
exports.getPostBySlug = asyncHandler(async (req, res) => {
  const post = await Post.findOne({ slug: req.params.slug })
    .populate('author', 'name avatar bio')
    .populate({
      path: 'comments',
      populate: {
        path: 'user',
        select: 'name avatar'
      }
    });
    
  if (!post) {
    return res.status(404).json({ 
      success: false,
      message: 'Post not found' 
    });
  }
  
  // Increment the views count
  post.views = (post.views || 0) + 1;
  await post.save();
  
  res.status(200).json({ 
    success: true, 
    data: post 
  });
});

// @desc    Create a new post
// @route   POST /api/posts
// @access  Private/Admin
exports.createPost = asyncHandler(async (req, res) => {
  console.log('Creating post with body:', req.body);
  console.log('Files received:', req.files);
  console.log('Files count:', req.files ? req.files.length : 0);

  let tags = [];
  if (req.body.tags) {
    try {
      // Properly handle tags whether they're a string or already an array
      tags = typeof req.body.tags === 'string' 
        ? JSON.parse(req.body.tags) 
        : req.body.tags;
      
      // Ensure tags is always an array
      if (!Array.isArray(tags)) {
        tags = [];
      }
    } catch (err) {
      console.error('Error parsing tags:', err);
      // Continue with empty tags array rather than failing
    }
  }

  // Process uploaded images with better error handling
  let formUploadedImages = [];
  let contentImages = [];
  let images = [];
  try {
    // First, process images uploaded directly with the form
    if (req.files && req.files.length > 0) {
      console.log('Processing form-uploaded files:', req.files.length);
      req.files.forEach(file => {
        console.log(`File details: ${file.filename}, path: ${file.path}`);
      });
      
      formUploadedImages = req.files.map(file => {
        const imagePath = `/uploads/${file.filename}`;
        console.log(`Processing file path: ${imagePath}`);
        
        // Test file exists physically using our enhanced utility
        const { exists, path: foundPath } = imagePathConfig.imageExists(imagePath);
        if (exists) {
          console.log(`File exists at: ${foundPath}`);
        } else {
          console.error(`WARNING: File does not exist: ${imagePath}`);
        }
        
        const normalizedPath = imagePathConfig.normalizeImagePath(imagePath);
        console.log(`Normalized path: ${normalizedPath}`);
        
        return {
          url: normalizedPath,
          alt: req.body.title || 'Blog post image',
          originalFilename: file.filename
        };
      });
      console.log('Processed uploaded images:', JSON.stringify(formUploadedImages));
    } else {
      console.log('No images uploaded directly with the request');
    }

    // Then, extract images from TinyMCE content
    const content = req.body.content || '';
    const contentImageMatches = content.match(/<img[^>]+src="([^">]+)"/g) || [];
    console.log(`Found ${contentImageMatches.length} images in content`);
    
    for (const imgTag of contentImageMatches) {
      const srcMatch = imgTag.match(/src="([^">]+)"/);
      if (srcMatch && srcMatch[1]) {
        // Extract src attribute
        let imgSrc = srcMatch[1];
        
        // Use our enhanced utility to normalize the path
        let normalizedSrc = imagePathConfig.normalizeImagePath(imgSrc);
        if (!normalizedSrc) {
          console.warn(`Skipping image with invalid src: ${imgSrc}`);
          continue;
        }
        
        console.log('Found image in content:', normalizedSrc);
        
        // Check if the image actually exists
        const { exists, path: foundPath } = imagePathConfig.imageExists(normalizedSrc);
        if (!exists) {
          console.warn(`Warning: Content image may not exist: ${normalizedSrc}`);
        } else {
          console.log(`Content image exists at: ${foundPath}`);
        }
        
        // Extract alt if available
        const altMatch = imgTag.match(/alt="([^">]*)"/);
        const imgAlt = altMatch ? altMatch[1] : req.body.title || 'Blog post image';
        
        // Only add if this image isn't already in the form-uploaded images array
        const imageExists = formUploadedImages.some(img => img.url === normalizedSrc) || 
                          contentImages.some(img => img.url === normalizedSrc);
        if (!imageExists) {
          contentImages.push({
            url: normalizedSrc,
            alt: imgAlt
          });
          console.log('Added content image to contentImages array:', normalizedSrc);
        } else {
          console.log('Skipping duplicate image:', normalizedSrc);
        }
      }
    }

    // Combine both image arrays, with form-uploaded images first
    images = [...formUploadedImages, ...contentImages];
    console.log(`Final processed images count: ${images.length}`);
  } catch (error) {
    console.error('Error processing images:', error);
  }

  // Handle thumbnail selection with proper object creation
  let thumbnail = null;
  try {
    if (formUploadedImages.length > 0) {
      const thumbnailIndexStr = req.body.thumbnailIndex;
      console.log('thumbnailIndex (raw):', thumbnailIndexStr, typeof thumbnailIndexStr);
      
      const thumbnailIndex = parseInt(thumbnailIndexStr);
      console.log('thumbnailIndex (parsed):', thumbnailIndex, typeof thumbnailIndex);
      
      if (!isNaN(thumbnailIndex) && thumbnailIndex >= 0 && thumbnailIndex < formUploadedImages.length) {
        // Use the thumbnail index to select from form-uploaded images
        thumbnail = {
          url: formUploadedImages[thumbnailIndex].url,
          alt: formUploadedImages[thumbnailIndex].alt,
          originalFilename: formUploadedImages[thumbnailIndex].originalFilename
        };
        console.log('Selected thumbnail by index:', JSON.stringify(thumbnail));
        
        // Verify thumbnail image exists
        const { exists, path: foundPath } = imagePathConfig.imageExists(thumbnail.url);
        if (!exists) {
          console.warn(`Warning: Selected thumbnail may not exist: ${thumbnail.url}`);
        } else {
          console.log(`Thumbnail exists at: ${foundPath}`);
        }
      } else if (formUploadedImages.length > 0) {
        // Fallback to first form-uploaded image
        thumbnail = {
          url: formUploadedImages[0].url,
          alt: formUploadedImages[0].alt,
          originalFilename: formUploadedImages[0].originalFilename
        };
        console.log('Using first image as thumbnail (fallback):', JSON.stringify(thumbnail));
      }
    } else if (contentImages && contentImages.length > 0) {
      // If no form-uploaded images, use the first content image
      thumbnail = {
        url: contentImages[0].url,
        alt: contentImages[0].alt
      };
      console.log('Using first content image as thumbnail:', JSON.stringify(thumbnail));
    } else {
      console.log('No images available for thumbnail');
      thumbnail = null;
    }
  } catch (error) {
    console.error('Error setting thumbnail:', error);
    thumbnail = null;
  }

  // Create post data with careful handling of the thumbnail
  console.log('Creating post with thumbnail:', thumbnail ? JSON.stringify(thumbnail) : 'null');
  
  const postData = {
    title: req.body.title,
    content: req.body.content,
    author: req.user._id,
    category: req.body.category || null,
    tags: tags || [],
    images: images,
    published: req.body.published === 'true',
  };
  
  // IMPORTANT: Only set thumbnail field if we have a valid one
  if (thumbnail && thumbnail.url && thumbnail.alt) {
    postData.thumbnail = thumbnail;
    console.log('Setting valid thumbnail:', JSON.stringify(thumbnail));
  } else {
    // Explicitly don't set the thumbnail field at all
    console.log('No valid thumbnail, omitting field');
  }

  try {
    // Create and save the post
    const post = new Post(postData);
    
    // Final verification before save
    console.log('Post before save - has thumbnail:', post.thumbnail ? 'yes' : 'no');
    
    const createdPost = await post.save();
    console.log('Post saved successfully');
    console.log('Final thumbnail value:', createdPost.thumbnail ? JSON.stringify(createdPost.thumbnail) : 'null');
    
    // Make sure we return the full post with populated fields
    const populatedPost = await Post.findById(createdPost._id)
      .populate('author', 'name avatar');
      
    // Emit socket event to notify about new post
    if (req.io) {
      req.io.to('admin-room').emit('new-post', {
        id: createdPost._id,
        title: createdPost.title,
        author: createdPost.author,
        category: createdPost.category,
        createdAt: createdPost.createdAt
      });
    }
    
    res.status(201).json({
      success: true,
      message: 'Post created successfully',
      data: populatedPost
    });
  } catch (error) {
    console.error('Error saving post:', error.message);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error: ' + error.message,
        errors: error.errors
      });
    }
    
    throw error;
  }
});

// @desc    Update post
// @route   PUT /api/posts/:id
// @access  Private
exports.updatePost = asyncHandler(async (req, res) => {
  let post = await Post.findById(req.params.id);
  if (!post) {
    return res.status(404).json({
      success: false,
      message: `Post not found with id of ${req.params.id}`
    });
  }
  
  // Check post ownership
  if (post.author.toString() !== req.user.id && req.user.role !== 'admin') {
    return res.status(401).json({
      success: false,
      message: 'User not authorized to update this post'
    });
  }
  
  // Handle images
  let updateData = {...req.body};
  let images = post.images || [];
  
  // If new images are uploaded, add them
  if (req.files && req.files.length > 0) {
    const newImages = req.files.map(file => {
      const imagePath = `/uploads/${file.filename}`;
      const normalizedPath = imagePathConfig.normalizeImagePath(imagePath);
      return {
        url: normalizedPath,
        alt: req.body.title || post.title || 'Blog post image'
      };
    });
    
    images = [...images, ...newImages];
  }
  
  // NEW: Extract images from content if content was updated
  if (req.body.content) {
    try {
      const content = req.body.content;
      const contentImageMatches = content.match(/<img[^>]+src="([^">]+)"/g) || [];
      console.log(`Found ${contentImageMatches.length} images in updated content`);
      
      for (const imgTag of contentImageMatches) {
        const srcMatch = imgTag.match(/src="([^">]+)"/);
        if (srcMatch && srcMatch[1]) {
          let imgSrc = srcMatch[1];
          
          // Use our utility to normalize the path
          let normalizedSrc = imagePathConfig.normalizeImagePath(imgSrc);
          if (!normalizedSrc) continue;
          
          // Extract alt if available
          const altMatch = imgTag.match(/alt="([^">]*)"/);
          const imgAlt = altMatch ? altMatch[1] : req.body.title || post.title || 'Blog post image';
          
          // Only add if image not already present
          const imageExists = images.some(img => img.url === normalizedSrc);
          if (!imageExists) {
            images.push({
              url: normalizedSrc,
              alt: imgAlt
            });
            console.log('Added content image to images array:', normalizedSrc);
          }
        }
      }
    } catch (error) {
      console.error('Error processing content images:', error);
    }
  }
  
  // Update the images array
  updateData.images = images;
  
  // Handle thumbnail selection
  const thumbnailIndexStr = req.body.thumbnailIndex;
  const thumbnailIndex = parseInt(thumbnailIndexStr);
  
  console.log('Raw thumbnailIndex value:', thumbnailIndexStr);
  console.log('Parsed thumbnailIndex:', thumbnailIndex, 'Type:', typeof thumbnailIndex);
  
  // Track which images were uploaded with the form vs extracted from content
  const formUploadedImages = req.files && req.files.length > 0 
    ? req.files.map(file => ({
        url: `/uploads/${file.filename}`,
        alt: req.body.title || post.title || 'Blog post image'
      }))
    : [];
  
  if (!isNaN(thumbnailIndex) && thumbnailIndex >= 0 && thumbnailIndex < formUploadedImages.length) {
    // Use the thumbnail index to select from form-uploaded images first
    updateData.thumbnail = {
      url: formUploadedImages[thumbnailIndex].url,
      alt: formUploadedImages[thumbnailIndex].alt
    };
    console.log('Updated thumbnail from form-uploaded images:', JSON.stringify(updateData.thumbnail));
  } else if (!isNaN(thumbnailIndex) && thumbnailIndex >= 0 && thumbnailIndex < images.length) {
    // Fall back to using the index on the entire images array
    updateData.thumbnail = {
      url: images[thumbnailIndex].url,
      alt: images[thumbnailIndex].alt
    };
    console.log('Updated thumbnail from all images:', JSON.stringify(updateData.thumbnail));
  } else if (formUploadedImages.length > 0) {
    // If we have form uploads but no valid index, use the first uploaded image
    updateData.thumbnail = {
      url: formUploadedImages[0].url,
      alt: formUploadedImages[0].alt
    };
    console.log('Set default thumbnail to first form-uploaded image:', JSON.stringify(updateData.thumbnail));
  } else if (images.length > 0 && !post.thumbnail) {
    // If no valid thumbnail index but we have images and no existing thumbnail, set first image
    updateData.thumbnail = {
      url: images[0].url,
      alt: images[0].alt
    };
    console.log('Set default thumbnail to first available image:', JSON.stringify(updateData.thumbnail));
  } else if (!images.length && post.thumbnail) {
    // If all images were removed, remove the thumbnail too
    updateData.thumbnail = null;
    console.log('Removing thumbnail as no images exist');
  }
  
  // Handle tags if provided - with better JSON parsing
  if (req.body.tags) {
    try {
      // Handle tags whether they're a string or already an array
      updateData.tags = typeof req.body.tags === 'string' 
        ? JSON.parse(req.body.tags) 
        : req.body.tags;
        
      if (!Array.isArray(updateData.tags)) {
        updateData.tags = [];
      }
    } catch (err) {
      console.error('Error parsing tags:', err);
      // Don't update tags if parsing fails
      delete updateData.tags;
    }
  }
  
  post = await Post.findByIdAndUpdate(req.params.id, updateData, {
    new: true,
    runValidators: true
  });
  
  res.status(200).json({ 
    success: true, 
    data: post 
  });
});

// @desc    Delete post
// @route   DELETE /api/posts/:id
// @access  Private
exports.deletePost = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) {
    return res.status(404).json({
      success: false,
      message: `Post not found with id of ${req.params.id}`
    });
  }
  
  // Check post ownership
  if (post.author.toString() !== req.user.id && req.user.role !== 'admin') {
    return res.status(401).json({
      success: false,
      message: 'User not authorized to delete this post'
    });
  }
  
  await Post.deleteOne({ _id: req.params.id });
  
  res.status(200).json({ 
    success: true, 
    message: 'Post deleted successfully' 
  });
});

// @desc    Get comments for a post
// @route   GET /api/posts/:postId/comments
// @access  Public
exports.getComments = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.postId)
    .select('comments')
    .populate('comments.author', 'name avatar');

  if (!post) {
    return res.status(404).json({
      success: false,
      message: `Post not found with id of ${req.params.postId}`
    });
  }

  res.status(200).json({ 
    success: true, 
    count: post.comments.length,
    data: post.comments 
  });
});

// @desc    Add comment to post
// @route   POST /api/posts/:postId/comments
// @access  Private
exports.addComment = asyncHandler(async (req, res) => {
  if (!req.body.content) {
    return res.status(400).json({
      success: false,
      message: 'Please provide comment content'
    });
  }

  const post = await Post.findById(req.params.postId);
  if (!post) {
    return res.status(404).json({
      success: false,
      message: `Post not found with id of ${req.params.postId}`
    });
  }

  // Create new comment
  const comment = {
    content: req.body.content,
    author: req.user._id
  };

  // Add to comments array
  const updatedPost = await Post.findByIdAndUpdate(
    req.params.postId,
    { $push: { comments: comment } },
    { new: true, runValidators: true }
  ).populate('author', 'name avatar');
  
  // Emit socket event to notify about new comment
  if (req.io) {
    // Emit to admin room for dashboard updates
    req.io.to('admin-room').emit('new-comment', {
      id: comment._id,
      postId: req.params.postId,
      postTitle: updatedPost.title,
      user: req.user.name,
      content: comment.content,
      createdAt: comment.createdAt
    });
  }
  
  res.status(200).json({
    success: true,
    data: comment
  });
});

// @desc    Delete comment
// @route   DELETE /api/posts/:postId/comments/:commentId
// @access  Private
exports.deleteComment = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.postId);
  
  if (!post) {
    return res.status(404).json({
      success: false,
      message: `Post not found with id of ${req.params.postId}`
    });
  }

  // Find comment
  const comment = post.comments.id(req.params.commentId);

  if (!comment) {
    return res.status(404).json({
      success: false,
      message: `Comment not found with id of ${req.params.commentId}`
    });
  }

  // Make sure user is comment author or admin
  if (comment.author.toString() !== req.user.id && req.user.role !== 'admin') {
    return res.status(401).json({
      success: false,
      message: 'User not authorized to delete this comment'
    });
  }

  // Find and remove comment
  post.comments = post.comments.filter(
    comment => comment._id.toString() !== req.params.commentId
  );
  
  await post.save();

  res.status(200).json({
    success: true,
    message: 'Comment removed'
  });
});

// @desc    Upload image for TinyMCE
// @route   POST /api/posts/upload-image
// @access  Private
exports.uploadImage = asyncHandler(async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a file'
      });
    }

    // Log what's being sent back
    console.log('Image uploaded successfully:', req.file.filename);
    
    // Use our image path utility to normalize the path
    const imagePath = `/uploads/${req.file.filename}`;
    const normalizedPath = imagePathConfig.normalizeImagePath(imagePath);
    
    // Return a properly structured JSON response
    return res.status(200).json({
      success: true,
      location: normalizedPath // URL path to access the image
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while uploading image'
    });
  }
});
