const { rateLimit, ipKeyGenerator } = require('express-rate-limit');

// Keep brute-force protection for each account without penalizing every user
// behind the same school Wi-Fi / mobile carrier IP address.
const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  keyGenerator: (req) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const ip = ipKeyGenerator(req.ip);
    // Keep limits isolated per account and source IP; never share one bucket
    // across all staff members using the same school network.
    return email ? `${ip}:${email}` : `${ip}:missing-email`;
  },
  // Successful logins must not consume the failed-attempt security budget.
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many login attempts for this account. Please try again later.',
  },
});

module.exports = loginRateLimiter;
