const mongoose = require('mongoose');

const classSubjectSchema = new mongoose.Schema({
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: [true, 'Class is required']
  },
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: [true, 'Subject is required']
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    required: [true, 'Teacher is required']
  },
  sessionsPerWeek: {
    type: Number,
    default: 1
  }
}, {
  timestamps: true
});

// Prevent duplicate class-subject mapping
classSubjectSchema.index({ class: 1, subject: 1 }, { unique: true });

module.exports = mongoose.model('ClassSubject', classSubjectSchema);
