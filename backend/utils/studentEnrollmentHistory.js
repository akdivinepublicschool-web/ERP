const getStudentEnrollmentPeriods = (student, attendanceRecords = []) => {
  const savedHistory = Array.isArray(student.enrollmentHistory) ? student.enrollmentHistory : [];
  if (savedHistory.length) return savedHistory;

  // Legacy fallback: infer class periods from the class snapshot on attendance records.
  const periodsByClass = new Map();
  attendanceRecords.forEach((record) => {
    const classId = record.class?._id || record.class;
    if (!classId || !record.date) return;
    const key = classId.toString();
    const date = new Date(record.date);
    const existing = periodsByClass.get(key);
    if (!existing) {
      periodsByClass.set(key, {
        class: classId,
        className: record.class?.name || '',
        fromDate: date,
        toDate: date,
        rollNumber: ''
      });
    } else {
      if (date < existing.fromDate) existing.fromDate = date;
      if (date > existing.toDate) existing.toDate = date;
      if (record.class?.name) existing.className = record.class.name;
    }
  });

  const currentClassId = student.class?._id || student.class;
  if (currentClassId && !periodsByClass.has(currentClassId.toString())) {
    periodsByClass.set(currentClassId.toString(), {
      class: currentClassId,
      className: student.class?.name || student.className || '',
      fromDate: student.admissionDate || student.createdAt || new Date(),
      toDate: null,
      rollNumber: student.rollNumber || ''
    });
  } else if (currentClassId && periodsByClass.has(currentClassId.toString())) {
    periodsByClass.get(currentClassId.toString()).toDate = null;
  }

  return [...periodsByClass.values()].sort((a, b) => new Date(a.fromDate) - new Date(b.fromDate));
};

const getEnrollmentAtDate = (periods, classId, date) => {
  const timestamp = new Date(date).getTime();
  return periods.find((period) => {
    const from = new Date(period.fromDate).getTime();
    const to = period.toDate ? new Date(period.toDate).getTime() : Infinity;
    const periodClassId = period.class?._id || period.class;
    return String(periodClassId) === String(classId) && timestamp >= from && timestamp <= to;
  });
};

module.exports = { getStudentEnrollmentPeriods, getEnrollmentAtDate };
