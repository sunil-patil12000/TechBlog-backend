// Bun configuration
export default {
  // Default environment
  env: process.env.NODE_ENV || 'development',
  
  // Configure plugins
  plugins: [],
  
  // Default port
  port: process.env.PORT || 3000,
  
  // Enable debugging if needed
  debug: process.env.DEBUG === 'true',
}; 