const express = require('express');
const router = express.Router();
const {
  getPosts,
  getPostById,
  getPostBySlug,
  createPost,
  updatePost,
  deletePost,
  addComment,
  deleteComment,
  getComments,
  uploadImage
} = require('../controllers/postController');

const { protect, admin } = require('../middlewares/authMiddleware');
const upload = require('../middleware/upload');

// Get all posts or create a new one
router.route('/')
  .get(getPosts)
  .post(protect, admin, upload.array('images'), createPost);

// Handle image uploads for TinyMCE
router.post('/upload-image', protect, upload.single('image'), uploadImage);

// Get, update, or delete a specific post by id
router.route('/:id')
  .get(getPostById)
  .put(protect, upload.array('images'), updatePost)
  .delete(protect, deletePost);

// Get a post by slug
router.get('/slug/:slug', getPostBySlug);

// Comments routes
router.route('/:postId/comments')
  .get(getComments)
  .post(protect, addComment);

router.route('/:postId/comments/:commentId')
  .delete(protect, deleteComment);

module.exports = router;
