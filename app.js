require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const config = require('./config/config');
const connectDB = require('./config/db');
const morgan = require('morgan');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const postRoutes = require('./routes/postRoutes');
const userRoutes = require('./routes/userRoutes');
const commentRoutes = require('./routes/comments');
const cookieParser = require('cookie-parser');

// Connect to database
connectDB();

const app = express();

// Middleware
app.use(cors({
  origin: config.CLIENT_URL,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Cookie parser
app.use(cookieParser());

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Routes
app.use('/api/posts', postRoutes);
app.use('/api/users', userRoutes);
app.use('/api/comments', commentRoutes);

// Home route
app.get('/', (req, res) => {
  res.send('API is running...');
});

// Error handling
app.use(notFound);
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
