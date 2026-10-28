const express = require('express');
const router = express.Router();
const timetableController = require('../controllers/timetableController');
const { protect, isAdmin } = require('../middleware/auth');

// Public/Auth routes
router.get('/class/:classId', protect, timetableController.getTimetableByClass);
router.get('/download/:classId', protect, timetableController.downloadTimetable);
router.get('/teacher/assigned-classes', protect, timetableController.getTeacherAssignedClasses);


// Admin only routes
// Note: In server.js we can mount this at /api/admin/timetable
// But for the class-wise fetch, it's at /api/timetable/class
// So we might need two separate registrations or just one and use careful paths.

module.exports = router;
