/**
 * Student Routes
 * 
 * RESTful CRUD endpoints for the Student resource.
 */

const express = require('express');
const router = express.Router();
const {
  getAllStudents,
  getStudentById,
  getStudentProfile,
  createStudent,
  updateStudent,
  deleteStudent,
  permanentlyDeleteStudent,
  getLatestAdmissionStats,
  getNextRollNumberPreview,
  bulkMigrateStudents,
} = require('../controllers/studentController');

const { studentPhotoUpload } = require('../middleware/upload');
const { protect, isAdmin } = require('../middleware/auth');

// Static endpoint must be registered before /:id to avoid ObjectId casting.
router.get('/roll-number/next', protect, isAdmin, getNextRollNumberPreview);

// GET /api/students - list students
// POST /api/students - create student
router.route('/').get(getAllStudents).post(studentPhotoUpload, createStudent);
router.post('/create', studentPhotoUpload, createStudent);

// PUT /api/students/bulk-migrate - bulk migration
router.put('/bulk-migrate', protect, isAdmin, bulkMigrateStudents);

// GET    /api/students/stats/latest-admission
router.get('/stats/latest-admission', getLatestAdmissionStats);

// GET /api/students/:studentId/profile - profile and fee summary
router.get('/:studentId/profile', getStudentProfile);

// GET /api/students/:id - get one student
// PUT /api/students/:id - update student
// DELETE /api/students/:id - deactivate student
router.delete('/:id/permanent', protect, isAdmin, permanentlyDeleteStudent);
router.route('/:id').get(getStudentById).put(studentPhotoUpload, updateStudent).delete(protect, isAdmin, deleteStudent);

module.exports = router;
