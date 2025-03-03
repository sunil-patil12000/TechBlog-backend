require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGO_URI: process.env.MONGO_URI,
  JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key',
  JWT_EXPIRE: process.env.JWT_EXPIRE || '30d',
  JWT_COOKIE_EXPIRE: process.env.JWT_COOKIE_EXPIRE || 30,
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173'
};
