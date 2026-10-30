/**
 * Exam & Marksheet RBAC Authorization Middleware
 * 
 * Verifies that the logged-in user is either an Admin or an authorized Teacher
 * for the requested class and subject.
 */

const Teacher = require('../models/Teacher');
const Class = require('../models/Class');
const ClassSubject = require('../models/ClassSubject');
const Exam = require('../models/Exam');
const { errorResponse } = require('../utils/apiResponse');

/**
 * Middleware factory to verify class/subject teacher access for marks operations
 * @param {string} classIdSource - 'body', 'query', or 'params'
 * @param {string} subjectIdSource - 'body', 'query', or 'params' (optional)
 */
const verifyExamTeacherAccess = (classIdSource = 'body', subjectIdSource = null) => {
  return async (req, res, next) => {
    try {
      // 1. Admin bypass
      if (req.user && req.user.role === 'admin') {
        return next();
      }

      // 2. Read classId
      let classId;
      if (classIdSource === 'body') classId = req.body.classId || req.body.class;
      else if (classIdSource === 'query') classId = req.query.classId || req.query.class;
      else if (classIdSource === 'params') classId = req.params.classId || req.params.class;

      if (!classId) {
        return errorResponse(res, 'Class ID is required for access verification', 400);
      }

      // 3. Read subjectId (if specified)
      let subjectId = null;
      if (subjectIdSource) {
        if (subjectIdSource === 'body') subjectId = req.body.subjectId || req.body.subject;
        else if (subjectIdSource === 'query') subjectId = req.query.subjectId || req.query.subject;
        else if (subjectIdSource === 'params') subjectId = req.params.subjectId || req.params.subject;
      }

      // 4. Find teacher profile linked to req.user._id
      const teacher = await Teacher.findOne({ user: req.user._id, isActive: true });
      if (!teacher) {
        return errorResponse(res, 'Active teacher profile not found for logged in user', 403);
      }

      // Monthly tests are strictly subject-owned: even a class teacher may only access
      // a monthly test when its configured subject is mapped to their teacher profile.
      const examId = req.params.examId || req.params.id || req.query.examId || req.body.examId;
      if (examId) {
        const exam = await Exam.findById(examId).select('examType class subjectsConfig.subject').lean();
        if (exam && exam.examType === 'MONTHLY') {
          if (String(exam.class) !== String(classId)) {
            return errorResponse(res, 'Exam does not belong to the requested class', 403);
          }
          const examSubjectIds = (exam.subjectsConfig || []).map((item) => String(item.subject));
          const requestedSubjectIds = subjectId ? [String(subjectId)] : examSubjectIds;
          const allowed = requestedSubjectIds.length > 0 && requestedSubjectIds.every((id) =>
            examSubjectIds.includes(id)
          );
          const mappings = allowed ? await ClassSubject.find({
            class: classId,
            subject: { $in: requestedSubjectIds },
            teacher: teacher._id,
          }).select('subject').lean() : [];
          if (!allowed || mappings.length !== requestedSubjectIds.length) {
            return errorResponse(res, 'Unauthorized: You can access only monthly tests for your assigned subject', 403);
          }
          req.teacherProfile = teacher;
          return next();
        }
      }

      // 5. Check Class Teacher ownership
      const cls = await Class.findById(classId);
      if (!cls) {
        return errorResponse(res, 'Class not found', 404);
      }

      const isClassTeacher = cls.teacher && cls.teacher.toString() === teacher._id.toString();
      if (isClassTeacher) {
        req.teacherProfile = teacher;
        return next();
      }

      // 6. Check Subject Teacher assignment via ClassSubject mapping
      if (subjectId) {
        const isSubjectTeacher = await ClassSubject.exists({
          class: classId,
          subject: subjectId,
          teacher: teacher._id,
        });

        if (isSubjectTeacher) {
          req.teacherProfile = teacher;
          return next();
        }
      } else {
        // If no specific subject provided, check if teacher teaches ANY subject in this class
        const teachesAnySubjectInClass = await ClassSubject.exists({
          class: classId,
          teacher: teacher._id,
        });

        if (teachesAnySubjectInClass) {
          req.teacherProfile = teacher;
          return next();
        }
      }

      return errorResponse(
        res,
        'Unauthorized: You are not assigned to manage marks for this class or subject',
        403
      );
    } catch (error) {
      next(error);
    }
  };
};

module.exports = { verifyExamTeacherAccess };
