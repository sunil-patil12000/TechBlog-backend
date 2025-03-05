const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Default to MongoDB Atlas URI if available, otherwise try localhost
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/blog';
    
    console.log(`Attempting to connect to MongoDB at: ${mongoUri.split('@').pop()}`);
    
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5 seconds instead of 30
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return true;
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    
    // Don't exit the process, let the application handle the error
    return false;
  }
};

module.exports = connectDB;
