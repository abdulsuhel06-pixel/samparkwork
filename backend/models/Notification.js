const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  // Core notification fields
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  type: {
    type: String,
    enum: [
      'new_message',
      'job_application',
      'job_accepted',
      'job_completed',
      'payment_received',
      'profile_viewed',
      'system_announcement'
    ],
    required: true,
    index: true
  },
  
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  
  message: {
    type: String,
    required: true,
    maxlength: 1000
  },
  
  // Status tracking
  read: {
    type: Boolean,
    default: false,
    index: true
  },
  
  readAt: {
    type: Date
  },
  
  emailSent: {
    type: Boolean,
    default: false
  },
  
  emailSentAt: {
    type: Date
  },
  
  // Related data
  relatedData: {
    messageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message'
    },
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation'
    },
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job'
    },
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application'
    }
  },
  
  // Email preferences
  emailPreferences: {
    immediate: {
      type: Boolean,
      default: true
    },
    digest: {
      type: Boolean,
      default: false
    }
  },
  
  // Expiry (for system announcements)
  expiresAt: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
NotificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });
NotificationSchema.index({ recipient: 1, type: 1, createdAt: -1 });
NotificationSchema.index({ createdAt: -1 });
NotificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Virtual for formatted time
NotificationSchema.virtual('timeAgo').get(function() {
  const now = new Date();
  const diff = now - this.createdAt;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
});

// Static methods
NotificationSchema.statics.createNotification = async function(data) {
  try {
    const notification = new this(data);
    await notification.save();
    return notification.populate(['sender', 'recipient']);
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

NotificationSchema.statics.markAsRead = async function(recipientId, notificationIds) {
  try {
    const result = await this.updateMany(
      {
        _id: { $in: notificationIds },
        recipient: recipientId
      },
      {
        read: true,
        readAt: new Date()
      }
    );
    return result;
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    throw error;
  }
};

NotificationSchema.statics.getUnreadCount = async function(recipientId) {
  try {
    return await this.countDocuments({
      recipient: recipientId,
      read: false
    });
  } catch (error) {
    console.error('Error getting unread count:', error);
    return 0;
  }
};

// Instance methods
NotificationSchema.methods.markAsRead = async function() {
  this.read = true;
  this.readAt = new Date();
  return await this.save();
};

module.exports = mongoose.model('Notification', NotificationSchema);
