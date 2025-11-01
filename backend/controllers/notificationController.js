const Notification = require('../models/Notification');
const User = require('../models/User');
const asyncHandler = require('express-async-handler');

// ✅ GET ALL NOTIFICATIONS FOR USER
const getNotifications = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { 
    page = 1, 
    limit = 20, 
    type, 
    unreadOnly = false 
  } = req.query;

  try {
    // Build query
    const query = { recipient: userId };
    if (type) query.type = type;
    if (unreadOnly === 'true') query.read = false;

    // Get notifications with pagination
    const notifications = await Notification.find(query)
      .populate('sender', 'name email avatar')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Get total count
    const totalCount = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({
      recipient: userId,
      read: false
    });

    res.json({
      success: true,
      notifications,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        hasMore: page * limit < totalCount
      },
      unreadCount
    });

  } catch (error) {
    console.error('❌ [getNotifications] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching notifications',
      error: error.message
    });
  }
});

// ✅ MARK NOTIFICATIONS AS READ
const markAsRead = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { notificationIds } = req.body;

  try {
    // Validate input
    if (!notificationIds || !Array.isArray(notificationIds)) {
      return res.status(400).json({
        success: false,
        message: 'notificationIds array is required'
      });
    }

    // Mark as read
    const result = await Notification.updateMany(
      {
        _id: { $in: notificationIds },
        recipient: userId
      },
      {
        read: true,
        readAt: new Date()
      }
    );

    // Get updated unread count
    const unreadCount = await Notification.countDocuments({
      recipient: userId,
      read: false
    });

    // Emit Socket.IO event for real-time update
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${userId}`).emit('notifications-marked-read', {
        markedCount: result.modifiedCount,
        unreadCount
      });
    }

    res.json({
      success: true,
      message: `${result.modifiedCount} notifications marked as read`,
      markedCount: result.modifiedCount,
      unreadCount
    });

  } catch (error) {
    console.error('❌ [markAsRead] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking notifications as read',
      error: error.message
    });
  }
});

// ✅ MARK ALL AS READ
const markAllAsRead = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  try {
    const result = await Notification.updateMany(
      {
        recipient: userId,
        read: false
      },
      {
        read: true,
        readAt: new Date()
      }
    );

    // Emit Socket.IO event
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${userId}`).emit('all-notifications-read', {
        markedCount: result.modifiedCount
      });
    }

    res.json({
      success: true,
      message: `All ${result.modifiedCount} notifications marked as read`,
      markedCount: result.modifiedCount,
      unreadCount: 0
    });

  } catch (error) {
    console.error('❌ [markAllAsRead] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking all notifications as read',
      error: error.message
    });
  }
});

// ✅ GET UNREAD COUNT
const getUnreadCount = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  try {
    const count = await Notification.countDocuments({
      recipient: userId,
      read: false
    });

    res.json({
      success: true,
      unreadCount: count
    });

  } catch (error) {
    console.error('❌ [getUnreadCount] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting unread count',
      error: error.message,
      unreadCount: 0
    });
  }
});

// ✅ DELETE NOTIFICATION
const deleteNotification = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { notificationId } = req.params;

  try {
    const notification = await Notification.findOneAndDelete({
      _id: notificationId,
      recipient: userId
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found or access denied'
      });
    }

    // Get updated unread count
    const unreadCount = await Notification.countDocuments({
      recipient: userId,
      read: false
    });

    // Emit Socket.IO event
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${userId}`).emit('notification-deleted', {
        deletedId: notificationId,
        unreadCount
      });
    }

    res.json({
      success: true,
      message: 'Notification deleted successfully',
      unreadCount
    });

  } catch (error) {
    console.error('❌ [deleteNotification] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting notification',
      error: error.message
    });
  }
});

// ✅ UPDATE NOTIFICATION PREFERENCES
const updateNotificationPreferences = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { 
    emailNotifications = true,
    pushNotifications = true,
    messageNotifications = true,
    jobNotifications = true 
  } = req.body;

  try {
    const user = await User.findByIdAndUpdate(
      userId,
      {
        notificationPreferences: {
          email: emailNotifications,
          push: pushNotifications,
          messages: messageNotifications,
          jobs: jobNotifications
        }
      },
      { new: true, select: 'notificationPreferences' }
    );

    res.json({
      success: true,
      message: 'Notification preferences updated successfully',
      preferences: user.notificationPreferences
    });

  } catch (error) {
    console.error('❌ [updateNotificationPreferences] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating notification preferences',
      error: error.message
    });
  }
});

// ✅ CREATE NOTIFICATION (Helper function for other controllers)
const createNotification = async (data) => {
  try {
    const {
      recipient,
      sender,
      type,
      title,
      message,
      relatedData = {},
      emailPreferences = { immediate: true }
    } = data;

    // Create notification
    const notification = await Notification.create({
      recipient,
      sender,
      type,
      title,
      message,
      relatedData,
      emailPreferences
    });

    // Populate sender data
    await notification.populate('sender', 'name email avatar');

    // Emit real-time notification via Socket.IO
    const io = require('../server').io; // Assuming io is exported from server
    if (io) {
      io.to(`user_${recipient}`).emit('new-notification', {
        notification,
        unreadCount: await Notification.countDocuments({
          recipient,
          read: false
        })
      });
    }

    // Send email if enabled
    if (emailPreferences.immediate && type === 'new_message') {
      const emailService = require('../services/emailService');
      const messagePreview = message.length > 100 ? 
        message.substring(0, 100) + '...' : message;
      
      await emailService.sendNewMessageNotification(
        recipient,
        notification.sender.name,
        messagePreview,
        relatedData.conversationId
      );
      
      // Update notification to mark email as sent
      notification.emailSent = true;
      notification.emailSentAt = new Date();
      await notification.save();
    }

    return notification;

  } catch (error) {
    console.error('❌ [createNotification] Error:', error);
    throw error;
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  deleteNotification,
  updateNotificationPreferences,
  createNotification
};
