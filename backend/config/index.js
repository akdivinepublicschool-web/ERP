/**
 * Centralized Application Configuration
 * 
 * Pulls from environment variables with safe defaults.
 */

const config = {
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 5000,
  mongoUri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpire: process.env.JWT_EXPIRE || '30d',
  
  // API Documentation
  swagger: {
    enabled: true,
    endpoint: '/api-docs'
  },
  
  // Storage
  uploadPath: process.env.UPLOAD_PATH || 'uploads'
};

// Validate critical config
if (!config.mongoUri) {
  console.error('[CRITICAL] MONGO_URI is not defined in environment');
}

if (!config.jwtSecret) {
  console.error('[CRITICAL] JWT_SECRET is not defined in environment');
}

module.exports = config;
