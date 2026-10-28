/**
 * JWT Token Generator
 * 
 * Creates a signed JSON Web Token containing the user's id and role.
 * Token expires based on JWT_EXPIRES_IN env variable (default: 7 days).
 */

const jwt = require('jsonwebtoken');

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    }
  );
};

module.exports = generateToken;
