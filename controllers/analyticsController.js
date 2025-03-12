const asyncHandler = require('express-async-handler');
const { PageView, Event, Session } = require('../models/analytics');
const Post = require('../models/post');
const User = require('../models/user');
const mongoose = require('mongoose');
const ErrorResponse = require('../utils/errorResponse');
const UAParser = require('ua-parser-js');
const { format, subDays, startOfDay, endOfDay, startOfWeek, endOfWeek, 
        startOfMonth, endOfMonth, subMonths, parseISO } = require('date-fns');

// Helper function to parse user agent
const parseUserAgent = (userAgent) => {
  if (!userAgent) return { device: 'unknown', browser: 'unknown', os: 'unknown' };
  
  const parser = new UAParser(userAgent);
  const result = parser.getResult();
  
  return {
    device: result.device.type || 'desktop',
    browser: `${result.browser.name || 'unknown'} ${result.browser.version || ''}`.trim(),
    os: `${result.os.name || 'unknown'} ${result.os.version || ''}`.trim()
  };
};

// Helper function to get date range based on filter
const getDateRange = (timeFilter) => {
  const now = new Date();
  let startDate, endDate;
  
  switch (timeFilter) {
    case 'today':
      startDate = startOfDay(now);
      endDate = endOfDay(now);
      break;
    case 'yesterday':
      startDate = startOfDay(subDays(now, 1));
      endDate = endOfDay(subDays(now, 1));
      break;
    case 'week':
      startDate = startOfWeek(now, { weekStartsOn: 1 });
      endDate = endOfWeek(now, { weekStartsOn: 1 });
      break;
    case 'month':
      startDate = startOfMonth(now);
      endDate = endOfMonth(now);
      break;
    case 'last30days':
      startDate = subDays(now, 30);
      endDate = now;
      break;
    case 'last90days':
      startDate = subDays(now, 90);
      endDate = now;
      break;
    case 'custom':
      return null; // Custom range requires start and end dates
    default:
      startDate = subDays(now, 7);
      endDate = now;
  }
  
  return { startDate, endDate };
};

// @desc    Track page view
// @route   POST /api/analytics/pageview
// @access  Public
exports.trackPageView = asyncHandler(async (req, res) => {
  const { page, path, postId, referrer, sessionId } = req.body;
  
  if (!page || !path || !sessionId) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields: page, path, sessionId'
    });
  }
  
  // Get user agent info
  const { device, browser, os } = parseUserAgent(req.headers['user-agent']);
  
  // Get user IP and country (simplified - in production use a geo-ip service)
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  
  // Create the page view
  const pageView = await PageView.create({
    page,
    path,
    postId: postId || null,
    userId: req.user ? req.user._id : null,
    sessionId,
    referrer,
    userAgent: req.headers['user-agent'],
    device,
    browser,
    os,
    ip,
    country: 'Unknown', // In production, use a geo-ip service
    timestamp: new Date()
  });
  
  // Update or create session
  let session = await Session.findOne({ sessionId });
  
  if (!session) {
    session = await Session.create({
      sessionId,
      userId: req.user ? req.user._id : null,
      startTime: new Date(),
      pageViews: 1,
      device,
      browser,
      os,
      ip,
      country: 'Unknown',
      referrer,
      entryPage: page,
      isActive: true
    });
  } else {
    session.pageViews += 1;
    session.lastActive = new Date();
    session.exitPage = page;
    session.isActive = true;
    await session.save();
  }
  
  // If this is a post view, update the post's view count
  if (postId) {
    try {
      await Post.findByIdAndUpdate(postId, { $inc: { views: 1 } });
    } catch (error) {
      console.error('Error updating post view count:', error);
    }
  }
  
  res.status(201).json({
    success: true,
    data: { id: pageView._id }
  });
});

// @desc    Track event
// @route   POST /api/analytics/event
// @access  Public
exports.trackEvent = asyncHandler(async (req, res) => {
  const { type, category, action, label, value, page, path, postId, sessionId } = req.body;
  
  if (!type || !category || !action || !page || !path || !sessionId) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields'
    });
  }
  
  // Create the event
  const event = await Event.create({
    type,
    category,
    action,
    label,
    value,
    page,
    path,
    postId: postId || null,
    userId: req.user ? req.user._id : null,
    sessionId,
    timestamp: new Date()
  });
  
  // Update session event count
  try {
    await Session.findOneAndUpdate(
      { sessionId },
      { 
        $inc: { events: 1 },
        $set: { lastActive: new Date(), isActive: true }
      }
    );
  } catch (error) {
    console.error('Error updating session:', error);
  }
  
  res.status(201).json({
    success: true,
    data: { id: event._id }
  });
});

// @desc    Get page view analytics
// @route   GET /api/analytics/pageviews
// @access  Private/Admin
exports.getPageViewAnalytics = asyncHandler(async (req, res) => {
  const { timeFilter, startDate, endDate, page, postId, groupBy } = req.query;
  
  let dateRange;
  if (timeFilter === 'custom' && startDate && endDate) {
    dateRange = {
      startDate: parseISO(startDate),
      endDate: parseISO(endDate)
    };
  } else {
    dateRange = getDateRange(timeFilter || 'week');
  }
  
  if (!dateRange) {
    return res.status(400).json({
      success: false,
      message: 'Invalid date range parameters'
    });
  }
  
  // Build query filter
  const filter = {
    timestamp: {
      $gte: dateRange.startDate,
      $lte: dateRange.endDate
    }
  };
  
  if (page) filter.page = page;
  if (postId) filter.postId = new mongoose.Types.ObjectId(postId);
  
  // Determine how to group the data
  let groupByField = '$timestamp';
  let dateFormat = '%Y-%m-%d';
  
  switch (groupBy) {
    case 'hour':
      dateFormat = '%Y-%m-%d %H:00';
      break;
    case 'day':
      dateFormat = '%Y-%m-%d';
      break;
    case 'week':
      groupByField = { $week: '$timestamp' };
      break;
    case 'month':
      dateFormat = '%Y-%m';
      break;
    default:
      dateFormat = '%Y-%m-%d';
  }
  
  // Get aggregated page views
  const pageViews = await PageView.aggregate([
    { $match: filter },
    {
      $group: {
        _id: groupBy === 'week' ? groupByField : { $dateToString: { format: dateFormat, date: '$timestamp' } },
        count: { $sum: 1 },
        uniqueUsers: { $addToSet: '$userId' },
        uniqueSessions: { $addToSet: '$sessionId' }
      }
    },
    { $sort: { _id: 1 } },
    {
      $project: {
        _id: 0,
        date: '$_id',
        count: 1,
        uniqueUsers: { $size: '$uniqueUsers' },
        uniqueSessions: { $size: '$uniqueSessions' }
      }
    }
  ]);
  
  // Get total count
  const totalCount = await PageView.countDocuments(filter);
  
  // Get unique visitors
  const uniqueVisitors = await PageView.distinct('sessionId', filter).then(sessions => sessions.length);
  
  // Get device breakdown
  const deviceBreakdown = await PageView.aggregate([
    { $match: filter },
    {
      $group: {
        _id: '$device',
        count: { $sum: 1 }
      }
    },
    {
      $project: {
        _id: 0,
        device: '$_id',
        count: 1,
        percentage: { $multiply: [{ $divide: ['$count', totalCount] }, 100] }
      }
    }
  ]);
  
  // Get browser breakdown
  const browserBreakdown = await PageView.aggregate([
    { $match: filter },
    {
      $group: {
        _id: '$browser',
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } },
    { $limit: 5 },
    {
      $project: {
        _id: 0,
        browser: '$_id',
        count: 1,
        percentage: { $multiply: [{ $divide: ['$count', totalCount] }, 100] }
      }
    }
  ]);
  
  // Get top pages
  const topPages = await PageView.aggregate([
    { $match: filter },
    {
      $group: {
        _id: '$path',
        page: { $first: '$page' },
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } },
    { $limit: 10 },
    {
      $project: {
        _id: 0,
        path: '$_id',
        page: 1,
        count: 1,
        percentage: { $multiply: [{ $divide: ['$count', totalCount] }, 100] }
      }
    }
  ]);
  
  res.status(200).json({
    success: true,
    data: {
      timeRange: {
        start: dateRange.startDate,
        end: dateRange.endDate
      },
      overview: {
        totalPageViews: totalCount,
        uniqueVisitors
      },
      pageViews,
      deviceBreakdown,
      browserBreakdown,
      topPages
    }
  });
});

// @desc    Get post analytics
// @route   GET /api/analytics/posts/:postId
// @access  Private/Admin
exports.getPostAnalytics = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const { timeFilter, startDate, endDate } = req.query;
  
  if (!mongoose.Types.ObjectId.isValid(postId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid post ID'
    });
  }
  
  let dateRange;
  if (timeFilter === 'custom' && startDate && endDate) {
    dateRange = {
      startDate: parseISO(startDate),
      endDate: parseISO(endDate)
    };
  } else {
    dateRange = getDateRange(timeFilter || 'month');
  }
  
  if (!dateRange) {
    return res.status(400).json({
      success: false,
      message: 'Invalid date range parameters'
    });
  }
  
  // Build query filter
  const filter = {
    postId: new mongoose.Types.ObjectId(postId),
    timestamp: {
      $gte: dateRange.startDate,
      $lte: dateRange.endDate
    }
  };
  
  // Get the post
  const post = await Post.findById(postId).select('title slug views createdAt');
  
  if (!post) {
    return res.status(404).json({
      success: false,
      message: 'Post not found'
    });
  }
  
  // Get daily views
  const dailyViews = await PageView.aggregate([
    { $match: filter },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
        count: { $sum: 1 },
        uniqueUsers: { $addToSet: '$userId' },
        uniqueSessions: { $addToSet: '$sessionId' }
      }
    },
    { $sort: { _id: 1 } },
    {
      $project: {
        _id: 0,
        date: '$_id',
        count: 1,
        uniqueUsers: { $size: '$uniqueUsers' },
        uniqueSessions: { $size: '$uniqueSessions' }
      }
    }
  ]);
  
  // Get total views
  const totalViews = await PageView.countDocuments(filter);
  
  // Get unique visitors
  const uniqueVisitors = await PageView.distinct('sessionId', filter).then(sessions => sessions.length);
  
  // Get referrers
  const referrers = await PageView.aggregate([
    { $match: filter },
    {
      $group: {
        _id: '$referrer',
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } },
    { $limit: 10 },
    {
      $project: {
        _id: 0,
        referrer: { $ifNull: ['$_id', 'Direct'] },
        count: 1,
        percentage: { $multiply: [{ $divide: ['$count', totalViews] }, 100] }
      }
    }
  ]);
  
  // Get device breakdown
  const deviceBreakdown = await PageView.aggregate([
    { $match: filter },
    {
      $group: {
        _id: '$device',
        count: { $sum: 1 }
      }
    },
    {
      $project: {
        _id: 0,
        device: '$_id',
        count: 1,
        percentage: { $multiply: [{ $divide: ['$count', totalViews] }, 100] }
      }
    }
  ]);
  
  // Calculate average time on page (if we have event data)
  let avgTimeOnPage = null;
  try {
    const timeOnPageResults = await Event.aggregate([
      { 
        $match: { 
          postId: new mongoose.Types.ObjectId(postId),
          type: 'engagement',
          category: 'timeOnPage',
          timestamp: {
            $gte: dateRange.startDate,
            $lte: dateRange.endDate
          }
        } 
      },
      {
        $group: {
          _id: null,
          avgTimeSeconds: { $avg: '$value' }
        }
      }
    ]);
    
    if (timeOnPageResults.length > 0) {
      avgTimeOnPage = Math.round(timeOnPageResults[0].avgTimeSeconds);
    }
  } catch (error) {
    console.error('Error calculating avg time on page:', error);
  }
  
  res.status(200).json({
    success: true,
    data: {
      post,
      timeRange: {
        start: dateRange.startDate,
        end: dateRange.endDate
      },
      overview: {
        totalViews,
        uniqueVisitors,
        avgTimeOnPage
      },
      dailyViews,
      referrers,
      deviceBreakdown
    }
  });
});

// @desc    Get analytics dashboard overview
// @route   GET /api/analytics/dashboard
// @access  Private/Admin
exports.getDashboardAnalytics = asyncHandler(async (req, res) => {
  const { timeFilter } = req.query;
  const dateRange = getDateRange(timeFilter || 'week');
  
  if (!dateRange) {
    return res.status(400).json({
      success: false,
      message: 'Invalid date range parameters'
    });
  }
  
  // Date filter for queries
  const dateFilter = {
    $gte: dateRange.startDate,
    $lte: dateRange.endDate
  };
  
  // Get total page views
  const totalPageViews = await PageView.countDocuments({
    timestamp: dateFilter
  });
  
  // Get total unique visitors (distinct sessions)
  const uniqueVisitors = await PageView.distinct('sessionId', {
    timestamp: dateFilter
  }).then(sessions => sessions.length);
  
  // Get most popular posts during the period
  const popularPosts = await PageView.aggregate([
    { 
      $match: { 
        timestamp: dateFilter,
        postId: { $ne: null }
      } 
    },
    {
      $group: {
        _id: '$postId',
        views: { $sum: 1 }
      }
    },
    { $sort: { views: -1 } },
    { $limit: 5 },
    {
      $lookup: {
        from: 'posts',
        localField: '_id',
        foreignField: '_id',
        as: 'postDetails'
      }
    },
    {
      $unwind: '$postDetails'
    },
    {
      $project: {
        _id: 0,
        postId: '$_id',
        title: '$postDetails.title',
        slug: '$postDetails.slug',
        views: 1
      }
    }
  ]);
  
  // Traffic by device
  const deviceStats = await PageView.aggregate([
    { $match: { timestamp: dateFilter } },
    {
      $group: {
        _id: '$device',
        count: { $sum: 1 }
      }
    },
    {
      $project: {
        _id: 0,
        device: '$_id',
        count: 1,
        percentage: { $multiply: [{ $divide: ['$count', totalPageViews] }, 100] }
      }
    }
  ]);
  
  // Get daily views trend
  const dailyViewsTrend = await PageView.aggregate([
    { $match: { timestamp: dateFilter } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } },
    {
      $project: {
        _id: 0,
        date: '$_id',
        views: '$count'
      }
    }
  ]);
  
  // Get visitor growth (compare current period with previous period)
  const previousDateRange = {
    startDate: subDays(dateRange.startDate, dateRange.endDate.getTime() - dateRange.startDate.getTime()),
    endDate: subDays(dateRange.endDate, dateRange.endDate.getTime() - dateRange.startDate.getTime())
  };
  
  const previousVisitors = await PageView.distinct('sessionId', {
    timestamp: {
      $gte: previousDateRange.startDate,
      $lte: previousDateRange.endDate
    }
  }).then(sessions => sessions.length);
  
  const visitorGrowth = previousVisitors === 0 ? 100 : 
    ((uniqueVisitors - previousVisitors) / previousVisitors) * 100;
  
  res.status(200).json({
    success: true,
    data: {
      timeRange: {
        start: dateRange.startDate,
        end: dateRange.endDate
      },
      overview: {
        totalPageViews,
        uniqueVisitors,
        visitorGrowth: parseFloat(visitorGrowth.toFixed(1))
      },
      dailyViewsTrend,
      deviceStats,
      popularPosts
    }
  });
});

// @desc    Close a session (when user leaves the site)
// @route   PUT /api/analytics/session/:sessionId/close
// @access  Public
exports.closeSession = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  
  if (!sessionId) {
    return res.status(400).json({
      success: false,
      message: 'Session ID is required'
    });
  }
  
  const session = await Session.findOne({ sessionId });
  
  if (!session) {
    return res.status(404).json({
      success: false,
      message: 'Session not found'
    });
  }
  
  // Update session end time and calculate duration
  session.endTime = new Date();
  session.isActive = false;
  
  if (session.startTime) {
    session.duration = Math.round((session.endTime.getTime() - session.startTime.getTime()) / 1000);
  }
  
  await session.save();
  
  res.status(200).json({
    success: true,
    data: {
      sessionId: session.sessionId,
      duration: session.duration
    }
  });
}); 