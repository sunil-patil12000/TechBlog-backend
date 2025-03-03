const express = require('express');
const router = express.Router();
const Comment = require('../models/comment');
const Post = require('../models/post');
const { protect } = require('../middleware/auth');

// Get all comments for a post
router.get('/post/:postId', async (req, res, next) => {
  try {
    const comments = await Comment.find({ post: req.params.postId })
      .populate({
        path: 'user',
        select: 'name'
      });
    
    res.status(200).json({
      success: true,
      count: comments.length,
      data: comments
    });
  } catch (err) {
    next(err);
  }
});

// Add comment to a post
router.post('/', protect, async (req, res, next) => {
  try {
    // Add user and post to req.body
    req.body.user = req.user.id;
    
    // Check if post exists
    const post = await Post.findById(req.body.post);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }
    
    const comment = await Comment.create(req.body);
    
    res.status(201).json({
      success: true,
      data: comment
    });
  } catch (err) {
    next(err);
  }
});

// Update comment
router.put('/:id', protect, async (req, res, next) => {
  try {
    let comment = await Comment.findById(req.params.id);
    
    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }
    
    // Make sure user is comment owner
    if (comment.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({ success: false, message: 'Not authorized to update this comment' });
    }
    
    comment = await Comment.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    
    res.status(200).json({ success: true, data: comment });
  } catch (err) {
    next(err);
  }
});

// Delete comment
router.delete('/:id', protect, async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.id);
    
    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }
    
    // Make sure user is comment owner or admin
    if (comment.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({ success: false, message: 'Not authorized to delete this comment' });
    }
    
    await comment.remove();
    
    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
