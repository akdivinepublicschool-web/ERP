const academicService = require('../services/academicService');
const { successResponse } = require('../utils/apiResponse');

// --- Subjects --- //

exports.createSubject = async (req, res, next) => {
  try {
    const subject = await academicService.createSubject(req.body);
    return successResponse(res, subject, 'Subject created successfully', 201);
  } catch (error) {
    next(error);
  }
};

exports.getAllSubjects = async (req, res, next) => {
  try {
    const subjects = await academicService.getAllSubjects();
    return successResponse(res, subjects, 'Subjects fetched successfully');
  } catch (error) {
    next(error);
  }
};

exports.getSubjectById = async (req, res, next) => {
  try {
    const subject = await academicService.getSubjectById(req.params.id);
    return successResponse(res, subject, 'Subject fetched successfully');
  } catch (error) {
    next(error);
  }
};

exports.updateSubject = async (req, res, next) => {
  try {
    const subject = await academicService.updateSubject(req.params.id, req.body);
    return successResponse(res, subject, 'Subject updated successfully');
  } catch (error) {
    next(error);
  }
};

exports.deleteSubject = async (req, res, next) => {
  try {
    await academicService.deleteSubject(req.params.id);
    return successResponse(res, null, 'Subject deleted successfully');
  } catch (error) {
    next(error);
  }
};

// --- Class-Subject Mappings --- //

exports.assignSubjectToClass = async (req, res, next) => {
  try {
    const mapping = await academicService.assignSubjectToClass(req.params.classId, req.body);
    return successResponse(res, mapping, 'Subject assigned to class successfully', 201);
  } catch (error) {
    next(error);
  }
};

exports.getClassSubjects = async (req, res, next) => {
  try {
    const subjects = await academicService.getClassSubjects(req.params.classId);
    return successResponse(res, subjects, 'Class subjects fetched successfully');
  } catch (error) {
    next(error);
  }
};

exports.removeClassSubjectMapping = async (req, res, next) => {
  try {
    await academicService.removeClassSubjectMapping(req.params.mappingId);
    return successResponse(res, null, 'Subject mapping removed successfully');
  } catch (error) {
    next(error);
  }
};
