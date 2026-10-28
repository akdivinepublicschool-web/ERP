/**
 * Authentication & Authorization Middleware
 * 
 * protect   — Verifies JWT token from Authorization header, attaches user to req.
 * authorize — Restricts access to specific roles (e.g. 'admin', 'teacher').
 * isAdmin   — Shortcut: only admins allowed.
 * isTeacher — Shortcut: only teachers allowed.
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { errorResponse } = require('../utils/apiResponse');

// ──────────────────────────────────────────────
// Protect route — verify JWT
// ──────────────────────────────────────────────
const protect = async (req, res, next) => {
  try {
    let token;

    // Extract token from "Bearer <token>" header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return errorResponse(res, 'Not authorized — no token provided', 401);
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach user to request (without password)
    const user = await User.findById(decoded.id);

    if (!user) {
      return errorResponse(res, 'User belonging to this token no longer exists', 401);
    }

    if (!user.isActive) {
      return errorResponse(res, 'Account has been deactivated', 403);
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return errorResponse(res, 'Invalid token', 401);
    }
    if (error.name === 'TokenExpiredError') {
      return errorResponse(res, 'Token has expired — please log in again', 401);
    }
    next(error);
  }
};

// ──────────────────────────────────────────────
// Authorize by role(s)
// ──────────────────────────────────────────────
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, 'Not authorized', 401);
    }

    if (!roles.includes(req.user.role)) {
      return errorResponse(
        res,
        `Role '${req.user.role}' is not authorized to access this resource`,
        403
      );
    }

    next();
  };
};

// ──────────────────────────────────────────────
// Convenience shortcuts
// ──────────────────────────────────────────────
const isAdmin = authorize('admin');
const isTeacher = authorize('teacher');

module.exports = { protect, authorize, isAdmin, isTeacher };
