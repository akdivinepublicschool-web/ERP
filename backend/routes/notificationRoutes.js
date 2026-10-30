const express = require('express');
const router = express.Router();
const { protect, isAdmin } = require('../middleware/auth');
const {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  registerDevice,
  unregisterDevice,
  getPushStatus,
  sendBroadcast,
} = require('../controllers/notificationController');

router.use(protect);

router.get('/push-status', getPushStatus);
router.post('/devices', registerDevice);
router.delete('/devices', unregisterDevice);
router.post('/broadcast', isAdmin, sendBroadcast);

router.get('/', getNotifications);
router.get('/unread-count', getUnreadCount);
router.put('/read-all', markAllAsRead);
router.put('/:id/read', markAsRead);
router.delete('/:id', deleteNotification);

module.exports = router;
