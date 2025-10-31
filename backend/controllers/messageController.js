// ✅ NOTIFICATION IMPORT - ADD THIS AT THE TOP
const { createNotification } = require('./notificationController');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const User = require('../models/User');
const Job = require('../models/Job');
const Application = require('../models/Application');
const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

// ===== HELPER FUNCTIONS =====

// Generate clean avatar URLs
const generateAvatarUrl = (avatarPath, baseUrl) => {
  if (!avatarPath) return null;
  if (avatarPath.startsWith('http')) return avatarPath;
  return `${baseUrl}/uploads/avatars/${avatarPath}`;
};

// Process user data with avatar URLs
const processUserData = (user, baseUrl) => {
  if (!user) return null;
  const userData = user.toObject ? user.toObject() : user;
  if (userData.avatar && !userData.avatarUrl) {
    userData.avatarUrl = generateAvatarUrl(userData.avatar, baseUrl);
  }
  return userData;
};

// ===== ENHANCED MESSAGING FUNCTIONS =====

// @desc    Get conversations for user - ✅ ENHANCED with better profile loading
// @route   GET /api/messages/conversations
// @access  Private
const getConversations = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, type = 'all' } = req.query;
  const userId = req.user.id;

  try {
    console.log(`💬 [getConversations] Fetching conversations for user: ${userId}`);

    // ✅ CRITICAL FIX: Exclude ARCHIVED conversations for this specific user
    const filter = {
      'participants.userId': userId,
      'participants.isActive': true,
      // ✅ CRITICAL: User hasn't archived this conversation
      'archivedBy.userId': { $ne: userId }
    };

    if (type !== 'all') {
      filter.conversationType = type;
    }

    const conversations = await Conversation.find(filter)
      .populate({
        path: 'participants.userId',
        select: 'name email avatar avatarUrl role companyName',
        match: { _id: { $ne: userId } }
      })
      .populate({
        path: 'lastMessage.senderId',
        select: 'name avatar avatarUrl'
      })
      .populate({
        path: 'metadata.jobId',
        select: 'title status category'
      })
      .populate({
        path: 'metadata.applicationId',
        select: 'status proposedBudget'
      })
      .sort({ updatedAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();

    const totalConversations = await Conversation.countDocuments(filter);
    const baseUrl = `${req.protocol}://${req.get('host')}`;

    // ✅ ENHANCED: Process conversations with proper avatar URLs
    const processedConversations = conversations.map(conv => {
      const otherParticipant = conv.participants.find(p => 
        p.userId && p.userId._id && p.userId._id.toString() !== userId
      );

      // Process other user data with avatar URL
      let otherUser = null;
      if (otherParticipant?.userId) {
        otherUser = processUserData(otherParticipant.userId, baseUrl);
      }

      // Process last message sender
      if (conv.lastMessage?.senderId && conv.lastMessage.senderId.avatar && !conv.lastMessage.senderId.avatarUrl) {
        conv.lastMessage.senderId.avatarUrl = generateAvatarUrl(conv.lastMessage.senderId.avatar, baseUrl);
      }

      return {
        ...conv,
        otherUser,
        unreadCount: 0, // Will be calculated separately if needed
        isOnline: false // Will be updated via Socket.io
      };
    });

    console.log(`✅ [getConversations] Found ${processedConversations.length} conversations`);

    res.json({
      success: true,
      conversations: processedConversations,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalConversations / parseInt(limit)),
        totalConversations,
        hasMore: page * limit < totalConversations
      }
    });
  } catch (error) {
    console.error('❌ [getConversations] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching conversations',
      error: error.message
    });
  }
});

// @desc    Get messages in a conversation - ✅ ENHANCED with better user data
// @route   GET /api/messages/conversation/:conversationId
// @access  Private
const getMessages = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const { page = 1, limit = 50 } = req.query;
  const userId = req.user.id;

  try {
    console.log(`💬 [getMessages] Fetching messages for conversation: ${conversationId}`);

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

    const messages = await Message.find({
      conversationId,
      isDeleted: false
    })
    .populate({
      path: 'senderId',
      select: 'name avatar avatarUrl role'
    })
    .populate({
      path: 'receiverId',
      select: 'name avatar avatarUrl role'
    })
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit))
    .lean();

    // ✅ ENHANCED: Process messages with proper avatar URLs
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const processedMessages = messages.map(message => ({
      ...message,
      senderId: processUserData(message.senderId, baseUrl),
      receiverId: processUserData(message.receiverId, baseUrl)
    }));

    // Mark messages as read
    await Message.updateMany(
      {
        conversationId,
        receiverId: userId,
        'readBy.userId': { $ne: userId }
      },
      {
        $push: {
          readBy: {
            userId: userId,
            readAt: new Date()
          }
        }
      }
    );

    console.log(`✅ [getMessages] Found ${processedMessages.length} messages`);

    res.json({
      success: true,
      messages: processedMessages.reverse(), // Reverse to show oldest first
      pagination: {
        currentPage: parseInt(page),
        hasMore: messages.length === parseInt(limit)
      }
    });
  } catch (error) {
    console.error('❌ [getMessages] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching messages',
      error: error.message
    });
  }
});

// ✅ CRITICAL FIX: Send Message with PERFECT Socket.IO integration and COMPLETE NOTIFICATION SYSTEM
// @desc    Send a message - ✅ ENHANCED with email notifications
// @route   POST /api/messages/send
// @access  Private
const sendMessage = asyncHandler(async (req, res) => {
  const { receiverId, content, messageType = 'text', conversationId, metadata } = req.body;
  const senderId = req.user.id;

  try {
    console.log(`💬 [sendMessage] Sending message from ${senderId} to ${receiverId}`);

    let conversation;

    if (conversationId) {
      // Use existing conversation
      conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        return res.status(404).json({
          success: false,
          message: 'Conversation not found'
        });
      }
    } else {
      // ✅ CRITICAL FIX: Find ANY existing conversation between users first
      let searchQuery = {
        $and: [
          { 'participants.userId': senderId },
          { 'participants.userId': receiverId }
        ]
      };

      conversation = await Conversation.findOne(searchQuery);

      if (!conversation) {
        // Get receiver info
        const receiver = await User.findById(receiverId);
        if (!receiver) {
          return res.status(404).json({
            success: false,
            message: 'Receiver not found'
          });
        }

        // ✅ ENHANCED: Better conversation creation with job context
        let conversationTitle = `Chat with ${receiver.name}`;
        let conversationType = 'direct';

        if (metadata?.jobId) {
          const job = await Job.findById(metadata.jobId);
          if (job) {
            conversationTitle = `${job.title} - Discussion`;
            conversationType = 'project';
          }
        }

        // Create new conversation
        conversation = new Conversation({
          participants: [
            { userId: senderId, role: req.user.role, isActive: true },
            { userId: receiverId, role: receiver.role, isActive: true }
          ],
          conversationType,
          title: conversationTitle,
          metadata: metadata || {}
        });
        await conversation.save();
        
        console.log(`✅ [sendMessage] Created new conversation: ${conversation._id}`);
      } else {
        // ✅ CRITICAL FIX: Update existing conversation with job context
        if (metadata?.jobId && !conversation.metadata?.jobId) {
          const job = await Job.findById(metadata.jobId);
          if (job) {
            conversation.title = `${job.title} - Discussion`;
            conversation.conversationType = 'project';
            conversation.metadata = { ...conversation.metadata, ...metadata };
            await conversation.save();
            console.log(`✅ [sendMessage] Updated conversation with job context`);
          }
        }
      }
    }

    // Create message
    const message = new Message({
      conversationId: conversation._id,
      senderId,
      receiverId,
      messageType,
      content: typeof content === 'string' ? { text: content } : content,
      metadata: metadata || {}
    });

    await message.save();

    // Update conversation's last message
    conversation.lastMessage = {
      messageId: message._id,
      content: messageType === 'text' ? content : `Sent a ${messageType}`,
      senderId,
      timestamp: message.createdAt,
      messageType
    };
    conversation.updatedAt = new Date();
    await conversation.save();

    // ✅ CRITICAL FIX: Get complete user data for Socket.IO events
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    
    // Get full sender data (not just from req.user)
    const sender = await User.findById(senderId).select('name avatar avatarUrl role companyName');
    const receiver = await User.findById(receiverId).select('name avatar avatarUrl role companyName');
    
    // ✅ CRITICAL: Process complete message with full user data
    const processedMessage = {
      ...message.toObject(),
      senderId: {
        _id: sender._id,
        name: sender.name,
        avatar: sender.avatar,
        avatarUrl: sender.avatar ? `${baseUrl}/uploads/avatars/${sender.avatar}` : null,
        role: sender.role,
        companyName: sender.companyName
      },
      receiverId: {
        _id: receiver._id,
        name: receiver.name,
        avatar: receiver.avatar,
        avatarUrl: receiver.avatar ? `${baseUrl}/uploads/avatars/${receiver.avatar}` : null,
        role: receiver.role,
        companyName: receiver.companyName
      }
    };

    // ✅ CRITICAL FIX: Perfect Socket.io real-time events with COMPLETE user data structure
    const io = req.app.get('io');
    if (io) {
      console.log(`📡 [sendMessage] Emitting real-time events for conversation: ${conversation._id}`);
      
      // ✅ CRITICAL: Complete sender data structure that frontend expects
      const completeSocketEventData = {
        conversationId: conversation._id,
        message: processedMessage,
        sender: {
          _id: sender._id,
          name: sender.name,
          avatar: sender.avatar,
          avatarUrl: sender.avatar ? `${baseUrl}/uploads/avatars/${sender.avatar}` : null,
          role: sender.role,
          companyName: sender.companyName
        }
      };
      
      // ✅ FIXED: Emit to receiver with complete data
      console.log(`📤 [Socket] Emitting to receiver: user_${receiverId}`);
      io.to(`user_${receiverId}`).emit('new-message', completeSocketEventData);
      
      // ✅ FIXED: Emit to conversation room participants
      console.log(`📤 [Socket] Emitting to conversation room: conversation_${conversation._id}`);
      io.to(`conversation_${conversation._id}`).emit('conversation-updated', {
        conversationId: conversation._id,
        lastMessage: {
          content: messageType === 'text' ? content : `📎 ${messageType}`,
          timestamp: message.createdAt,
          senderId: senderId,
          messageType: messageType
        }
      });

      // ✅ ENHANCED: Emit delivery confirmation to sender
      console.log(`📤 [Socket] Emitting delivery confirmation to sender: user_${senderId}`);
      io.to(`user_${senderId}`).emit('message-delivered', {
        messageId: message._id,
        conversationId: conversation._id,
        deliveredAt: new Date(),
        status: 'delivered'
      });

      // ✅ NEW: Emit to all conversation participants for real-time sync
      conversation.participants.forEach(participant => {
        if (participant.userId.toString() !== senderId) {
          console.log(`📤 [Socket] Emitting to participant: user_${participant.userId}`);
          io.to(`user_${participant.userId}`).emit('new-message', completeSocketEventData);
        }
      });

      console.log(`✅ [Socket] All real-time events emitted successfully`);
    } else {
      console.warn(`⚠️ [sendMessage] Socket.IO not available for real-time events`);
    }

    // ✅ NEW: CREATE EMAIL NOTIFICATION FOR NEW MESSAGE
    try {
      // Create notification for new message
      await createNotification({
        recipient: receiverId,
        sender: senderId,
        type: 'new_message',
        title: `New message from ${sender.name}`,
        message: messageType === 'text' ? 
          (content.length > 100 ? content.substring(0, 100) + '...' : content) :
          `📎 ${messageType} attachment`,
        relatedData: {
          messageId: message._id,
          conversationId: conversation._id
        },
        emailPreferences: {
          immediate: true // Send email immediately
        }
      });
      
      console.log('✅ [sendMessage] Email notification created successfully');
    } catch (notificationError) {
      console.error('❌ [sendMessage] Failed to create notification:', notificationError);
      // Don't fail the message send if notification fails
    }

    console.log(`✅ [sendMessage] Message sent successfully with complete user data and email notification`);

    res.status(201).json({
      success: true,
      message: processedMessage,
      conversationId: conversation._id,
      sender: {
        _id: sender._id,
        name: sender.name,
        avatar: sender.avatar,
        avatarUrl: sender.avatar ? `${baseUrl}/uploads/avatars/${sender.avatar}` : null,
        role: sender.role
      }
    });
  } catch (error) {
    console.error('❌ [sendMessage] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending message',
      error: error.message
    });
  }
});

// ✅ CRITICAL FIX: Create or find conversation with PROFESSIONAL conversation consolidation
// @desc    Create or find conversation - ✅ ENHANCED with proper user consolidation
// @route   POST /api/messages/conversation
// @access  Private
const createOrFindConversation = asyncHandler(async (req, res) => {
  const { participantId, applicationId, jobId, type = 'direct' } = req.body;
  const userId = req.user.id;

  try {
    console.log(`💬 [createOrFindConversation] Finding conversation between ${userId} and ${participantId}`);
    console.log(`📋 [createOrFindConversation] Context: jobId=${jobId}, applicationId=${applicationId}, type=${type}`);

    // ✅ ENHANCED: Input validation with detailed logging
    if (!participantId) {
      console.error(`❌ [createOrFindConversation] Missing participantId`);
      return res.status(400).json({
        success: false,
        message: 'participantId is required',
        code: 'MISSING_PARTICIPANT_ID'
      });
    }

    if (participantId === userId) {
      console.error(`❌ [createOrFindConversation] User trying to create conversation with themselves`);
      return res.status(400).json({
        success: false,
        message: 'Cannot create conversation with yourself',
        code: 'SELF_CONVERSATION_NOT_ALLOWED'
      });
    }

    // ✅ ENHANCED: Validate ObjectIds with proper error messages
    if (!mongoose.Types.ObjectId.isValid(participantId)) {
      console.error(`❌ [createOrFindConversation] Invalid participantId format: ${participantId}`);
      return res.status(400).json({
        success: false,
        message: 'Invalid participant ID format',
        code: 'INVALID_PARTICIPANT_ID'
      });
    }

    if (jobId && !mongoose.Types.ObjectId.isValid(jobId)) {
      console.error(`❌ [createOrFindConversation] Invalid jobId format: ${jobId}`);
      return res.status(400).json({
        success: false,
        message: 'Invalid job ID format',
        code: 'INVALID_JOB_ID'
      });
    }

    if (applicationId && !mongoose.Types.ObjectId.isValid(applicationId)) {
      console.error(`❌ [createOrFindConversation] Invalid applicationId format: ${applicationId}`);
      return res.status(400).json({
        success: false,
        message: 'Invalid application ID format',
        code: 'INVALID_APPLICATION_ID'
      });
    }

    // ✅ ENHANCED: Check if participant exists
    const participant = await User.findById(participantId).select('name email role');
    if (!participant) {
      console.error(`❌ [createOrFindConversation] Participant not found: ${participantId}`);
      return res.status(404).json({
        success: false,
        message: 'Participant not found',
        code: 'PARTICIPANT_NOT_FOUND'
      });
    }

    console.log(`✅ [createOrFindConversation] Participant found: ${participant.name} (${participant.role})`);

    // ✅ CRITICAL FIX: PROFESSIONAL messaging - Find ANY existing conversation between users first
    let searchQuery = {
      $and: [
        { 'participants.userId': userId },
        { 'participants.userId': participantId },
        // ✅ CRITICAL: User hasn't archived this conversation
        { 'archivedBy.userId': { $ne: userId } }
      ]
    };

    console.log(`🔍 [createOrFindConversation] Search query:`, JSON.stringify(searchQuery, null, 2));

    // Check if conversation already exists (ANY conversation between these users)
    let conversation = await Conversation.findOne(searchQuery)
      .populate('participants.userId', 'name email avatar avatarUrl role')
      .populate('metadata.jobId', 'title category')
      .populate('metadata.applicationId', 'status proposedBudget');

    if (!conversation) {
      console.log(`📝 [createOrFindConversation] No existing conversation found, creating new one`);

      // ✅ ENHANCED: Better conversation title based on context
      let conversationTitle = `Chat with ${participant.name}`;
      let conversationType = type;

      if (jobId) {
        try {
          const job = await Job.findById(jobId).select('title');
          if (job) {
            conversationTitle = `${job.title} - Discussion`;
            conversationType = 'project';
          }
        } catch (jobError) {
          console.warn(`⚠️ [createOrFindConversation] Job fetch failed: ${jobError.message}`);
        }
      }

      // ✅ ENHANCED: Create conversation with proper error handling
      try {
        conversation = new Conversation({
          participants: [
            { userId, role: req.user.role, isActive: true },
            { userId: participantId, role: participant.role, isActive: true }
          ],
          conversationType,
          title: conversationTitle,
          metadata: { applicationId, jobId }
        });

        const savedConversation = await conversation.save();
        console.log(`✅ [createOrFindConversation] New conversation created: ${savedConversation._id}`);

        // Populate for response
        await savedConversation.populate('participants.userId', 'name email avatar avatarUrl role');
        await savedConversation.populate('metadata.jobId', 'title category');
        if (applicationId) {
          await savedConversation.populate('metadata.applicationId', 'status proposedBudget');
        }

        conversation = savedConversation;
      } catch (saveError) {
        console.error(`❌ [createOrFindConversation] Save error:`, saveError);
        return res.status(500).json({
          success: false,
          message: 'Error creating conversation',
          error: saveError.message,
          code: 'CONVERSATION_SAVE_ERROR'
        });
      }
    } else {
      console.log(`✅ [createOrFindConversation] Found existing conversation: ${conversation._id}`);
      
      // ✅ CRITICAL FIX: Update existing conversation with job context if needed
      let updated = false;
      if (jobId && !conversation.metadata?.jobId) {
        try {
          const job = await Job.findById(jobId).select('title');
          if (job) {
            conversation.title = `${job.title} - Discussion`;
            conversation.conversationType = 'project';
            conversation.metadata = { 
              ...conversation.metadata, 
              jobId: jobId
            };
            if (applicationId) {
              conversation.metadata.applicationId = applicationId;
            }
            await conversation.save();
            updated = true;
            console.log(`✅ [createOrFindConversation] Updated existing conversation with job context`);
          }
        } catch (jobError) {
          console.warn(`⚠️ [createOrFindConversation] Job context update failed: ${jobError.message}`);
        }
      }
    }

    // ✅ ENHANCED: Process conversation data with avatar URLs and null checks
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    
    let processedConversation;
    try {
      processedConversation = {
        ...conversation.toObject(),
        participants: conversation.participants.map(p => ({
          ...p,
          userId: p.userId ? processUserData(p.userId, baseUrl) : null
        })).filter(p => p.userId) // Remove null participants
      };

      console.log(`✅ [createOrFindConversation] Conversation processed successfully`);
    } catch (processError) {
      console.error(`❌ [createOrFindConversation] Processing error:`, processError);
      return res.status(500).json({
        success: false,
        message: 'Error processing conversation data',
        error: processError.message,
        code: 'CONVERSATION_PROCESS_ERROR'
      });
    }

    // ✅ ENHANCED: Success response with detailed info
    res.json({
      success: true,
      conversation: processedConversation,
      isNew: conversation.createdAt && 
             (new Date() - new Date(conversation.createdAt)) < 10000, // Created within last 10 seconds
      participantInfo: {
        id: participant._id,
        name: participant.name,
        role: participant.role
      }
    });

  } catch (error) {
    console.error('❌ [createOrFindConversation] Unexpected error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating conversation',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      code: 'UNEXPECTED_ERROR'
    });
  }
});

// ✅ CRITICAL FIX: Delete Message Function with correct schema alignment
// @desc    Delete a message
// @route   DELETE /api/messages/:messageId
// @access  Private
const deleteMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const userId = req.user.id;

  try {
    console.log(`🗑️ [deleteMessage] Deleting message: ${messageId} by user: ${userId}`);

    // ✅ CRITICAL FIX: Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      console.error(`❌ [deleteMessage] Invalid messageId format: ${messageId}`);
      return res.status(400).json({
        success: false,
        message: 'Invalid message ID format',
        code: 'INVALID_MESSAGE_ID'
      });
    }

    // Find the message
    const message = await Message.findById(messageId);
    if (!message) {
      console.error(`❌ [deleteMessage] Message not found: ${messageId}`);
      return res.status(404).json({
        success: false,
        message: 'Message not found',
        code: 'MESSAGE_NOT_FOUND'
      });
    }

    // ✅ CRITICAL FIX: Check if message is already deleted
    if (message.isDeleted) {
      console.error(`❌ [deleteMessage] Message already deleted: ${messageId}`);
      return res.status(400).json({
        success: false,
        message: 'Message is already deleted',
        code: 'ALREADY_DELETED'
      });
    }

    // ✅ CRITICAL FIX: Proper null checks for senderId
    if (!message.senderId) {
      console.error(`❌ [deleteMessage] Message has no senderId: ${messageId}`);
      return res.status(400).json({
        success: false,
        message: 'Message has no sender information',
        code: 'NO_SENDER'
      });
    }

    // Check if user is the sender (only sender can delete their own messages)
    if (message.senderId.toString() !== userId) {
      console.error(`❌ [deleteMessage] Unauthorized delete attempt by ${userId} for message ${messageId}`);
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own messages',
        code: 'UNAUTHORIZED_DELETE'
      });
    }

    // ✅ CRITICAL FIX: Proper schema alignment for deletedBy field
    message.isDeleted = true;
    message.deletedBy = {
      userId: userId,              // ✅ FIXED: userId inside deletedBy object
      deletedAt: new Date(),       // ✅ FIXED: deletedAt inside deletedBy object
      reason: 'User deleted message'
    };
    
    // Save with error handling
    const savedMessage = await message.save();
    if (!savedMessage) {
      throw new Error('Failed to save deleted message');
    }

    console.log(`✅ [deleteMessage] Message soft-deleted successfully: ${messageId}`);

    // ✅ ENHANCED: Delete associated files
    try {
      if (message.content?.file?.filename) {
        const uploadsPath = path.resolve(__dirname, '../uploads/messages');
        
        // Delete main file
        const filePath = path.join(uploadsPath, message.content.file.filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`✅ [deleteMessage] Deleted file: ${message.content.file.filename}`);
        }
        
        // Delete thumbnail if exists
        const thumbnailPath = path.join(uploadsPath, 'thumbnails', message.content.file.filename);
        if (fs.existsSync(thumbnailPath)) {
          fs.unlinkSync(thumbnailPath);
          console.log(`✅ [deleteMessage] Deleted thumbnail: ${message.content.file.filename}`);
        }
      }
    } catch (fileError) {
      console.warn(`⚠️ [deleteMessage] File deletion failed:`, fileError);
      // Don't fail the request if file deletion fails
    }

    // ✅ ENHANCED: Real-time Socket.io events with error handling
    try {
      const io = req.app.get('io');
      if (io) {
        console.log(`📡 [deleteMessage] Emitting real-time delete events`);
        
        const deleteEventData = {
          messageId: message._id,
          conversationId: message.conversationId,
          deletedBy: userId,
          deletedAt: message.deletedBy.deletedAt
        };

        // Emit to conversation room
        io.to(`conversation_${message.conversationId}`).emit('message-deleted', deleteEventData);

        // ✅ CRITICAL FIX: Null check for receiverId before emitting
        if (message.receiverId) {
          io.to(`user_${message.receiverId}`).emit('message-deleted', deleteEventData);
        }

        console.log(`✅ [deleteMessage] Real-time events emitted successfully`);
      } else {
        console.warn(`⚠️ [deleteMessage] Socket.io not available for real-time events`);
      }
    } catch (socketError) {
      console.error(`❌ [deleteMessage] Socket.io error:`, socketError);
      // Don't fail the request if socket emission fails
    }

    console.log(`✅ [deleteMessage] Message deletion completed successfully`);

    res.json({
      success: true,
      message: 'Message deleted successfully',
      messageId: message._id,
      deletedAt: message.deletedBy.deletedAt
    });

  } catch (error) {
    console.error('❌ [deleteMessage] Unexpected error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting message',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      code: 'DELETE_ERROR'
    });
  }
});

// ✅ CRITICAL FIX: COMPLETE ENHANCED FILE UPLOAD FUNCTION - PERFECT COMPATIBILITY
// @desc    Upload file for message - ENHANCED with complete form data handling and validation
// @route   POST /api/messages/upload
// @access  Private
const uploadMessageFile = asyncHandler(async (req, res) => {
  try {
    console.log('📎 [uploadMessageFile] Processing file upload with complete form data...');
    console.log('📋 [uploadMessageFile] Request body:', req.body);
    console.log('📋 [uploadMessageFile] File info:', req.file ? {
      filename: req.file.filename,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    } : 'No file');

    // ✅ CRITICAL: Validate required fields
    if (!req.file) {
      console.error('❌ [uploadMessageFile] No file uploaded');
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
        code: 'NO_FILE'
      });
    }

    // ✅ ENHANCED: Extract and validate form data (optional fields)
    const { conversationId, receiverId, messageType } = req.body;
    
    // Log received form data for debugging
    console.log('📋 [uploadMessageFile] Form data received:', {
      conversationId,
      receiverId, 
      messageType,
      hasFile: !!req.file
    });

    // ✅ OPTIONAL: Validate conversation if provided
    if (conversationId) {
      if (!mongoose.Types.ObjectId.isValid(conversationId)) {
        console.error('❌ [uploadMessageFile] Invalid conversationId format:', conversationId);
        return res.status(400).json({
          success: false,
          message: 'Invalid conversation ID format',
          code: 'INVALID_CONVERSATION_ID'
        });
      }

      // Verify conversation exists and user has access
      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        console.error('❌ [uploadMessageFile] Conversation not found:', conversationId);
        return res.status(404).json({
          success: false,
          message: 'Conversation not found',
          code: 'CONVERSATION_NOT_FOUND'
        });
      }

      // Check if user is participant
      const isParticipant = conversation.participants.some(p => 
        p.userId.toString() === req.user.id && p.isActive
      );

      if (!isParticipant) {
        console.error('❌ [uploadMessageFile] User not participant in conversation:', req.user.id);
        return res.status(403).json({
          success: false,
          message: 'Access denied - not a participant in this conversation',
          code: 'NOT_PARTICIPANT'
        });
      }

      console.log('✅ [uploadMessageFile] Conversation validated successfully');
    }

    // ✅ OPTIONAL: Validate receiver if provided  
    if (receiverId) {
      if (!mongoose.Types.ObjectId.isValid(receiverId)) {
        console.error('❌ [uploadMessageFile] Invalid receiverId format:', receiverId);
        return res.status(400).json({
          success: false,
          message: 'Invalid receiver ID format',
          code: 'INVALID_RECEIVER_ID'
        });
      }

      const receiver = await User.findById(receiverId);
      if (!receiver) {
        console.error('❌ [uploadMessageFile] Receiver not found:', receiverId);
        return res.status(404).json({
          success: false,
          message: 'Receiver not found',
          code: 'RECEIVER_NOT_FOUND'
        });
      }

      console.log('✅ [uploadMessageFile] Receiver validated successfully:', receiver.name);
    }

    // ✅ ENHANCED: Validate file type and size
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

    if (!allowedTypes.includes(req.file.mimetype)) {
      console.error('❌ [uploadMessageFile] Invalid file type:', req.file.mimetype);
      
      // Delete the uploaded file
      const filePath = path.join(__dirname, '../uploads/messages', req.file.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log('🗑️ [uploadMessageFile] Deleted invalid file:', req.file.filename);
      }

      return res.status(400).json({
        success: false,
        message: 'Invalid file type. Only images, documents, archives, and media files are allowed.',
        code: 'INVALID_FILE_TYPE',
        allowedTypes
      });
    }

    // ✅ ENHANCED: File size validation (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (req.file.size > maxSize) {
      console.error('❌ [uploadMessageFile] File too large:', req.file.size);
      
      // Delete the uploaded file
      const filePath = path.join(__dirname, '../uploads/messages', req.file.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log('🗑️ [uploadMessageFile] Deleted oversized file:', req.file.filename);
      }

      return res.status(400).json({
        success: false,
        message: `File too large. Maximum size is ${maxSize / 1024 / 1024}MB.`,
        code: 'FILE_TOO_LARGE',
        maxSize,
        fileSize: req.file.size
      });
    }

    // ✅ ENHANCED: Build comprehensive file data
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const fileData = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      url: `/uploads/messages/${req.file.filename}`,
      fullUrl: `${baseUrl}/uploads/messages/${req.file.filename}`,
      uploadedAt: new Date(),
      uploadedBy: req.user.id
    };

    // ✅ ENHANCED: Generate thumbnail for images
    if (req.file.mimetype.startsWith('image/')) {
      try {
        const thumbnailsDir = path.join(__dirname, '../uploads/messages/thumbnails');
        
        // Ensure thumbnails directory exists
        if (!fs.existsSync(thumbnailsDir)) {
          fs.mkdirSync(thumbnailsDir, { recursive: true });
          console.log('📁 [uploadMessageFile] Created thumbnails directory');
        }

        // For now, just reference the thumbnail (actual generation would need sharp or similar)
        fileData.thumbnail = `${baseUrl}/uploads/messages/thumbnails/${req.file.filename}`;
        fileData.hasPreview = true;
        fileData.isImage = true;
        
        console.log('🖼️ [uploadMessageFile] Image file processed with thumbnail reference');
      } catch (thumbnailError) {
        console.warn('⚠️ [uploadMessageFile] Thumbnail generation failed:', thumbnailError);
        // Don't fail the upload if thumbnail fails
      }
    } else {
      fileData.isImage = false;
      fileData.hasPreview = false;
    }

    // ✅ ENHANCED: Determine message type if not provided
    let finalMessageType = messageType;
    if (!finalMessageType) {
      finalMessageType = req.file.mimetype.startsWith('image/') ? 'image' : 'file';
      console.log('🔍 [uploadMessageFile] Auto-determined message type:', finalMessageType);
    }

    // ✅ ENHANCED: Add context data if available
    const responseData = {
      success: true,
      message: 'File uploaded successfully',
      fileData,
      context: {
        conversationId: conversationId || null,
        receiverId: receiverId || null,
        messageType: finalMessageType,
        uploadedBy: {
          id: req.user.id,
          name: req.user.name,
          role: req.user.role
        }
      }
    };

    console.log('✅ [uploadMessageFile] File upload completed successfully:', {
      filename: req.file.filename,
      size: req.file.size,
      type: finalMessageType
    });

    res.json(responseData);

  } catch (error) {
    console.error('❌ [uploadMessageFile] Unexpected error:', error);
    
    // Cleanup uploaded file on error
    if (req.file) {
      try {
        const filePath = path.join(__dirname, '../uploads/messages', req.file.filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log('🗑️ [uploadMessageFile] Cleaned up file after error:', req.file.filename);
        }
      } catch (cleanupError) {
        console.error('❌ [uploadMessageFile] Cleanup error:', cleanupError);
      }
    }

    res.status(500).json({
      success: false,
      message: 'Error uploading file',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      code: 'UPLOAD_ERROR'
    });
  }
});

// @desc    Mark messages as read
// @route   PUT /api/messages/read/:conversationId
// @access  Private
const markMessagesAsRead = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const userId = req.user.id;

  try {
    console.log(`👁️ [markMessagesAsRead] Marking messages as read for conversation: ${conversationId}`);

    const result = await Message.updateMany(
      {
        conversationId,
        receiverId: userId,
        'readBy.userId': { $ne: userId }
      },
      {
        $push: {
          readBy: {
            userId: userId,
            readAt: new Date()
          }
        }
      }
    );

    // ✅ ENHANCED: Emit read receipts via Socket.IO
    const io = req.app.get('io');
    if (io && result.modifiedCount > 0) {
      console.log(`📡 [markMessagesAsRead] Emitting read receipts for ${result.modifiedCount} messages`);
      
      // Get the messages that were marked as read
      const readMessages = await Message.find({
        conversationId,
        receiverId: userId,
        'readBy.userId': userId
      }).select('_id senderId');

      // Emit read receipt to each sender
      readMessages.forEach(msg => {
        if (msg.senderId.toString() !== userId) {
          io.to(`user_${msg.senderId}`).emit('message-read', {
            messageId: msg._id,
            conversationId: conversationId,
            readBy: userId,
            readAt: new Date(),
            status: 'read'
          });
        }
      });
    }

    console.log(`✅ [markMessagesAsRead] Marked ${result.modifiedCount} messages as read`);

    res.json({
      success: true,
      message: 'Messages marked as read',
      markedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('❌ [markMessagesAsRead] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking messages as read',
      error: error.message
    });
  }
});

// @desc    Search messages - ✅ ENHANCED with better context
// @route   GET /api/messages/search
// @access  Private
const searchMessages = asyncHandler(async (req, res) => {
  const { query, conversationId, page = 1, limit = 20 } = req.query;
  const userId = req.user.id;

  try {
    console.log(`🔍 [searchMessages] Searching messages for: "${query}"`);

    const searchFilter = {
      $and: [
        {
          $or: [
            { senderId: userId },
            { receiverId: userId }
          ]
        },
        {
          'content.text': { $regex: query, $options: 'i' }
        },
        { isDeleted: false }
      ]
    };

    if (conversationId) {
      searchFilter.$and.push({ conversationId });
    }

    const messages = await Message.find(searchFilter)
      .populate({
        path: 'senderId',
        select: 'name avatar avatarUrl'
      })
      .populate({
        path: 'receiverId',
        select: 'name avatar avatarUrl'
      })
      .populate({
        path: 'conversationId',
        select: 'title participants metadata',
        populate: {
          path: 'metadata.jobId',
          select: 'title'
        }
      })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();

    const totalResults = await Message.countDocuments(searchFilter);

    // ✅ ENHANCED: Process search results with avatar URLs
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const processedMessages = messages.map(message => ({
      ...message,
      senderId: processUserData(message.senderId, baseUrl),
      receiverId: processUserData(message.receiverId, baseUrl)
    }));

    console.log(`✅ [searchMessages] Found ${processedMessages.length} messages`);

    res.json({
      success: true,
      messages: processedMessages,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalResults / parseInt(limit)),
        totalResults,
        hasMore: page * limit < totalResults
      }
    });
  } catch (error) {
    console.error('❌ [searchMessages] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching messages',
      error: error.message
    });
  }
});

// ✅ NEW: Get unread message count
// @desc    Get unread message count for user
// @route   GET /api/messages/unread-count
// @access  Private
const getUnreadCount = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  try {
    console.log(`🔔 [getUnreadCount] Getting unread count for user: ${userId}`);

    const unreadCount = await Message.countDocuments({
      receiverId: userId,
      'readBy.userId': { $ne: userId },
      isDeleted: false
    });

    console.log(`✅ [getUnreadCount] Found ${unreadCount} unread messages`);

    res.json({
      success: true,
      unreadCount
    });
  } catch (error) {
    console.error('❌ [getUnreadCount] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting unread count',
      error: error.message
    });
  }
});

// ✅ CRITICAL FIX: Delete conversation - USER-SPECIFIC ARCHIVING (Professional Approach)
// @desc    Delete conversation for specific user - PROFESSIONAL APPROACH
// @route   DELETE /api/messages/conversation/:conversationId
// @access  Private
const deleteConversation = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const userId = req.user.id;

  try {
    console.log(`🗑️ [deleteConversation] DELETING conversation: ${conversationId} for user: ${userId}`);

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

    // ✅ CRITICAL FIX: PROFESSIONAL APPROACH - User-specific archiving (which acts like deletion for that user)
    const alreadyArchived = conversation.archivedBy?.some(a => 
      a.userId.toString() === userId
    );

    if (!alreadyArchived) {
      if (!conversation.archivedBy) {
        conversation.archivedBy = [];
      }
      
      conversation.archivedBy.push({
        userId: userId,
        archivedAt: new Date()
      });
      
      // ✅ CRITICAL: Check if all participants have archived
      const activeParticipants = conversation.participants.filter(p => p.isActive);
      if (conversation.archivedBy.length >= activeParticipants.length) {
        conversation.isArchived = true; // Mark globally archived
      }
      
      await conversation.save();
    }

    // ✅ ENHANCED: Real-time Socket.io events
    const io = req.app.get('io');
    if (io) {
      console.log(`📡 [deleteConversation] Emitting real-time delete events`);
      
      const deleteEventData = {
        conversationId: conversation._id,
        deletedBy: userId,
        deletedAt: new Date()
      };

      // Emit to user who deleted
      io.to(`user_${userId}`).emit('conversation-deleted', deleteEventData);
      
      // Emit to conversation room
      io.to(`conversation_${conversationId}`).emit('conversation-deleted', deleteEventData);

      console.log(`✅ [deleteConversation] Real-time events emitted successfully`);
    }

    console.log(`✅ [deleteConversation] Conversation DELETED successfully for user: ${userId}`);

    res.json({
      success: true,
      message: 'Conversation deleted successfully',
      deletedAt: new Date()
    });
  } catch (error) {
    console.error('❌ [deleteConversation] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting conversation',
      error: error.message
    });
  }
});

module.exports = {
  getConversations,
  getMessages,
  sendMessage,              // ✅ ENHANCED: Now includes EMAIL NOTIFICATIONS
  uploadMessageFile,        // ✅ CRITICAL FIX: COMPLETELY ENHANCED with full form data handling
  markMessagesAsRead,       // ✅ ENHANCED: Now includes read receipt Socket.IO events
  searchMessages,
  createOrFindConversation,
  getUnreadCount,
  deleteConversation,       // ✅ FIXED: Now uses user-specific archiving (professional approach)
  deleteMessage             // ✅ FIXED: Schema-aligned delete message function
};
