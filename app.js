require('dotenv').config();
const express = require('express');
const cors = require('cors');
const config = require('./config/config');
const connectDB = require('./config/db');
const morgan = require('morgan');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const cookieParser = require('cookie-parser');
const path = require('path');

// Import the test routes
const testRoutes = require('./routes/testRoutes');

const app = express();

// Middleware
app.use(cors({
  origin: config.CLIENT_URL || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
}));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Cookie parser
app.use(cookieParser());

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Set static folder for uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check endpoint - doesn't require DB connection
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok',
    message: 'Server is running',
    mongoDbStatus: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// MongoDB connection status middleware
app.use((req, res, next) => {
  // Skip for health check endpoints
  if (req.path === '/api/health') {
    return next();
  }

  const mongoose = require('mongoose');
  // Check if we're connected to MongoDB
  if (mongoose.connection.readyState !== 1 && 
      !req.path.includes('/api/status') && 
      req.method !== 'OPTIONS') {
    
    console.log(`DB Connection Warning: Endpoint ${req.path} called while MongoDB is disconnected`);
    
    // For API routes that require DB, show error
    if (req.path.startsWith('/api/')) {
      return res.status(503).json({
        success: false,
        message: 'Database connection is currently unavailable. Please try again later.'
      });
    }
  }
  next();
});

// Routes - only loaded after checking DB connection
const postRoutes = require('./routes/postRoutes');
const userRoutes = require('./routes/userRoutes');
const commentRoutes = require('./routes/comments');
const categoryRoutes = require('./routes/categoryRoutes');

app.use('/api/posts', postRoutes);
app.use('/api/users', userRoutes);
app.use('/api/comments', commentRoutes);

// Support both singular and plural paths for categories
app.use('/api/category', categoryRoutes);
app.use('/api/categories', categoryRoutes); // Add support for plural form

// Mount the test routes
app.use('/api/test', testRoutes);

// Add route to serve static uploads directly (make sure this comes before error handlers)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Home route
app.get('/', (req, res) => {
  res.send('API is running...');
});

// Error handling
app.use(notFound);
app.use(errorHandler);

// Connect to MongoDB
console.log('Attempting to connect to MongoDB...');
connectDB().then(connected => {
  if (!connected) {
    console.log('Warning: Starting server without database connection. Some features will be unavailable.');
  }
  
  // Start server
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  });
}).catch(err => {
  console.error('Failed to start server:', err);
});
