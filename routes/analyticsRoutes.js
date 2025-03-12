const express = require('express');
const { 
  trackPageView, 
  trackEvent, 
  getPageViewAnalytics, 
  getPostAnalytics,
  getDashboardAnalytics,
  closeSession
} = require('../controllers/analyticsController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// Public routes
router.post('/pageview', trackPageView);
router.post('/event', trackEvent);
router.put('/session/:sessionId/close', closeSession);

// Admin only routes
router.get('/pageviews', protect, authorize('admin'), getPageViewAnalytics);
router.get('/posts/:postId', protect, authorize('admin'), getPostAnalytics);
router.get('/dashboard', protect, authorize('admin'), getDashboardAnalytics);

module.exports = router; 