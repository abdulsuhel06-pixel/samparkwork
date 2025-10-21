const mongoose = require('mongoose');

const ConversationSchema = new mongoose.Schema({
  participants: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['client', 'professional', 'admin'],
      required: true
    },
    isActive: {
      type: Boolean,
      default: true
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    leftAt: Date
  }],
  
  conversationType: {
    type: String,
    enum: ['direct', 'project', 'group'],
    default: 'direct'
  },
  
  title: {
    type: String,
    trim: true
  },
  
  lastMessage: {
    messageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message'
    },
    content: String,
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: Date,
    messageType: {
      type: String,
      enum: ['text', 'image', 'file', 'system'],
      default: 'text'
    }
  },
  
  metadata: {
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application'
    },
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job'
    },
    projectTitle: String,
    budget: Number,
    deadline: Date,
    status: {
      type: String,
      enum: ['active', 'completed', 'cancelled', 'on_hold'],
      default: 'active'
    }
  },
  
  isArchived: {
    type: Boolean,
    default: false
  },
  
  archivedBy: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    archivedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  settings: {
    muteNotifications: {
      type: Boolean,
      default: false
    },
    allowFileSharing: {
      type: Boolean,
      default: true
    },
    retentionPeriod: {
      type: Number,
      default: 365 // days
    }
  },
  
  stats: {
    totalMessages: {
      type: Number,
      default: 0
    },
    lastActivity: {
      type: Date,
      default: Date.now
    },
    participantCount: {
      type: Number,
      default: 2
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ✅ ENHANCED: Indexes for performance AND uniqueness
ConversationSchema.index({ 'participants.userId': 1 });
ConversationSchema.index({ conversationType: 1 });
ConversationSchema.index({ updatedAt: -1 });
ConversationSchema.index({ 'metadata.jobId': 1 });
ConversationSchema.index({ 'metadata.applicationId': 1 });

// ✅ CRITICAL FIX: Unique constraint to prevent duplicate conversations
ConversationSchema.index(
  { 'participants.userId': 1 },
  { 
    unique: true,
    partialFilterExpression: {
      'participants.2': { $exists: false } // Only for 2-participant conversations
    },
    name: 'unique_participant_pair'
  }
);

// Update last activity on save
ConversationSchema.pre('save', function(next) {
  this.stats.lastActivity = new Date();
  next();
});

// Update participant count
ConversationSchema.pre('save', function(next) {
  this.stats.participantCount = this.participants.filter(p => p.isActive).length;
  next();
});

// ✅ NEW: Static method to find or create conversation (preventing duplicates)
ConversationSchema.statics.findOrCreateConversation = async function(participant1Id, participant2Id, options = {}) {
  try {
    // Sort participant IDs to ensure consistent ordering
    const [userId1, userId2] = [participant1Id, participant2Id].sort();
    
    // Look for existing conversation
    let conversation = await this.findOne({
      $and: [
        { 'participants.userId': userId1 },
        { 'participants.userId': userId2 },
        { 'participants.2': { $exists: false } } // Ensure only 2 participants
      ]
    });

    if (!conversation) {
      // Create new conversation
      const { title, conversationType = 'direct', metadata = {} } = options;
      
      conversation = new this({
        participants: [
          { userId: userId1, role: options.user1Role || 'client', isActive: true },
          { userId: userId2, role: options.user2Role || 'professional', isActive: true }
        ],
        conversationType,
        title: title || 'Direct Message',
        metadata
      });
      
      await conversation.save();
    }

    return conversation;
  } catch (error) {
    if (error.code === 11000) {
      // Duplicate key error - conversation already exists, find and return it
      const [userId1, userId2] = [participant1Id, participant2Id].sort();
      return await this.findOne({
        $and: [
          { 'participants.userId': userId1 },
          { 'participants.userId': userId2 },
          { 'participants.2': { $exists: false } }
        ]
      });
    }
    throw error;
  }
};

module.exports = mongoose.model('Conversation', ConversationSchema);
