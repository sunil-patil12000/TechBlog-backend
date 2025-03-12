const asyncHandler = require('express-async-handler');
const Post = require('../models/post');
const User = require('../models/user');
const Comment = require('../models/comment');
const mongoose = require('mongoose');

// Helper function to get date filter based on timeFilter
const getDateFilter = (timeFilter) => {
  const now = new Date();
  let dateFilter = {};
  
  switch (timeFilter) {
    case 'today':
      dateFilter = {
        $gte: new Date(now.setHours(0, 0, 0, 0)),
        $lt: new Date(now.setHours(23, 59, 59, 999))
      };
      break;
    case 'week':
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - 7);
      dateFilter = {
        $gte: weekStart,
        $lt: new Date()
      };
      break;
    case 'month':
      const monthStart = new Date(now);
      monthStart.setMonth(now.getMonth() - 1);
      dateFilter = {
        $gte: monthStart,
        $lt: new Date()
      };
      break;
    default:
      // Default to last week
      const defaultStart = new Date(now);
      defaultStart.setDate(now.getDate() - 7);
      dateFilter = {
        $gte: defaultStart,
        $lt: new Date()
      };
  }
  
  return dateFilter;
};

// @desc    Get dashboard statistics
// @route   GET /api/dashboard/stats
// @access  Private/Admin
exports.getDashboardStats = asyncHandler(async (req, res) => {
  const timeFilter = req.query.timeFilter || 'week';
  const dateFilter = getDateFilter(timeFilter);
  
  // Get total posts count
  const totalPosts = await Post.countDocuments();
  
  // Get new posts count in the selected time period
  const newPosts = await Post.countDocuments({
    createdAt: dateFilter
  });
  
  // Get total users count
  const totalUsers = await User.countDocuments();
  
  // Get new users in the selected time period
  const newUsers = await User.countDocuments({
    createdAt: dateFilter
  });
  
  // Get scheduled posts (posts with publishDate in the future)
  const scheduledPosts = await Post.countDocuments({
    publishDate: { $gt: new Date() }
  });
  
  // Get average reading time calculation (assuming average reading speed of 200 words per minute)
  const avgReadTimePipeline = [
    {
      $project: {
        wordCount: { $size: { $split: ["$content", " "] } }
      }
    },
    {
      $group: {
        _id: null,
        avgWordCount: { $avg: "$wordCount" }
      }
    },
    {
      $project: {
        _id: 0,
        avgReadTimeMinutes: { $divide: ["$avgWordCount", 200] }
      }
    }
  ];
  
  const avgReadTimeResult = await Post.aggregate(avgReadTimePipeline);
  const avgReadTime = avgReadTimeResult.length > 0 
    ? avgReadTimeResult[0].avgReadTimeMinutes.toFixed(1) 
    : '0.0';
  
  // Get comment counts
  const totalComments = await Comment.countDocuments();
  const newComments = await Comment.countDocuments({
    createdAt: dateFilter
  });
  
  // Calculate trends
  // To calculate trends, we need to compare the current period with the previous period
  // For simplicity, we'll compare with double the timeFilter into the past
  const previousDateFilter = { ...dateFilter };
  if (timeFilter === 'today') {
    // Compare with yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    previousDateFilter.$gte = new Date(yesterday.setHours(0, 0, 0, 0));
    previousDateFilter.$lt = new Date(yesterday.setHours(23, 59, 59, 999));
  } else if (timeFilter === 'week') {
    // Compare with previous week
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    previousDateFilter.$gte = twoWeeksAgo;
    previousDateFilter.$lt = oneWeekAgo;
  } else if (timeFilter === 'month') {
    // Compare with previous month
    const twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    
    previousDateFilter.$gte = twoMonthsAgo;
    previousDateFilter.$lt = oneMonthAgo;
  }
  
  // Previous period metrics
  const previousPosts = await Post.countDocuments({
    createdAt: previousDateFilter
  });
  
  const previousUsers = await User.countDocuments({
    createdAt: previousDateFilter
  });
  
  const previousComments = await Comment.countDocuments({
    createdAt: previousDateFilter
  });
  
  // Calculate trends (percentage change)
  const calculateTrend = (current, previous) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous * 100).toFixed(1);
  };
  
  const postsTrend = calculateTrend(newPosts, previousPosts);
  const usersTrend = calculateTrend(newUsers, previousUsers);
  const commentsTrend = calculateTrend(newComments, previousComments);
  
  // Build response with stats and trends
  res.status(200).json({
    success: true,
    timeFilter,
    stats: [
      {
        title: "Total Posts",
        value: totalPosts,
        newCount: newPosts,
        trend: parseFloat(postsTrend),
        icon: "FileText"
      },
      {
        title: "Active Users",
        value: totalUsers,
        newCount: newUsers,
        trend: parseFloat(usersTrend),
        icon: "Users"
      },
      {
        title: "Scheduled Posts",
        value: scheduledPosts,
        newCount: 0, // We don't track new scheduled posts over time
        trend: 0,
        icon: "Calendar"
      },
      {
        title: "Avg. Read Time",
        value: `${avgReadTime}m`,
        newCount: 0,
        trend: 0,
        icon: "Clock"
      },
      {
        title: "Comments",
        value: totalComments,
        newCount: newComments,
        trend: parseFloat(commentsTrend),
        icon: "MessageSquare"
      }
    ]
  });
});

// @desc    Get dashboard recent activities
// @route   GET /api/dashboard/activities
// @access  Private/Admin
exports.getDashboardActivities = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  
  // Get recent posts
  const recentPosts = await Post.find()
    .sort({ createdAt: -1 })
    .limit(5)
    .populate('author', 'name avatar')
    .select('title slug createdAt category');
    
  // Get recent user registrations
  const recentUsers = await User.find()
    .sort({ createdAt: -1 })
    .limit(5)
    .select('name email avatar createdAt');
    
  // Get recent comments
  const recentComments = await Comment.find()
    .sort({ createdAt: -1 })
    .limit(5)
    .populate('user', 'name avatar')
    .populate('post', 'title slug')
    .select('content createdAt');
  
  // Combine and format activities
  const activities = [
    ...recentPosts.map(post => ({
      id: post._id,
      type: 'post',
      title: `New post published: "${post.title}"`,
      category: post.category || 'Uncategorized',
      time: post.createdAt,
      url: `/blog/${post.slug}`,
      user: {
        name: post.author?.name || 'Unknown Author',
        avatar: post.author?.avatar || ''
      }
    })),
    
    ...recentUsers.map(user => ({
      id: user._id,
      type: 'user',
      title: `New user registered: ${user.name}`,
      category: 'Accounts',
      time: user.createdAt,
      url: `/admin/users/${user._id}`,
      user: {
        name: user.name,
        avatar: user.avatar || ''
      }
    })),
    
    ...recentComments.map(comment => ({
      id: comment._id,
      type: 'comment',
      title: `New comment on "${comment.post?.title || 'a post'}"`,
      category: 'Comments',
      time: comment.createdAt,
      url: `/blog/${comment.post?.slug || '#'}`,
      user: {
        name: comment.user?.name || 'Anonymous',
        avatar: comment.user?.avatar || ''
      }
    }))
  ];
  
  // Sort by time (newest first) and limit
  const sortedActivities = activities
    .sort((a, b) => new Date(b.time) - new Date(a.time))
    .slice(0, limit);
  
  res.status(200).json({
    success: true,
    count: sortedActivities.length,
    data: sortedActivities
  });
});

// @desc    Get popular posts for dashboard
// @route   GET /api/dashboard/popular-posts
// @access  Private/Admin
exports.getPopularPosts = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 5;
  
  // Find most viewed posts
  const popularPosts = await Post.find()
    .sort({ views: -1 })
    .limit(limit)
    .populate('author', 'name avatar')
    .select('title slug views createdAt category');
  
  res.status(200).json({
    success: true,
    count: popularPosts.length,
    data: popularPosts
  });
});

// @desc    Get user metrics for dashboard
// @route   GET /api/dashboard/user-metrics
// @access  Private/Admin
exports.getUserMetrics = asyncHandler(async (req, res) => {
  const timeFilter = req.query.timeFilter || 'week';
  const dateFilter = getDateFilter(timeFilter);
  
  // Get user registration metrics by day for the specified time period
  let groupByFormat;
  
  switch (timeFilter) {
    case 'today':
      // Group by hour
      groupByFormat = {
        hour: { $hour: "$createdAt" }
      };
      break;
    case 'week':
      // Group by day
      groupByFormat = {
        year: { $year: "$createdAt" },
        month: { $month: "$createdAt" },
        day: { $dayOfMonth: "$createdAt" }
      };
      break;
    case 'month':
      // Group by day
      groupByFormat = {
        year: { $year: "$createdAt" },
        month: { $month: "$createdAt" },
        day: { $dayOfMonth: "$createdAt" }
      };
      break;
    default:
      // Default to day
      groupByFormat = {
        year: { $year: "$createdAt" },
        month: { $month: "$createdAt" },
        day: { $dayOfMonth: "$createdAt" }
      };
  }
  
  const userMetrics = await User.aggregate([
    {
      $match: {
        createdAt: dateFilter
      }
    },
    {
      $group: {
        _id: groupByFormat,
        count: { $sum: 1 }
      }
    },
    {
      $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1, "_id.hour": 1 }
    }
  ]);
  
  // Format the result to be more frontend-friendly
  const formattedUserMetrics = userMetrics.map(metric => {
    let label;
    
    if (timeFilter === 'today') {
      // Format as hour
      label = `${metric._id.hour}:00`;
    } else {
      // Format as YYYY-MM-DD
      const year = metric._id.year;
      const month = String(metric._id.month).padStart(2, '0');
      const day = String(metric._id.day).padStart(2, '0');
      label = `${year}-${month}-${day}`;
    }
    
    return {
      date: label,
      value: metric.count
    };
  });
  
  res.status(200).json({
    success: true,
    timeFilter,
    count: formattedUserMetrics.length,
    data: formattedUserMetrics
  });
});

// @desc    Get unread notifications
// @route   GET /api/dashboard/notifications
// @access  Private/Admin
exports.getNotifications = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  
  // Get recent comments that need approval (if you have comment moderation)
  const pendingComments = await Comment.find({ approved: false })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('user', 'name avatar')
    .populate('post', 'title slug');
  
  // Get scheduled posts for today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const scheduledPosts = await Post.find({
    publishDate: {
      $gte: today,
      $lt: tomorrow
    },
    published: false
  })
    .sort({ publishDate: 1 })
    .limit(limit)
    .populate('author', 'name avatar');
  
  // Combine notifications
  const notifications = [
    ...pendingComments.map(comment => ({
      id: comment._id,
      type: 'comment',
      title: `New comment needs approval on "${comment.post?.title || 'a post'}"`,
      content: comment.content.substring(0, 100) + (comment.content.length > 100 ? '...' : ''),
      time: comment.createdAt,
      isRead: false,
      url: `/admin/comments?filter=pending`,
      user: {
        name: comment.user?.name || 'Anonymous',
        avatar: comment.user?.avatar || ''
      }
    })),
    
    ...scheduledPosts.map(post => ({
      id: post._id,
      type: 'scheduled-post',
      title: `Post scheduled for publishing today: "${post.title}"`,
      content: `Scheduled for ${new Date(post.publishDate).toLocaleTimeString()}`,
      time: post.createdAt,
      isRead: false,
      url: `/admin/posts/${post._id}/edit`,
      user: {
        name: post.author?.name || 'Unknown Author',
        avatar: post.author?.avatar || ''
      }
    }))
  ];
  
  // Sort by time (newest first)
  const sortedNotifications = notifications
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, limit);
  
  res.status(200).json({
    success: true,
    count: sortedNotifications.length,
    data: sortedNotifications
  });
});

// Broadcast dashboard updates to connected clients
exports.broadcastDashboardUpdate = async (io, updateType, data) => {
  if (!io) return;
  
  try {
    switch (updateType) {
      case 'new-post':
        io.to('admin-room').emit('dashboard-update', {
          type: 'new-post',
          data: data
        });
        break;
      
      case 'new-comment':
        io.to('admin-room').emit('dashboard-update', {
          type: 'new-comment',
          data: data
        });
        break;
        
      case 'new-user':
        io.to('admin-room').emit('dashboard-update', {
          type: 'new-user',
          data: data
        });
        break;
        
      case 'post-published':
        io.to('admin-room').emit('dashboard-update', {
          type: 'post-published',
          data: data
        });
        break;
        
      default:
        break;
    }
  } catch (error) {
    console.error('Socket broadcast error:', error);
  }
}; 