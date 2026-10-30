const mongoose = require('mongoose');

const deviceTokenSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  token: { type: String, required: true, unique: true, trim: true },
  platform: { type: String, enum: ['web', 'android', 'ios', 'unknown'], default: 'web' },
  userAgent: { type: String, maxlength: 500 },
  lastUsedAt: { type: Date, default: Date.now },
}, { timestamps: true });

deviceTokenSchema.index({ user: 1, lastUsedAt: -1 });

module.exports = mongoose.model('DeviceToken', deviceTokenSchema);
