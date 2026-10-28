const mongoose = require('mongoose');

const instituteSettingsSchema = new mongoose.Schema({
  workingDays: {
    type: [String],
    default: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  },
  schoolName: {
    type: String,
    trim: true,
    default: 'AK Divine Public School',
  },
  shortName: {
    type: String,
    trim: true,
    default: 'AK DIVINE',
  },
  address: {
    type: String,
    trim: true,
    default: 'Jagarnathpur, Near Afrad More, Siwan (Bihar)',
  },
  phone: {
    type: String,
    trim: true,
    default: '7634006544, 8651916600',
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    default: '',
  },
  website: { type: String, trim: true, default: '' },
  affiliation: { type: String, trim: true, default: '' },
  medium: { type: String, trim: true, default: 'English Medium' },
  udise: { type: String, trim: true, default: '' },
  registrationNumber: { type: String, trim: true, default: '' },
  tagline: {
    type: String,
    trim: true,
    default: 'शिक्षा जो बनाए उज्ज्वल भविष्य',
  },
  logoUrl: { type: String, trim: true, default: '' },
  directorName: {
    type: String,
    trim: true,
    default: 'Vikash Tiwari',
  },
  managerName: {
    type: String,
    trim: true,
    default: 'Er. Rajesh Kumar Singh',
  },
  trustName: {
    type: String,
    trim: true,
    default: 'AK SOCIO WELFARE FOUNDATION TRUST',
  },
  principalName: {
    type: String,
    trim: true,
    default: '',
  },
  monthlyFeeDueDate: {
    type: Number,
    default: 10,
    min: 1,
    max: 28
  },
}, { timestamps: true });

module.exports = mongoose.model('InstituteSettings', instituteSettingsSchema);
