const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');

// This file is currently just a placeholder as most comment functionality
// is handled within the post routes. You may expand this for dedicated comment endpoints.

// Example endpoint to get all comments (unlikely to be used)
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Comments API - For comment operations, please use the post comment endpoints'
  });
});

module.exports = router;
