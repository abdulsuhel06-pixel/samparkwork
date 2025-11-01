const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit'); // For rate limiting
const { protect } = require('../middleware/authMiddleware');

// Import all notification controller functions
const {
  getNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  deleteNotification,
  updateNotificationPreferences
} = require('../controllers/notificationController');

// ✅ RATE LIMITING FOR NOTIFICATION ENDPOINTS
const notificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many notification requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ✅ APPLY AUTHENTICATION AND RATE LIMITING TO ALL ROUTES
router.use(protect);
router.use(notificationLimiter);

// ============================================================================
// ✅ BASIC NOTIFICATION ROUTES (WORKING VERSIONS)
// ============================================================================

// @route   GET /api/notifications
// @desc    Get user notifications with pagination
// @access  Private
router.get('/', getNotifications);

// @route   GET /api/notifications/unread-count
// @desc    Get unread notification count
// @access  Private
router.get('/unread-count', getUnreadCount);

// @route   PUT /api/notifications/mark-read
// @desc    Mark specific notifications as read
// @access  Private
router.put('/mark-read', markAsRead);

// @route   PUT /api/notifications/mark-all-read
// @desc    Mark all notifications as read
// @access  Private
router.put('/mark-all-read', markAllAsRead);

// @route   DELETE /api/notifications/:notificationId
// @desc    Delete a specific notification
// @access  Private
router.delete('/:notificationId', deleteNotification);

// @route   PUT /api/notifications/preferences
// @desc    Update notification preferences
// @access  Private
router.put('/preferences', updateNotificationPreferences);

// @route   GET /api/notifications/preferences
// @desc    Get user notification preferences
// @access  Private
router.get('/preferences', async (req, res) => {
  try {
    // This would typically come from your user model
    const defaultPreferences = {
      emailNotifications: true,
      pushNotifications: true,
      smsNotifications: false,
      types: {
        messages: true,
        jobUpdates: true,
        payments: true,
        system: true,
        marketing: false
      }
    };

    res.json({
      success: true,
      preferences: defaultPreferences
    });

  } catch (error) {
    console.error('❌ [getNotificationPreferences] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching notification preferences',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// ✅ TEST EMAIL ENDPOINT (Development only)
if (process.env.NODE_ENV === 'development') {
  router.get('/test-email', async (req, res) => {
    try {
      res.json({
        success: true,
        message: 'Email test endpoint working',
        timestamp: new Date().toISOString()
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

// @route   GET /api/notifications/health
// @desc    Health check for notification system
// @access  Private
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Notification system is healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

module.exports = router;
