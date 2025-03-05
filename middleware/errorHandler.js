// Middleware for handling 404s
const notFound = (req, res, next) => {
  res.status(404);
  const error = new Error(`Not Found - ${req.originalUrl}`);
  next(error);
};

// Error handler middleware
const errorHandler = (err, req, res, next) => {
  // Log the error for debugging
  console.error('Error Handler:', err);
  
  // Handle mongoose validation errors
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(val => val.message);
    return res.status(400).json({
      success: false,
      error: err.name,
      message: messages.join(', ')
    });
  }
  
  // Handle duplicate key errors
  if (err.code === 11000) {
    return res.status(400).json({
      success: false,
      error: 'Duplicate Key Error',
      message: 'A record with that value already exists'
    });
  }
  
  // Handle cast errors (invalid IDs etc)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      error: err.name,
      message: `Invalid ${err.path}: ${err.value}`
    });
  }
  
  // Default error response
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode);
  res.json({
    success: false,
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack
  });
};

module.exports = { notFound, errorHandler };
