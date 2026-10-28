/**
 * Health Check Controller
 * 
 * Returns server status, uptime, and MongoDB connection state.
 */

const mongoose = require('mongoose');
const { successResponse } = require('../utils/apiResponse');

const getHealth = (req, res) => {
  const mongoStates = ['disconnected', 'connected', 'connecting', 'disconnecting'];

  return successResponse(res, {
    status: 'OK',
    uptime: `${Math.floor(process.uptime())}s`,
    mongodb: mongoStates[mongoose.connection.readyState] || 'unknown',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  }, 'Server is healthy');
};

module.exports = { getHealth };
