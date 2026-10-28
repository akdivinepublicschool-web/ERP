const express = require('express');
const router = express.Router();
const academicController = require('../controllers/academicController');
const { protect, isAdmin } = require('../middleware/auth');

// Apply protection and Admin check to all academic routes
router.use(protect);
router.use(isAdmin); 

// --- Subject Routes ---
router.post('/subjects', academicController.createSubject);
router.get('/subjects', academicController.getAllSubjects);
router.get('/subjects/:id', academicController.getSubjectById);
router.put('/subjects/:id', academicController.updateSubject);
router.delete('/subjects/:id', academicController.deleteSubject);

// --- Class-Subject Mapping Routes ---
router.post('/classes/:classId/subjects', academicController.assignSubjectToClass);
router.get('/classes/:classId/subjects', academicController.getClassSubjects);
router.delete('/mappings/:mappingId', academicController.removeClassSubjectMapping);

module.exports = router;
