const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  deleteNotification,
  updateNotificationPreferences
} = require('../controllers/notificationController');

// ✅ NOTIFICATION ROUTES

// @route   GET /api/notifications
// @desc    Get user notifications with pagination
// @access  Private
router.get('/', protect, getNotifications);

// @route   GET /api/notifications/unread-count
// @desc    Get unread notification count
// @access  Private
router.get('/unread-count', protect, getUnreadCount);

// @route   PUT /api/notifications/mark-read
// @desc    Mark specific notifications as read
// @access  Private
router.put('/mark-read', protect, markAsRead);

// @route   PUT /api/notifications/mark-all-read
// @desc    Mark all notifications as read
// @access  Private
router.put('/mark-all-read', protect, markAllAsRead);

// @route   DELETE /api/notifications/:notificationId
// @desc    Delete a specific notification
// @access  Private
router.delete('/:notificationId', protect, deleteNotification);

// @route   PUT /api/notifications/preferences
// @desc    Update notification preferences
// @access  Private
router.put('/preferences', protect, updateNotificationPreferences);

// ✅ TEST EMAIL ENDPOINT (Development only)
if (process.env.NODE_ENV === 'development') {
  router.get('/test-email', protect, async (req, res) => {
    try {
      const emailService = require('../services/emailService');
      const result = await emailService.testEmail();
      
      res.json({
        success: true,
        message: 'Email test initiated',
        result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Email test failed',
        error: error.message
      });
    }
  });
}

module.exports = router;
