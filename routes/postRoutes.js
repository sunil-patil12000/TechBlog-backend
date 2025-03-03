const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  createPost,
  getPosts,
  getPost,
  getPostBySlug,
  updatePost,
  deletePost
} = require('../controllers/postController');

// Post routes
router.route('/')
  .get(getPosts)
  .post(protect, authorize('admin'), createPost);

router.route('/:id')
  .get(getPost)
  .put(protect, authorize('admin'), updatePost)
  .delete(protect, authorize('admin'), deletePost);

router.get('/slug/:slug', getPostBySlug);

module.exports = router;
