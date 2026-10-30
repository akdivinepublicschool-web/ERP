const Notification = require('../models/Notification');
const User = require('../models/User');
const DeviceToken = require('../models/DeviceToken');
const { sendPushToUsers, initializeFirebase } = require('../services/pushNotificationService');
const { successResponse, errorResponse } = require('../utils/apiResponse');

exports.registerDevice = async (req, res, next) => {
  try {
    const { token, platform = 'web' } = req.body;
    if (typeof token !== 'string' || token.length < 20 || token.length > 4096) {
      return errorResponse(res, 'A valid device token is required', 400);
    }

    await DeviceToken.findOneAndUpdate(
      { token },
      {
        $set: {
          user: req.user._id,
          platform: ['web', 'android', 'ios'].includes(platform) ? platform : 'unknown',
          userAgent: String(req.headers['user-agent'] || '').slice(0, 500),
          lastUsedAt: new Date(),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return successResponse(res, { registered: true }, 'This device is registered for notifications');
  } catch (error) {
    next(error);
  }
};

exports.unregisterDevice = async (req, res, next) => {
  try {
    const { token } = req.body;
    if (token) await DeviceToken.deleteOne({ token, user: req.user._id });
    return successResponse(res, { removed: true }, 'Device notification registration removed');
  } catch (error) {
    next(error);
  }
};

exports.getPushStatus = async (req, res) => {
  const deviceCount = await DeviceToken.countDocuments({ user: req.user._id });
  return successResponse(res, {
    configured: initializeFirebase(),
    registeredDevices: deviceCount,
    vapidConfigured: Boolean(process.env.FCM_VAPID_KEY),
  });
};

exports.sendBroadcast = async (req, res, next) => {
  try {
    const title = String(req.body.title || '').trim();
    const message = String(req.body.message || '').trim();
    const audience = req.body.audience || 'all';
    const type = ['info', 'success', 'warning', 'error'].includes(req.body.type) ? req.body.type : 'info';
    const link = typeof req.body.link === 'string' && req.body.link.startsWith('/') && !req.body.link.startsWith('//')
      ? req.body.link
      : '';

    if (!title || title.length > 120) return errorResponse(res, 'Title is required (maximum 120 characters)', 400);
    if (!message || message.length > 1500) return errorResponse(res, 'Message is required (maximum 1500 characters)', 400);
    if (!['all', 'teachers', 'admins'].includes(audience)) return errorResponse(res, 'Invalid notification audience', 400);

    const roles = audience === 'all' ? ['admin', 'teacher'] : audience === 'teachers' ? ['teacher'] : ['admin'];
    const recipients = await User.find({ role: { $in: roles }, isActive: true }).select('_id');
    if (!recipients.length) return errorResponse(res, 'No active users found for this audience', 404);

    const userIds = recipients.map((user) => user._id);
    await Notification.insertMany(userIds.map((recipient) => ({
      recipient,
      sender: req.user._id,
      title,
      message,
      type,
      link,
      isRead: false,
    })));

    let push;
    try {
      push = await sendPushToUsers(userIds, { title, message, link }, { type, link });
    } catch (pushError) {
      console.error('Push delivery failed; in-app notifications were saved:', pushError.message);
      push = { configured: initializeFirebase(), sent: 0, failed: 0, error: 'Push delivery failed; in-app notifications are available.' };
    }

    return successResponse(res, {
      recipientCount: userIds.length,
      push,
    }, 'Notification published successfully', 201);
  } catch (error) {
    next(error);
  }
};

exports.getNotifications = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const count = await Notification.countDocuments({ recipient: req.user._id });
    const notifications = await Notification.find({ recipient: req.user._id })
      .sort({ createdAt: -1 }).skip(skip).limit(limit);

    return successResponse(res, {
      notifications,
      pagination: { total: count, page, pages: Math.ceil(count / limit) },
    }, 'Notifications fetched successfully');
  } catch (error) {
    next(error);
  }
};

exports.getUnreadCount = async (req, res, next) => {
  try {
    const unreadCount = await Notification.countDocuments({ recipient: req.user._id, isRead: false });
    return successResponse(res, { unreadCount }, 'Unread count fetched successfully');
  } catch (error) {
    next(error);
  }
};

exports.markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { $set: { isRead: true } },
      { new: true }
    );
    if (!notification) return errorResponse(res, 'Notification not found or unauthorized', 404);
    return successResponse(res, notification, 'Notification marked as read');
  } catch (error) {
    next(error);
  }
};

exports.markAllAsRead = async (req, res, next) => {
  try {
    await Notification.updateMany({ recipient: req.user._id, isRead: false }, { $set: { isRead: true } });
    return successResponse(res, null, 'All notifications marked as read');
  } catch (error) {
    next(error);
  }
};

exports.deleteNotification = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndDelete({ _id: req.params.id, recipient: req.user._id });
    if (!notification) return errorResponse(res, 'Notification not found or unauthorized', 404);
    return successResponse(res, null, 'Notification deleted successfully');
  } catch (error) {
    next(error);
  }
};
