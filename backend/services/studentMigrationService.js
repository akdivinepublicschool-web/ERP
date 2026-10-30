const mongoose = require('mongoose');
const Student = require('../models/Student');
const Class = require('../models/Class');
const Attendance = require('../models/Attendance');
const StudentMigrationAuditLog = require('../models/StudentMigrationAuditLog');
const { getStartOfDay } = require('../utils/dateUtils');

const toId = (value) => (value ? value.toString() : null);
const migrationError = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode });

const migrateStudents = async ({
  studentIds,
  targetClass,
  targetSection,
  rollMode = 'assign_next',
  effectiveDate,
  adminUser = {},
  ip = ''
}) => {
  if (!targetClass?._id) throw migrationError('A valid destination class is required', 400);

  const migrationDate = getStartOfDay(effectiveDate || new Date());
  if (!migrationDate) throw migrationError('Please provide a valid migration effective date', 400);
  const today = getStartOfDay(new Date());
  if (migrationDate.getTime() > today.getTime()) {
    throw migrationError('Future-dated migrations are not supported. Choose today or an earlier school day; scheduled transfers need a separate workflow.', 400);
  }

  if (!Array.isArray(studentIds) || !studentIds.length) {
    throw migrationError('Please select at least one student to migrate', 400);
  }
  if (studentIds.length > 500) {
    throw migrationError('Please migrate a maximum of 500 students per batch. Split larger migrations into smaller batches.', 400);
  }
  const uniqueIds = [...new Set(studentIds.map(String))];
  if (uniqueIds.some((id) => !mongoose.isValidObjectId(id))) {
    throw migrationError('One or more selected student IDs are invalid. Refresh the list and try again.', 400);
  }

  const section = targetSection !== undefined ? String(targetSection || '').trim() : String(targetClass.section || '').trim();
  const className = String(targetClass.name || '').trim().toUpperCase();
  if (!className) throw migrationError('Destination class name is invalid', 400);
  if (!['keep', 'assign_next', 'regenerate'].includes(rollMode)) {
    throw migrationError('Invalid roll-number allocation mode. Choose Auto Assign Next Roll Number or Keep Existing Roll Number.', 400);
  }
  const normalizedRollMode = rollMode === 'keep' ? 'keep' : 'assign_next';

  const dbSession = await mongoose.startSession();
  let response;

  try {
    await dbSession.withTransaction(async () => {
      const destinationClass = await Class.findById(targetClass._id).session(dbSession);
      if (!destinationClass || !destinationClass.isActive) {
        throw migrationError('Destination class does not exist or is inactive. Please choose an active class.', 409);
      }
      const nameSection = String(destinationClass.name || '').match(/-([A-Z0-9]+)$/i)?.[1];
      const configuredSection = String(destinationClass.section || nameSection || '').trim().toUpperCase();
      if (configuredSection && section.toUpperCase() !== configuredSection) {
        throw migrationError(`Selected destination is ${destinationClass.name} (Section ${configuredSection}), but the requested section is ${section || 'blank'}. Please select the correct class/section.`, 409);
      }

      const students = await Student.find({ _id: { $in: uniqueIds } }).session(dbSession);
      if (students.length !== uniqueIds.length) {
        throw migrationError('Some selected students could not be found. Please refresh and try again.', 404);
      }

      const movingStudents = students.filter((student) =>
        toId(student.class) !== toId(targetClass._id) ||
        String(student.section || '') !== section ||
      String(student.className || '').trim().toUpperCase() !== className
      );
      if (!movingStudents.length) {
        response = {
          migratedCount: 0,
          oldClassName: className,
          oldSection: section,
          newClassName: className,
          newSection: section,
          targetClassId: targetClass._id,
          rollMode: normalizedRollMode,
          rollAssignments: []
        };
        return;
      }

      const movingIds = movingStudents.map((student) => student._id);
      const oldClassIds = [...new Set(movingStudents.map((student) => toId(student.class)).filter(Boolean))];

      // A date-level attendance record cannot be split across two classes. If the
      // old class has already marked attendance on/after the effective date, ask
      // the admin to choose a later effective date instead of misclassifying it.
      const attendanceConflict = await Attendance.findOne({
        student: { $in: movingIds },
        date: { $gte: migrationDate }
      }).select('_id date class').session(dbSession).lean();
      if (attendanceConflict) {
        throw migrationError('Attendance has already been recorded for one or more selected students on or after the migration date. Please choose the next school day as the effective date so previous attendance remains in the old class.', 409);
      }
      const oldClassNames = [...new Set(movingStudents.map((student) => student.className || 'Unknown'))];
      const oldSections = [...new Set(movingStudents.map((student) => student.section || ''))];

      // Existing destination students keep their roll numbers. New arrivals receive
      // numbers after the highest occupied number in their academic session.
      const sessions = [...new Set(movingStudents.map((student) => String(student.session || 'unknown')))];
      const destinationStudents = await Student.find({
        session: { $in: sessions },
        _id: { $nin: movingIds },
        $or: [
          { class: targetClass._id },
          { className }
        ]
      }).select('_id session rollNumber className class').session(dbSession).lean();

      const occupiedBySession = new Map();
      for (const sessionName of sessions) occupiedBySession.set(sessionName, new Set());
      destinationStudents.forEach((student) => {
        const key = String(student.session || 'unknown');
        if (!occupiedBySession.has(key)) occupiedBySession.set(key, new Set());
        occupiedBySession.get(key).add(String(student.rollNumber || '').trim());
      });

      // When explicitly retaining old roll numbers, reject the migration if any
      // destination collision would violate the unique class/session/roll index.
      if (normalizedRollMode === 'keep') {
        for (const student of movingStudents) {
          const key = String(student.session || 'unknown');
          const roll = String(student.rollNumber || '').trim();
          const occupied = occupiedBySession.get(key) || new Set();
          if (occupied.has(roll)) {
            throw migrationError(`Roll number ${roll} already exists in ${className} for session ${key}. Choose Auto Assign Next Roll Number.`, 409);
          }
          occupied.add(roll);
          occupiedBySession.set(key, occupied);
        }
      }

      const rollAssignments = [];
      for (const student of movingStudents) {
        const sessionName = String(student.session || 'unknown');
        const occupied = occupiedBySession.get(sessionName) || new Set();
        let nextRoll = String(student.rollNumber || '').trim();

        if (normalizedRollMode === 'assign_next') {
          const numericRolls = [...occupied]
            .map((value) => Number.parseInt(value, 10))
            .filter((value) => Number.isInteger(value) && value > 0);
          let candidate = (numericRolls.length ? Math.max(...numericRolls) : 0) + 1;
          while (occupied.has(String(candidate))) candidate += 1;
          nextRoll = String(candidate);
          occupied.add(nextRoll);
          occupiedBySession.set(sessionName, occupied);
        }

        if (!nextRoll) throw migrationError(`A valid roll number could not be assigned to ${student.fullName || 'a student'}.`, 409);
        rollAssignments.push({
          studentId: student._id,
          studentName: student.fullName,
          oldRollNumber: student.rollNumber,
          newRollNumber: nextRoll,
          session: student.session
        });
      }

      // Backfill an initial enrollment period for legacy students using the first
      // attendance date in their current class, falling back to admission date.
      const earliestAttendance = await Attendance.aggregate([
        { $match: { student: { $in: movingIds }, class: { $in: oldClassIds.map((id) => new mongoose.Types.ObjectId(id)) } } },
        { $sort: { date: 1 } },
        { $group: { _id: { student: '$student', class: '$class' }, firstDate: { $first: '$date' } } }
      ]).session(dbSession);
      const firstAttendanceByStudentClass = new Map(
        earliestAttendance.map((entry) => [`${toId(entry._id.student)}_${toId(entry._id.class)}`, entry.firstDate])
      );

      const updates = [];
      for (let index = 0; index < movingStudents.length; index += 1) {
        const student = movingStudents[index];
        const assignment = rollAssignments[index];
        const history = Array.isArray(student.enrollmentHistory)
          ? student.enrollmentHistory.map((entry) => ({
              class: entry.class,
              className: entry.className,
              section: entry.section || '',
              rollNumber: entry.rollNumber || '',
              session: entry.session || student.session || '',
              fromDate: entry.fromDate,
              toDate: entry.toDate || null
            }))
          : [];

        // Validate the complete timeline before appending a new period. A
        // malformed or overlapping timeline must never be silently repaired.
        const openPeriodIndexes = history
          .map((entry, index) => !entry.toDate ? index : -1)
          .filter((index) => index >= 0);
        if (openPeriodIndexes.length > 1) {
          throw migrationError(`Multiple active enrollment periods found for ${student.fullName || 'a selected student'}. Please review the student's history before migration.`, 409);
        }
        for (let index = 0; index < history.length; index += 1) {
          const entry = history[index];
          const from = new Date(entry.fromDate).getTime();
          const to = entry.toDate ? new Date(entry.toDate).getTime() : Infinity;
          if (!Number.isFinite(from) || to < from) {
            throw migrationError(`Invalid enrollment date range found for ${student.fullName || 'a selected student'}. Please review the student's history before migration.`, 409);
          }
          if (index > 0) {
            const previousTo = history[index - 1].toDate
              ? new Date(history[index - 1].toDate).getTime()
              : Infinity;
            if (previousTo >= from) {
              throw migrationError(`Overlapping or out-of-order enrollment periods found for ${student.fullName || 'a selected student'}. Please review the student's history before migration.`, 409);
            }
          }
        }

        const openPeriodIndex = openPeriodIndexes.length ? openPeriodIndexes[0] : -1;
        const openPeriod = openPeriodIndex >= 0 ? history[openPeriodIndex] : null;
        if (history.length && !openPeriod) {
          throw migrationError(`No active enrollment period found for ${student.fullName || 'a selected student'}. Please review the student's history before migration.`, 409);
        }
        if (openPeriod) {
          if (openPeriodIndex !== history.length - 1) {
            throw migrationError(`Enrollment history needs review for ${student.fullName || 'a selected student'} before migration.`, 409);
          }
          if (toId(openPeriod.class) !== toId(student.class)) {
            throw migrationError(`Current class does not match enrollment history for ${student.fullName || 'a selected student'}. Please review the student's enrollment history before migration.`, 409);
          }
          const periodStart = getStartOfDay(openPeriod.fromDate);
          if (periodStart && migrationDate.getTime() <= periodStart.getTime()) {
            throw migrationError(`Migration date must be after the current enrollment start date for ${student.fullName || 'the selected student'}.`, 400);
          }
          openPeriod.toDate = new Date(migrationDate.getTime() - 1);
        } else {
          const oldClassId = toId(student.class);
          const firstAttendance = firstAttendanceByStudentClass.get(`${toId(student._id)}_${oldClassId}`);
          // Use the earliest trustworthy date because imported legacy records may
          // have an admission date or first attendance date that is later.
          const candidateStarts = [student.admissionDate || student.createdAt, firstAttendance]
            .filter(Boolean)
            .map(getStartOfDay)
            .filter(Boolean)
            .sort((a, b) => a.getTime() - b.getTime());
          const inferredStart = candidateStarts[0] || migrationDate;
          if (inferredStart && inferredStart.getTime() >= migrationDate.getTime()) {
            throw migrationError(`Migration date must be after the student's current enrollment start date for ${student.fullName || 'a selected student'}.`, 400);
          }
          const safeStart = inferredStart && inferredStart.getTime() < migrationDate.getTime()
            ? inferredStart
            : migrationDate;
          history.push({
            class: student.class || null,
            className: student.className || 'Unknown',
            section: student.section || '',
            rollNumber: student.rollNumber || '',
            session: student.session || '',
            fromDate: safeStart,
            toDate: new Date(migrationDate.getTime() - 1)
          });
        }

        history.push({
          class: targetClass._id,
          className,
          section,
          rollNumber: assignment.newRollNumber,
          session: student.session || '',
          fromDate: migrationDate,
          toDate: null
        });

        updates.push({
          updateOne: {
            filter: { _id: student._id },
            update: {
              $set: {
                class: targetClass._id,
                className,
                section,
                rollNumber: assignment.newRollNumber,
                enrollmentHistory: history
              }
            }
          }
        });
      }

      if (updates.length) {
        await Student.bulkWrite(updates, { ordered: true, session: dbSession });
      }

      if (oldClassIds.length) {
        await Class.updateMany(
          { _id: { $in: oldClassIds } },
          { $pull: { students: { $in: movingIds } } },
          { session: dbSession }
        );
      }

      const activeMovingIds = movingStudents
        .filter((student) => student.status === 'Active')
        .map((student) => student._id);
      if (activeMovingIds.length) {
        await Class.updateOne(
          { _id: targetClass._id },
          { $addToSet: { students: { $each: activeMovingIds } } },
          { session: dbSession }
        );
      }

      const adminName = adminUser.fullName ||
        `${adminUser.firstName || ''} ${adminUser.lastName || ''}`.trim() || 'Admin';

      await StudentMigrationAuditLog.create([{
        performedBy: adminUser._id,
        adminName,
        ip,
        oldClassName: oldClassNames.join(', '),
        oldSection: oldSections.join(', '),
        newClassName: className,
        newSection: section,
        studentCount: movingStudents.length,
        rollMode: normalizedRollMode,
        effectiveDate: migrationDate,
        studentChanges: rollAssignments.map((assignment) => {
          const sourceStudent = movingStudents.find((student) => toId(student._id) === toId(assignment.studentId));
          return {
            student: assignment.studentId,
            studentName: assignment.studentName || '',
            oldClassName: sourceStudent?.className || '',
            oldSection: sourceStudent?.section || '',
            oldRollNumber: assignment.oldRollNumber || '',
            newRollNumber: assignment.newRollNumber || '',
            session: assignment.session || ''
          };
        })
      }], { session: dbSession });

      response = {
        migratedCount: movingStudents.length,
        oldClassName: oldClassNames.join(', '),
        oldSection: oldSections.join(', '),
        newClassName: className,
        newSection: section,
        targetClassId: targetClass._id,
        rollMode: normalizedRollMode,
        effectiveDate: migrationDate,
        rollAssignments
      };
    });
  } catch (error) {
    const message = String(error?.message || '');
    if (error?.code === 20 || /Transaction numbers are only allowed|replica set|mongos/i.test(message)) {
      throw migrationError('Student migration requires MongoDB transactions. Ensure the production database is running as a replica set or sharded cluster (MongoDB Atlas supports this). No student data was changed.', 503);
    }
    throw error;
  } finally {
    await dbSession.endSession();
  }

  return response;
};

module.exports = { migrateStudents };
