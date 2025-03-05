const jwt = require('jsonwebtoken');
const User = require('../models/user');
const config = require('../config/config');

// Extract JWT token from request
const getToken = (req) => {
  // Check for token in cookies first, then Authorization header
  if (req.cookies.token) {
    return req.cookies.token;
  } else if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    return req.headers.authorization.split(' ')[1];
  }
  return null;
};

// Protect routes
exports.protect = async (req, res, next) => {
  try {
    const token = getToken(req);
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, config.JWT_SECRET);
      req.user = await User.findById(decoded.id);
      next();
    } catch (err) {
      console.error('JWT verification error:', err);
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// Admin role middleware
exports.admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to access this route - admin role required'
    });
  }
};
