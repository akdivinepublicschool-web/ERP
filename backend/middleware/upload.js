/**
 * Upload Middleware
 * 
 * Intercepts incoming file streams, enforces multer constraints,
 * and handles upload-specific exceptions (e.g. size/type violations).
 */

const uploadConfig = require('../config/multerConfig');

const studentPhotoUpload = (req, res, next) => {
  const uploadSingle = uploadConfig.single('studentPhoto');

  uploadSingle(req, res, function (err) {
    if (err) {
      // Catch file size or custom file filter validation errors
      return res.status(400).json({
        success: false,
        message: err.message || 'An error occurred during file upload.'
      });
    }

    // Save relative public path if file is successfully uploaded
    if (req.file) {
      req.body.studentPhoto = `/uploads/students/${req.file.filename}`;
    }

    next();
  });
};

module.exports = {
  studentPhotoUpload
};
