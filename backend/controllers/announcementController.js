const Announcement = require('../models/Announcement');
const { successResponse } = require('../utils/apiResponse');

/**
 * @desc    Get the latest announcement
 * @route   GET /api/announcements/latest
 */
const getLatestAnnouncement = async (req, res, next) => {
  try {
    const latest = await Announcement.findOne()
      .populate('createdBy', 'name email role')
      .sort({ createdAt: -1 });

    if (!latest) {
      return successResponse(res, {
        title: 'School Announcement',
        content: 'Welcome to the dashboard. Currently there are no announcements.',
        createdAt: new Date(),
      });
    }

    return successResponse(res, latest);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create/Post a new announcement
 * @route   POST /api/announcements
 */
const postAnnouncement = async (req, res, next) => {
  try {
    const { title, content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Announcement content is required',
      });
    }

    const announcement = await Announcement.create({
      title: title || 'School Announcement',
      content,
      createdBy: req.user._id,
    });

    const populated = await Announcement.findById(announcement._id)
      .populate('createdBy', 'name email role');

    return successResponse(res, populated, 'Announcement posted successfully', 201);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getLatestAnnouncement,
  postAnnouncement,
};
