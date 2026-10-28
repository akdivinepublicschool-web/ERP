const express = require('express');
const router = express.Router();
const { getLatestAnnouncement, postAnnouncement } = require('../controllers/announcementController');
const { protect, isAdmin } = require('../middleware/auth');

// Apply protection to all routes
router.use(protect);

// Shared route: both admin and teacher can see the latest announcement
router.get('/latest', getLatestAnnouncement);

// Admin-only route: only admins can post announcements
router.post('/', isAdmin, postAnnouncement);

module.exports = router;
