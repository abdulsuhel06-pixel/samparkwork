const Notification = require('../models/Notification');
const User = require('../models/User');
const asyncHandler = require('express-async-handler');

// ✅ ENHANCED: Import email service
const emailService = require('../services/emailService');

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
    // Get notification unread count
    const notificationCount = await Notification.countDocuments({
      recipient: userId,
      read: false
    });

    // Get message unread count from conversations
    const Conversation = require('../models/Conversation');
    const conversations = await Conversation.find({
      participants: {
        $elemMatch: {
          userId,
          isActive: true
        }
      },
      isDeleted: false
    });

    let messageUnreadCount = 0;
    conversations.forEach(conversation => {
      const participant = conversation.participants.find(p => 
        p.userId.toString() === userId
      );
      if (participant) {
        messageUnreadCount += participant.unreadCount || 0;
      }
    });

    const totalUnreadCount = notificationCount + messageUnreadCount;

    res.json({
      success: true,
      totalUnreadCount,
      notificationUnreadCount: notificationCount,
      messageUnreadCount,
      breakdown: {
        notifications: notificationCount,
        messages: messageUnreadCount,
        total: totalUnreadCount
      }
    });

  } catch (error) {
    console.error('❌ [getUnreadCount] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting unread count',
      error: error.message,
      totalUnreadCount: 0
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

// ✅ ENHANCED: Create notification with email integration
const createNotification = async (data) => {
  try {
    const {
      recipient,
      sender,
      type,
      title,
      message,
      relatedData = {},
      emailPreferences = { immediate: false }
    } = data;

    console.log('📬 [createNotification] Creating notification:', { 
      recipient, sender, type, title, emailEnabled: emailPreferences.immediate 
    });

    // Validate required fields
    if (!recipient || !sender || !type || !title || !message) {
      throw new Error('Missing required notification fields');
    }

    // Check if recipient exists and get their preferences
    const recipientUser = await User.findById(recipient);
    if (!recipientUser) {
      throw new Error('Recipient user not found');
    }

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

    // ✅ ENHANCED: Send email notification if enabled
    if (emailPreferences.immediate && recipientUser.notificationPreferences?.email !== false) {
      try {
        console.log('📧 [createNotification] Sending email notification');
        
        // Get sender data for email
        const senderUser = await User.findById(sender);
        const senderName = senderUser?.name || 'SamparkWork User';
        
        // Determine email context
        let jobTitle = null;
        if (relatedData.jobId) {
          const Job = require('../models/Job');
          const job = await Job.findById(relatedData.jobId);
          jobTitle = job?.title;
        }

        // Send email notification
        const emailSent = await emailService.sendNewMessageNotification(
          recipient,
          senderName,
          message.length > 100 ? message.substring(0, 100) + '...' : message,
          relatedData.conversationId,
          jobTitle
        );

        if (emailSent) {
          notification.emailSent = true;
          notification.emailSentAt = new Date();
          await notification.save();
          console.log('✅ [createNotification] Email notification sent successfully');
        }
        
      } catch (emailError) {
        console.error('❌ [createNotification] Email notification error:', emailError);
        // Don't throw error - notification should still be created even if email fails
      }
    }

    // ✅ ENHANCED: Emit real-time notification via Socket.IO
    try {
      const io = require('../server').io || global.io;
      if (io) {
        // Get current unread count
        const unreadCount = await Notification.countDocuments({
          recipient,
          read: false
        });

        // Emit to user's room
        io.to(`user_${recipient}`).emit('new-notification', {
          notification: {
            _id: notification._id,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            sender: notification.sender,
            relatedData: notification.relatedData,
            read: notification.read,
            createdAt: notification.createdAt
          },
          unreadCount
        });

        console.log('🔔 [createNotification] Real-time notification sent to user:', recipient);
      }
    } catch (socketError) {
      console.error('❌ [createNotification] Socket notification error:', socketError);
    }

    console.log('✅ [createNotification] Notification created successfully');
    return notification;

  } catch (error) {
    console.error('❌ [createNotification] Error:', error);
    throw error;
  }
};

// ✅ ENHANCED: Bulk create notifications
const createBulkNotifications = async (notifications) => {
  try {
    const results = [];
    
    for (const notificationData of notifications) {
      try {
        const notification = await createNotification(notificationData);
        results.push({ success: true, notification });
      } catch (error) {
        console.error('❌ [createBulkNotifications] Failed to create notification:', error);
        results.push({ 
          success: false, 
          error: error.message, 
          data: notificationData 
        });
      }
    }

    return results;
  } catch (error) {
    console.error('❌ [createBulkNotifications] Error:', error);
    throw error;
  }
};

// ✅ NEW: Test email notification system
const testEmailNotification = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Test email service connection
    const emailServiceReady = await emailService.testEmailConnection();
    if (!emailServiceReady) {
      return res.status(500).json({
        success: false,
        message: 'Email service is not configured properly'
      });
    }

    // Send test email
    const testSent = await emailService.sendNewMessageNotification(
      userId,
      'SamparkWork Test',
      'This is a test notification to verify your email notifications are working correctly.',
      null,
      'Test Job Notification'
    );

    res.json({
      success: testSent,
      message: testSent ? 
        'Test email sent successfully! Check your inbox.' : 
        'Failed to send test email. Please check your email configuration.'
    });

  } catch (error) {
    console.error('❌ [testEmailNotification] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error testing email notification',
      error: error.message
    });
  }
});

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  deleteNotification,
  updateNotificationPreferences,
  createNotification,
  createBulkNotifications,
  testEmailNotification
};
