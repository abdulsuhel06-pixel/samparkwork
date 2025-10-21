const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const {
  getConversations,
  getMessages,
  sendMessage,
  uploadMessageFile,
  markMessagesAsRead,
  searchMessages,
  createOrFindConversation,
  getUnreadCount,
  deleteConversation,
  deleteMessage  // ✅ NEW: Import delete message function
} = require('../controllers/messageController');
const { protect } = require('../middleware/authMiddleware');

// ===== ENHANCED MULTER CONFIGURATION =====

// Configure multer for message file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = 'uploads/messages';
    const thumbnailPath = 'uploads/messages/thumbnails';
    
    // Create directories if they don't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    if (!fs.existsSync(thumbnailPath)) {
      fs.mkdirSync(thumbnailPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileName = `message-${uniqueSuffix}${path.extname(file.originalname)}`;
    cb(null, fileName);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // ✅ ENHANCED: More file types and better validation
    const allowedTypes = [
      // Images
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/svg+xml',
      // Documents
      'application/pdf', 'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      // Text files
      'text/plain', 'text/csv',
      // Archives
      'application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed',
      // Audio/Video (small files)
      'audio/mpeg', 'audio/wav', 'video/mp4', 'video/webm'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images, documents, archives, and media files are allowed.'));
    }
  }
});

// ===== CORE MESSAGING ROUTES =====

// @route   GET /api/messages/conversations
// @desc    Get user conversations with enhanced profile loading
// @access  Private
router.get('/conversations', protect, getConversations);

// @route   GET /api/messages/conversation/:conversationId
// @desc    Get messages in conversation with proper avatar URLs
// @access  Private
router.get('/conversation/:conversationId', protect, getMessages);

// @route   POST /api/messages/send
// @desc    Send a message with job context integration
// @access  Private
router.post('/send', protect, sendMessage);

// @route   POST /api/messages/conversation
// @desc    Create or find conversation with job/application context
// @access  Private
router.post('/conversation', protect, createOrFindConversation);

// ===== FILE HANDLING ROUTES =====

// @route   POST /api/messages/upload
// @desc    Upload file for message with thumbnail generation
// @access  Private
router.post('/upload', protect, upload.single('messageFile'), uploadMessageFile);

// ===== MESSAGE MANAGEMENT ROUTES =====

// @route   PUT /api/messages/read/:conversationId
// @desc    Mark messages as read with count tracking
// @access  Private
router.put('/read/:conversationId', protect, markMessagesAsRead);

// @route   GET /api/messages/search
// @desc    Search messages with enhanced context
// @access  Private
router.get('/search', protect, searchMessages);

// ✅ NEW: Get unread message count
// @route   GET /api/messages/unread-count
// @desc    Get unread message count for notifications
// @access  Private
router.get('/unread-count', protect, getUnreadCount);

// ===== MESSAGE ACTIONS =====

// ✅ NEW: Delete message - Using controller function
// @route   DELETE /api/messages/:messageId
// @desc    Delete a message with real-time Socket.io updates
// @access  Private
router.delete('/:messageId', protect, deleteMessage);

// ===== CONVERSATION MANAGEMENT =====

// ✅ ENHANCED: Archive/Delete conversation
// @route   DELETE /api/messages/conversation/:conversationId
// @desc    Archive/Delete conversation
// @access  Private
router.delete('/conversation/:conversationId', protect, deleteConversation);

// ✅ ENHANCED: Archive conversation (alternative endpoint for PUT method)
// @route   PUT /api/messages/conversation/:conversationId/archive
// @desc    Archive conversation
// @access  Private
router.put('/conversation/:conversationId/archive', protect, async (req, res) => {
  try {
    console.log('📦 [archiveConversation] Archiving conversation:', req.params.conversationId);
    
    const { conversationId } = req.params;
    const userId = req.user.id;

    const Conversation = require('../models/Conversation');
    const conversation = await Conversation.findById(conversationId);
    
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    // Check if user is participant
    const isParticipant = conversation.participants.some(p => 
      p.userId.toString() === userId && p.isActive
    );

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'Access denied - you are not a participant in this conversation'
      });
    }

    // Add to archived by array if not already archived by this user
    const alreadyArchived = conversation.archivedBy.some(a => 
      a.userId.toString() === userId
    );

    if (!alreadyArchived) {
      conversation.archivedBy.push({
        userId,
        archivedAt: new Date()
      });
    }

    // If all active participants have archived, mark conversation as archived
    const activeParticipants = conversation.participants.filter(p => p.isActive);
    if (conversation.archivedBy.length >= activeParticipants.length) {
      conversation.isArchived = true;
    }

    await conversation.save();

    // ✅ SOCKET.IO: Emit real-time archive event
    const io = req.app.get('io');
    if (io) {
      io.to(`conversation_${conversationId}`).emit('conversation-archived', {
        conversationId,
        archivedBy: userId,
        archivedAt: new Date(),
        isFullyArchived: conversation.isArchived
      });
    }
    
    console.log('✅ [archiveConversation] Conversation archived successfully');
    
    res.json({
      success: true,
      message: 'Conversation archived successfully',
      isFullyArchived: conversation.isArchived
    });
  } catch (error) {
    console.error('❌ [archiveConversation] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error archiving conversation',
      error: error.message
    });
  }
});

// ✅ NEW: Unarchive conversation
// @route   PUT /api/messages/conversation/:conversationId/unarchive
// @desc    Unarchive conversation
// @access  Private
router.put('/conversation/:conversationId/unarchive', protect, async (req, res) => {
  try {
    console.log('📦 [unarchiveConversation] Unarchiving conversation:', req.params.conversationId);
    
    const { conversationId } = req.params;
    const userId = req.user.id;

    const Conversation = require('../models/Conversation');
    const conversation = await Conversation.findById(conversationId);
    
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    // Check if user is participant
    const isParticipant = conversation.participants.some(p => 
      p.userId.toString() === userId && p.isActive
    );

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'Access denied - you are not a participant in this conversation'
      });
    }

    // Remove user from archivedBy array
    conversation.archivedBy = conversation.archivedBy.filter(a => 
      a.userId.toString() !== userId
    );

    // If any participant has unarchived, remove global archive status
    conversation.isArchived = false;

    await conversation.save();

    // ✅ SOCKET.IO: Emit real-time unarchive event
    const io = req.app.get('io');
    if (io) {
      io.to(`conversation_${conversationId}`).emit('conversation-unarchived', {
        conversationId,
        unarchivedBy: userId,
        unarchivedAt: new Date()
      });
    }
    
    console.log('✅ [unarchiveConversation] Conversation unarchived successfully');
    
    res.json({
      success: true,
      message: 'Conversation unarchived successfully'
    });
  } catch (error) {
    console.error('❌ [unarchiveConversation] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error unarchiving conversation',
      error: error.message
    });
  }
});

// ✅ NEW: Block user in conversation
// @route   PUT /api/messages/conversation/:conversationId/block/:userId
// @desc    Block a user in conversation
// @access  Private
router.put('/conversation/:conversationId/block/:userId', protect, async (req, res) => {
  try {
    console.log('🚫 [blockUser] Blocking user in conversation:', req.params.conversationId);
    
    const { conversationId, userId: targetUserId } = req.params;
    const userId = req.user.id;

    const Conversation = require('../models/Conversation');
    const conversation = await Conversation.findById(conversationId);
    
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    // Check if user is participant
    const isParticipant = conversation.participants.some(p => 
      p.userId.toString() === userId && p.isActive
    );

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Add to blocked users if not already blocked
    if (!conversation.blockedUsers) {
      conversation.blockedUsers = [];
    }

    const alreadyBlocked = conversation.blockedUsers.some(b => 
      b.userId.toString() === targetUserId && b.blockedBy.toString() === userId
    );

    if (!alreadyBlocked) {
      conversation.blockedUsers.push({
        userId: targetUserId,
        blockedBy: userId,
        blockedAt: new Date()
      });
      await conversation.save();
    }

    // ✅ SOCKET.IO: Emit block event
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${targetUserId}`).emit('user-blocked', {
        conversationId,
        blockedBy: userId,
        blockedAt: new Date()
      });
    }
    
    console.log('✅ [blockUser] User blocked successfully');
    
    res.json({
      success: true,
      message: 'User blocked successfully'
    });
  } catch (error) {
    console.error('❌ [blockUser] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error blocking user',
      error: error.message
    });
  }
});

// ✅ NEW: Get conversation statistics
// @route   GET /api/messages/conversation/:conversationId/stats
// @desc    Get conversation statistics (message count, participants, etc.)
// @access  Private
router.get('/conversation/:conversationId/stats', protect, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;

    const Conversation = require('../models/Conversation');
    const Message = require('../models/Message');

    // Verify user is participant
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    const isParticipant = conversation.participants.some(p => 
      p.userId.toString() === userId && p.isActive
    );

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Get statistics
    const stats = await Promise.all([
      Message.countDocuments({ conversationId, isDeleted: false }),
      Message.countDocuments({ conversationId, senderId: userId, isDeleted: false }),
      Message.countDocuments({ conversationId, receiverId: userId, isDeleted: false }),
      Message.countDocuments({ conversationId, messageType: 'image', isDeleted: false }),
      Message.countDocuments({ conversationId, messageType: 'file', isDeleted: false }),
      Message.findOne({ conversationId, isDeleted: false }).sort({ createdAt: 1 }),
      Message.findOne({ conversationId, isDeleted: false }).sort({ createdAt: -1 })
    ]);

    const [
      totalMessages,
      messagesSent,
      messagesReceived,
      imageMessages,
      fileMessages,
      firstMessage,
      lastMessage
    ] = stats;

    res.json({
      success: true,
      stats: {
        totalMessages,
        messagesSent,
        messagesReceived,
        imageMessages,
        fileMessages,
        conversationStarted: firstMessage?.createdAt,
        lastActivity: lastMessage?.createdAt,
        participantCount: conversation.participants.filter(p => p.isActive).length
      }
    });
  } catch (error) {
    console.error('❌ [getConversationStats] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting conversation statistics',
      error: error.message
    });
  }
});

// ===== ENHANCED ERROR HANDLER =====

// Global error handler for multer errors
router.use((error, req, res, next) => {
  console.error('❌ [messageRoutes] Error:', error);
  
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 10MB.',
        code: 'FILE_TOO_LARGE'
      });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected file field. Use "messageFile" as field name.',
        code: 'UNEXPECTED_FILE'
      });
    }
    return res.status(400).json({
      success: false,
      message: 'File upload error: ' + error.message,
      code: 'UPLOAD_ERROR'
    });
  }
  
  if (error.message.includes('Invalid file type')) {
    return res.status(400).json({
      success: false,
      message: error.message,
      code: 'INVALID_FILE_TYPE'
    });
  }

  if (error.name === 'ValidationError') {
    const errors = Object.values(error.errors).map(e => e.message);
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: errors,
      code: 'VALIDATION_ERROR'
    });
  }

  if (error.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format',
      code: 'INVALID_ID'
    });
  }
  
  // Default error response
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    code: 'INTERNAL_ERROR',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

module.exports = router;
