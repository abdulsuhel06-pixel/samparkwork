const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true,
    index: true
  },
  
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  
  messageType: {
    type: String,
    enum: ['text', 'image', 'file', 'system', 'voice', 'video'],
    default: 'text',
    required: true
  },
  
  content: {
    text: {
      type: String,
      trim: true
    },
    file: {
      filename: String,
      originalName: String,
      mimetype: String,
      size: Number,
      url: String,
      fullUrl: String,
      thumbnail: String
    },
    system: {
      type: String,
      message: String,
      data: mongoose.Schema.Types.Mixed
    }
  },
  
  readBy: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  deliveryStatus: {
    type: String,
    enum: ['sending', 'sent', 'delivered', 'read', 'failed'],
    default: 'sent'
  },
  
  replyTo: {
    messageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message'
    },
    preview: String
  },
  
  reactions: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    emoji: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  metadata: {
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application'
    },
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job'
    },
    ipAddress: String,
    userAgent: String,
    platform: String,
    location: {
      country: String,
      city: String,
      timezone: String
    }
  },
  
  isEdited: {
    type: Boolean,
    default: false
  },
  
  editHistory: [{
    content: String,
    editedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  isDeleted: {
    type: Boolean,
    default: false
  },
  
  deletedBy: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    deletedAt: Date,
    reason: String
  },
  
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  
  tags: [String],
  
  mentions: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    name: String
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
MessageSchema.index({ conversationId: 1, createdAt: -1 });
MessageSchema.index({ senderId: 1 });
MessageSchema.index({ receiverId: 1 });
MessageSchema.index({ messageType: 1 });
MessageSchema.index({ 'content.text': 'text' });
MessageSchema.index({ isDeleted: 1 });
MessageSchema.index({ createdAt: -1 });

// Virtual for read status
MessageSchema.virtual('isRead').get(function() {
  return this.readBy && this.readBy.length > 0;
});

// Virtual for file size formatting
MessageSchema.virtual('formattedFileSize').get(function() {
  if (!this.content.file || !this.content.file.size) return '';
  
  const bytes = this.content.file.size;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
});

// Update conversation's last message and stats
MessageSchema.post('save', async function(doc) {
  try {
    const Conversation = mongoose.model('Conversation');
    await Conversation.findByIdAndUpdate(doc.conversationId, {
      lastMessage: {
        messageId: doc._id,
        content: doc.messageType === 'text' ? doc.content.text : `Sent a ${doc.messageType}`,
        senderId: doc.senderId,
        timestamp: doc.createdAt,
        messageType: doc.messageType
      },
      $inc: { 'stats.totalMessages': 1 },
      'stats.lastActivity': new Date()
    });
  } catch (error) {
    console.error('Error updating conversation after message save:', error);
  }
});

module.exports = mongoose.model('Message', MessageSchema);
