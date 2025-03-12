const express = require('express');
const router = express.Router();
const { getTags, getTagById, createTag, updateTag, deleteTag } = require('../controllers/tagController');
const { protect, admin } = require('../middlewares/authMiddleware');

// Get all tags or create a new one
router.route('/')
  .get(getTags)
  .post(protect, admin, createTag);

// Get, update, or delete a specific tag by id
router.route('/:id')
  .get(getTagById)
  .put(protect, admin, updateTag)
  .delete(protect, admin, deleteTag);

module.exports = router; 