require('dotenv').config();
const express = require('express');
const cors = require('cors');
const config = require('./config/config');
const connectDB = require('./config/db');
const morgan = require('morgan');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const cookieParser = require('cookie-parser');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
const cron = require('node-cron');
const { publishScheduledPosts } = require('./utils/scheduledTasks');
const dashboardController = require('./controllers/dashboardController');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: config.CLIENT_URL || '*',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Ensure upload directories exist
const uploadsDir = path.join(__dirname, 'uploads');
const publicUploadsDir = path.join(__dirname, 'public/uploads');

[uploadsDir, publicUploadsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    console.log(`Creating uploads directory: ${dir}`);
    fs.mkdirSync(dir, { recursive: true });
    
    // Set permissions to ensure directory is writable
    try {
      fs.chmodSync(dir, 0o777);
      console.log(`Set permissions for directory: ${dir}`);
    } catch (err) {
      console.error(`Error setting permissions for ${dir}:`, err);
    }
  } else {
    console.log(`Uploads directory exists: ${dir}`);
    
    // Verify directory is writable
    try {
      const testFile = path.join(dir, '.write-test');
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      console.log(`Directory ${dir} is writable`);
    } catch (err) {
      console.error(`Directory ${dir} may not be writable:`, err);
    }
  }
});

// Socket.IO connection handler
io.on('connection', (socket) => {
  console.log('New client connected', socket.id);
  
  // Join admin room if user is admin
  socket.on('join-admin', (userData) => {
    if (userData && userData.role === 'admin') {
      socket.join('admin-room');
      console.log(`Admin ${socket.id} joined admin room`);
    }
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('Client disconnected', socket.id);
  });
});

// Make io accessible to our router
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Middleware: CORS, JSON parser, URL-encoded, Cookie Parser, Logging...
app.use(cors({
  origin: config.CLIENT_URL || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With', 
    'Accept', 
    'Origin',
    'Cache-Control'
  ],
  exposedHeaders: ['Content-Length', 'Content-Type', 'X-Total-Count'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204,
  maxAge: 86400 // Cache preflight responses for 24 hours
}));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Static file serving with logging middleware
const logStaticFileAccess = (directory) => {
  return (req, res, next) => {
    const filePath = path.join(directory, req.path);
    console.log(`Static file request: ${req.path}`);
    
    // Check if file exists
    if (fs.existsSync(filePath)) {
      console.log(`Serving static file: ${filePath}`);
      next();
    } else {
      console.log(`Static file not found: ${filePath}`);
      next();
    }
  };
};

// Serve files from uploads directory with logging
app.use('/uploads', logStaticFileAccess(uploadsDir), express.static(uploadsDir));

// Serve files from public/uploads directory with logging
app.use('/uploads', logStaticFileAccess(publicUploadsDir), express.static(publicUploadsDir));

// Add a fallback for static files not found
app.use('/uploads/*', (req, res) => {
  console.error(`404: Static file not found: ${req.originalUrl}`);
  res.status(404).send('File not found');
});

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

// Mount API routes (ensure order: DB-check, routes, static files)
const postRoutes = require('./routes/postRoutes');
const userRoutes = require('./routes/userRoutes');
const commentRoutes = require('./routes/comments');
const categoryRoutes = require('./routes/categoryRoutes');
const tagRoutes = require('./routes/tagRoutes');
const testRoutes = require('./routes/testRoutes');
const sitemapRoutes = require('./routes/sitemapRoutes');
const seoRoutes = require('./routes/seoRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');

app.use('/api/posts', postRoutes);
app.use('/api/users', userRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/category', categoryRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/test', testRoutes);
app.use('/api/sitemap', sitemapRoutes);
app.use('/api/seo', seoRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/sitemap.xml', (req, res) => {
  res.redirect('/api/sitemap');
});
app.use('/robots.txt', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/robots.txt'));
});

// Home route and error handling
app.get('/', (req, res) => {
  res.send('API is running...');
});
app.use(notFound);
app.use(errorHandler);

// Schedule job to run every minute to check for posts to publish
cron.schedule('* * * * *', async () => {
  console.log('Running scheduled task: publishing scheduled posts');
  const result = await publishScheduledPosts();
  
  // If posts were published, broadcast an update to connected clients
  if (result.success && result.count > 0) {
    result.posts.forEach(post => {
      // Broadcast to admin room
      io.to('admin-room').emit('dashboard-update', {
        type: 'post-published',
        data: {
          _id: post._id,
          title: post.title,
          slug: post.slug,
          author: post.author,
          publishDate: post.publishDate
        }
      });
      
      // Broadcast as a notification
      io.to('admin-room').emit('notification', {
        id: new Date().getTime().toString(),
        type: 'scheduled-post',
        title: `Scheduled post published: "${post.title}"`,
        content: `This post was automatically published as scheduled.`,
        time: new Date().toISOString(),
        isRead: false,
        url: `/blog/${post.slug}`,
        user: post.author ? {
          name: post.author.name,
          avatar: post.author.avatar || ''
        } : {
          name: 'System',
          avatar: ''
        }
      });
      
      // Use dashboard controller to broadcast the update
      dashboardController.broadcastDashboardUpdate(io, 'post-published', {
        _id: post._id,
        title: post.title,
        slug: post.slug,
        author: post.author,
        publishDate: post.publishDate
      });
    });
  }
});

// Connect to MongoDB then start server
console.log('Attempting to connect to MongoDB...');
connectDB().then(connected => {
  if (!connected) {
    console.log('Warning: Starting server without database connection. Some features will be unavailable.');
  }
  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  });
}).catch(err => {
  console.error('Failed to start server:', err);
});
