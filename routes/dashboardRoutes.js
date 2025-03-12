const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { protect, admin } = require('../middlewares/authMiddleware');

// Only authenticated admin users can access dashboard data
router.use(protect, admin);

// Dashboard routes
router.get('/stats', dashboardController.getDashboardStats);
router.get('/activities', dashboardController.getDashboardActivities);
router.get('/popular-posts', dashboardController.getPopularPosts);
router.get('/user-metrics', dashboardController.getUserMetrics);
router.get('/notifications', dashboardController.getNotifications);

module.exports = router; 