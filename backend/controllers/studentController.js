/**
 * Student Controller
 * 
 * Full CRUD operations for the Student resource.
 * Errors are forwarded to the centralized error handler via next().
 */

const Student = require('../models/Student');
const Class = require('../models/Class');
const Teacher = require('../models/Teacher');
const FeeLedger = require('../models/FeeLedger');
const StudentMigrationAuditLog = require('../models/StudentMigrationAuditLog');
const { successResponse, errorResponse } = require('../utils/apiResponse');

// Helper function to resolve or create a Class automatically
const getOrCreateClass = async (className, section) => {
  if (!className) return null;
  const classFullName = section ? `${className}-${section}` : className;
  
  let targetClass = await Class.findOne({ name: classFullName });
  if (!targetClass) {
    targetClass = await Class.findOne({ name: className });
  }
  
  if (!targetClass) {
    // Find a teacher to assign
    let teacher = await Teacher.findOne({});
    if (!teacher) {
      teacher = await Teacher.create({
        fullName: "Primary Class Teacher",
        email: `teacher-${className.replace(/\s+/g, '-').toLowerCase()}@lfes.com`,
        phone: "9876543210",
        gender: "Other",
        qualification: "B.Ed",
        joiningDate: new Date(),
        salary: 25000,
        status: "Active"
      });
    }
    
    targetClass = await Class.create({
      name: className,
      teacher: teacher._id,
      tuitionFee: 1500, // Default tuition fee
      isActive: true
    });
  }
  
  return targetClass;
};

/**
 * @desc    Get all students (with optional filters)
 * @route   GET /api/students
 * @access  Public
 */
const getAllStudents = async (req, res, next) => {
  try {
    const { grade, className, class: classQuery, section, isActive, transportMode, page = 1, limit = 20 } = req.query;

    // Build filter object
    const filter = {};
    const cls = grade || className || classQuery;
    if (cls) {
      const classRegex = new RegExp(`^${cls}$`, 'i');
      filter.$or = [
        { className: classRegex },
        { grade: classRegex }
      ];
    }
    if (section) filter.section = section;
    if (isActive !== undefined) {
      if (isActive === 'true') {
        // Show active OR students with no status field
        filter.status = 'Active';
      } else {
        filter.status = 'Inactive';
      }
    }
    if (transportMode) {
      filter.transportMode = transportMode;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [students, total] = await Promise.all([
      Student.find(filter)
        .sort({ className: 1, rollNumber: 1 })
        .collation({ locale: 'en', numericOrdering: true })
        .skip(skip)
        .limit(parseInt(limit)),
      Student.countDocuments(filter),
    ]);

    return successResponse(res, {
      students,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    }, 'Students fetched successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get a single student by ID
 * @route   GET /api/students/:id
 * @access  Public
 */
const getStudentById = async (req, res, next) => {
  try {
    const student = await Student.findById(req.params.id);

    if (!student) {
      return errorResponse(res, 'Student not found', 404);
    }

    return successResponse(res, student, 'Student fetched successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a new student
 * @route   POST /api/students
 * @access  Public
 */
const createStudent = async (req, res, next) => {
  try {
    const isArray = Array.isArray(req.body);
    const studentsData = isArray ? req.body : [req.body];

    // Cache classes and reserve roll numbers within this request batch.
    const classCache = {};
    const reservedRollsByClassSession = new Map();

    for (const data of studentsData) {
      if (data.className) {
        const cacheKey = data.section ? `${data.className}-${data.section}` : data.className;
        let targetClass = classCache[cacheKey];
        
        if (!targetClass) {
          targetClass = await getOrCreateClass(data.className, data.section);
          if (targetClass) {
            classCache[cacheKey] = targetClass;
          }
        }
        
        if (targetClass) {
          data.class = targetClass._id;
        }
      }

      const className = String(data.className || '').trim();
      const session = String(data.session || '').trim();
      const allocationKey = className + '::' + session;
      if (!reservedRollsByClassSession.has(allocationKey)) {
        reservedRollsByClassSession.set(allocationKey, new Set());
      }
      const reservedRolls = reservedRollsByClassSession.get(allocationKey);

      if (data.rollNumberMode === 'auto') {
        if (!className || !session) {
          return errorResponse(res, 'Class and academic session are required for automatic roll-number allocation.', 400);
        }
        const existingStudents = await Student.find({ className, session }).select('rollNumber').lean();
        const occupied = new Set(existingStudents.map((student) => String(student.rollNumber || '').trim()));
        reservedRolls.forEach((roll) => occupied.add(roll));
        const numericRolls = [...occupied].map((roll) => Number.parseInt(roll, 10)).filter((roll) => Number.isInteger(roll) && roll > 0);
        let nextRoll = (numericRolls.length ? Math.max(...numericRolls) : 0) + 1;
        while (occupied.has(String(nextRoll))) nextRoll += 1;
        data.rollNumber = String(nextRoll);
      } else {
        data.rollNumber = String(data.rollNumber || '').trim();
        if (!data.rollNumber) {
          return errorResponse(res, 'Roll number is required. Choose automatic assignment or enter it manually.', 400);
        }
        const duplicate = await Student.findOne({ className, session, rollNumber: data.rollNumber }).select('_id').lean();
        if (duplicate || reservedRolls.has(data.rollNumber)) {
          return errorResponse(res, 'This roll number is already assigned in the selected class and academic session. Choose another number.', 409);
        }
      }

      reservedRolls.add(String(data.rollNumber));
      delete data.rollNumberMode;
    }

    const createdStudents = await Student.create(studentsData);

    // Update class references
    const createdArray = Array.isArray(createdStudents) ? createdStudents : [createdStudents];
    for (const student of createdArray) {
      if (student.class) {
        await Class.findByIdAndUpdate(student.class, {
          $addToSet: { students: student._id }
        });
      }
    }

    return successResponse(
      res, 
      isArray ? createdStudents : createdStudents[0], 
      `${isArray ? 'Students' : 'Student'} created successfully`, 
      201
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update a student
 * @route   PUT /api/students/:id
 * @access  Public
 */
const updateStudent = async (req, res, next) => {
  try {
    const oldStudent = await Student.findById(req.params.id);
    if (!oldStudent) {
      return errorResponse(res, 'Student not found', 404);
    }

    // Class/section changes must go through migration so enrollment history,
    // roll allocation, attendance boundaries and audit logs stay consistent.
    const classNameChanged = req.body.className !== undefined &&
      String(req.body.className).trim().toUpperCase() !== String(oldStudent.className || '').trim().toUpperCase();
    const sectionChanged = req.body.section !== undefined &&
      String(req.body.section || '').trim() !== String(oldStudent.section || '').trim();
    const classIdChanged = req.body.class !== undefined &&
      String(req.body.class) !== String(oldStudent.class || '');

    if (classNameChanged || sectionChanged || classIdChanged) {
      return errorResponse(
        res,
        'Student class or section cannot be changed from profile edit. Please use the Bulk Class Migration flow so attendance history and roll numbers remain correct.',
        409
      );
    }

    const student = await Student.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    // If class has changed, remove from old class and add to new class
    if (oldStudent.class && student.class && oldStudent.class.toString() !== student.class.toString()) {
      // Remove from old class
      await Class.findByIdAndUpdate(oldStudent.class, {
        $pull: { students: student._id }
      });
      // Add to new class
      if (student.status === 'Active') {
        await Class.findByIdAndUpdate(student.class, {
          $addToSet: { students: student._id }
        });
      }
    } else if (!oldStudent.class && student.class && student.status === 'Active') {
      // Add to new class
      await Class.findByIdAndUpdate(student.class, {
        $addToSet: { students: student._id }
      });
    }

    // If status has changed, update class student list accordingly
    if (oldStudent.status !== student.status && student.class) {
      if (student.status === 'Active') {
        await Class.findByIdAndUpdate(student.class, {
          $addToSet: { students: student._id }
        });
      } else {
        await Class.findByIdAndUpdate(student.class, {
          $pull: { students: student._id }
        });
      }
    }

    // Sync ledger if transport details have changed
    if (req.body.transportMode !== undefined || req.body.transportFee !== undefined) {
      const populatedStudent = await Student.findById(student._id).populate('class');
      if (populatedStudent && populatedStudent.class) {
        const feeService = require('../services/feeService');
        await feeService.ensureFeeLedger(
          populatedStudent._id,
          populatedStudent.session || '2026-2027',
          populatedStudent.class.tuitionFee || 0
        );
      }
    }

    return successResponse(res, student, 'Student updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a student (soft delete - sets status to Inactive)
 * @route   DELETE /api/students/:id
 * @access  Public
 */
const deleteStudent = async (req, res, next) => {
  try {
    const student = await Student.findByIdAndUpdate(
      req.params.id,
      { status: 'Inactive' },
      { new: true }
    );

    if (!student) return errorResponse(res, 'Student not found', 404);

    if (student.class) {
      await Class.findByIdAndUpdate(student.class, {
        $pull: { students: student._id }
      });
    }

    return successResponse(res, student, 'Student deactivated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Permanently delete only the student profile; preserve linked history.
 * @route DELETE /api/students/:id/permanent
 * @access Private (Admin only)
 */
const permanentlyDeleteStudent = async (req, res, next) => {
  try {
    if (!require('mongoose').isValidObjectId(req.params.id)) {
      return errorResponse(res, 'Invalid student ID', 400);
    }

    const student = await Student.findById(req.params.id);
    if (!student) return errorResponse(res, 'Student not found', 404);

    // Intentionally preserve attendance, marks, fee ledgers, payment transactions,
    // and migration audit documents. Only remove the student's profile document.
    await Student.deleteOne({ _id: student._id });

    // Remove denormalized class membership without deleting class/history data.
    await Class.updateMany(
      { students: student._id },
      { $pull: { students: student._id } }
    );

    return successResponse(res, { deletedStudentId: student._id }, 'Student profile permanently deleted. Historical records were preserved.');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get a student's full profile (including fee summary)
 * @route   GET /api/students/:studentId/profile
 * @access  Public
 */
const getStudentProfile = async (req, res, next) => {
  try {
    const { studentId } = req.params;

    // 1. Fetch Student details
    // Support both custom studentId (e.g., STU-2026-0001) and MongoDB _id as fallback
    let student = await Student.findOne({ studentId });
    
    // Fallback to searching by MongoDB _id if not found by studentId
    if (!student && /^[0-9a-fA-F]{24}$/.test(studentId)) {
      student = await Student.findById(studentId);
    }

    if (!student) {
      return errorResponse(res, 'Student not found', 404);
    }

    // 2. Fetch the latest FeeLedger for the student
    const feeLedger = await FeeLedger.findOne({ studentId: student._id })
      .sort({ createdAt: -1 });

    // 3. Construct clean, frontend-ready JSON
    const response = {
      _id: student._id,
      personalDetails: {
        _id: student._id,
        name: student.fullName,
        fullName: student.fullName,
        studentId: student.studentId,
        rollNumber: student.rollNumber,
        admissionNumber: student.admissionNumber,
        admissionDate: student.admissionDate || student.createdAt,
        discountPercentage: student.discountPercentage || 0,
        previousSchool: student.previousSchool || '',
        status: student.status,
        gender: student.gender,
        dob: student.dob,
        studentPhoto: student.studentPhoto,
        photoSource: student.photoSource || 'upload',
        photoUrl: student.photoUrl || '',
        bloodGroup: student.bloodGroup,
        transportMode: student.transportMode || 'Private',
        cast: student.cast,
        aadhar: student.aadhar,
        qrCode: student.qrCode,
        barcode: student.barcode,
        customFields: student.customFields || {},
      },
      academicDetails: {
        className: student.className || student.grade || 'N/A',
        section: student.section,
        session: student.session,
      },
      contactDetails: {
        address: student.address,
        phone: student.phone,
        fatherName: student.fatherName,
        motherName: student.motherName,
        parentName: student.fatherName || student.motherName, // Backward compatibility
        parentMobile: student.emergencyContact, // Backward compatibility
        emergencyContact: student.emergencyContact,
      },
      feeSummary: feeLedger ? {
        academicYear: feeLedger.academicYear,
        totalFee: feeLedger.totalFee,
        totalPaid: feeLedger.totalPaid,
        pendingAmount: feeLedger.pendingAmount,
        monthlyFees: feeLedger.monthlyFees,
      } : {
        message: 'No fee record found for this academic year',
        totalFee: 0,
        totalPaid: 0,
        pendingAmount: 0,
        monthlyFees: [],
      }
    };

    return successResponse(res, response, 'Student profile fetched successfully');
  } catch (error) {
    next(error);
  }
};

const getNextRollNumberPreview = async (req, res, next) => {
  try {
    const className = String(req.query.className || '').trim();
    const session = String(req.query.session || '').trim();
    if (!className || !session) {
      return errorResponse(res, 'Class and academic session are required to calculate the next roll number.', 400);
    }
    const students = await Student.find({ className, session }).select('rollNumber').lean();
    const occupied = new Set(students.map((student) => String(student.rollNumber || '').trim()));
    const numericRolls = [...occupied].map((roll) => Number.parseInt(roll, 10)).filter((roll) => Number.isInteger(roll) && roll > 0);
    let nextRollNumber = (numericRolls.length ? Math.max(...numericRolls) : 0) + 1;
    while (occupied.has(String(nextRollNumber))) nextRollNumber += 1;
    return successResponse(res, { nextRollNumber: String(nextRollNumber) }, 'Next roll number calculated');
  } catch (error) {
    next(error);
  }
};

const getLatestAdmissionStats = async (req, res, next) => {
  try {
    const totalStudents = await Student.countDocuments();
    // Sort by createdAt descending to find the last added student
    const lastStudent = await Student.findOne().sort({ createdAt: -1 });
    
    let nextAdmissionNumber = "1001";
    let lastAdmissionNumber = null;
    
    if (lastStudent && lastStudent.admissionNumber) {
      let currentNumber = lastStudent.admissionNumber;
      lastAdmissionNumber = currentNumber;
      let isUnique = false;
      
      while (!isUnique) {
        const numMatch = currentNumber.match(/\d+$/);
        if (numMatch) {
          const numPart = numMatch[0];
          const nextNum = parseInt(numPart, 10) + 1;
          const nextNumStr = nextNum.toString().padStart(numPart.length, '0');
          nextAdmissionNumber = currentNumber.replace(new RegExp(numPart + '$'), nextNumStr);
        } else {
          nextAdmissionNumber = currentNumber + "-1";
        }
        
        const existing = await Student.findOne({ admissionNumber: nextAdmissionNumber });
        if (!existing) {
          isUnique = true;
        } else {
          currentNumber = nextAdmissionNumber;
        }
      }
    } else {
      while (await Student.findOne({ admissionNumber: nextAdmissionNumber })) {
        nextAdmissionNumber = (parseInt(nextAdmissionNumber, 10) + 1).toString();
      }
    }
    
    return successResponse(res, {
      totalStudents,
      lastAdmissionNumber,
      nextAdmissionNumber
    }, 'Latest admission stats fetched');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Bulk Migrate / Transfer Students to Target Class & Section
 * @route   PUT /api/students/bulk-migrate
 * @access  Private (Admin / Super Admin)
 */
const bulkMigrateStudents = async (req, res, next) => {
  try {
    const {
      studentIds,
      targetClassId,
      targetClassName,
      targetSection,
      rollMode = 'assign_next',
      effectiveDate
    } = req.body;

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return errorResponse(res, 'Please select at least one student to migrate', 400);
    }
    if (!targetClassName && !targetClassId) {
      return errorResponse(res, 'Target class name or target class ID is required', 400);
    }

    let targetClass = null;
    if (targetClassId && require('mongoose').isValidObjectId(targetClassId)) {
      targetClass = await Class.findById(targetClassId);
    }
    // Migration must target an existing, configured class. Do not silently
    // create classes or dummy teachers as a side effect of a student transfer.
    if (!targetClass && targetClassName) {
      const normalizedName = String(targetClassName).trim().toUpperCase();
      const normalizedSection = String(targetSection || '').trim().toUpperCase();
      const fullName = normalizedSection ? `${normalizedName}-${normalizedSection}` : normalizedName;
      // When a section is supplied, never fall back to a different/base class;
      // that can silently place a student in the wrong section.
      targetClass = await Class.findOne({ name: fullName });
      if (!targetClass && !normalizedSection) {
        targetClass = await Class.findOne({ name: normalizedName });
      }
    }
    if (!targetClass) {
      return errorResponse(res, 'Destination class was not found. Please select an existing class from the class list.', 404);
    }

    const { migrateStudents } = require('../services/studentMigrationService');
    const adminUser = req.user || {};
    const result = await migrateStudents({
      studentIds,
      targetClass,
      targetSection,
      rollMode,
      effectiveDate,
      adminUser,
      ip: req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || ''
    });

    const message = result.migratedCount
      ? 'Successfully migrated ' + result.migratedCount + ' students to ' + result.newClassName
      : 'Students are already assigned to the selected class and section';
    return successResponse(res, result, message, 200);
  } catch (error) {
    next(error);
  }
};

module.exports = {
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
};
