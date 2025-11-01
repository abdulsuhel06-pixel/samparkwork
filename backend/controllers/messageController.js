// ✅ NOTIFICATION IMPORT - FIXED INTEGRATION
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
const sharp = require('sharp');

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

// Generate file URLs for message attachments
const generateFileUrl = (filePath, baseUrl) => {
  if (!filePath) return null;
  if (filePath.startsWith('http')) return filePath;
  return `${baseUrl}/uploads/messages/${filePath}`;
};

// ✅ FIXED: WhatsApp-style conversation ordering with latest message timestamp
const getConversations = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const baseUrl = `${req.protocol}://${req.get('host')}`;

  try {
    console.log('📋 [getConversations] Fetching conversations for user:', userId);

    // ✅ NEW: Get conversations with latest message sorting
    const conversations = await Conversation.aggregate([
      {
        $match: {
          participants: {
            $elemMatch: {
              userId: new mongoose.Types.ObjectId(userId),
              isActive: true
            }
          },
          isDeleted: false
        }
      },
      {
        $lookup: {
          from: 'messages',
          localField: '_id',
          foreignField: 'conversationId',
          as: 'messages',
          pipeline: [
            { $match: { isDeleted: false } },
            { $sort: { createdAt: -1 } },
            { $limit: 1 }
          ]
        }
      },
      {
        $addFields: {
          lastMessage: { $arrayElemAt: ['$messages', 0] },
          lastMessageTime: { 
            $ifNull: [
              { $arrayElemAt: ['$messages.createdAt', 0] },
              '$createdAt'
            ]
          }
        }
      },
      {
        $sort: { lastMessageTime: -1 } // ✅ FIXED: WhatsApp-style sorting by latest message
      },
      {
        $lookup: {
          from: 'users',
          localField: 'participants.userId',
          foreignField: '_id',
          as: 'participantUsers'
        }
      },
      {
        $lookup: {
          from: 'jobs',
          localField: 'relatedData.jobId',
          foreignField: '_id',
          as: 'jobData'
        }
      },
      {
        $lookup: {
          from: 'applications',
          localField: 'relatedData.applicationId',
          foreignField: '_id',
          as: 'applicationData'
        }
      }
    ]);

    // Process conversations with proper user data
    const processedConversations = conversations.map(conversation => {
      const otherParticipant = conversation.participantUsers.find(p => 
        p._id.toString() !== userId
      );

      return {
        ...conversation,
        otherParticipant: processUserData(otherParticipant, baseUrl),
        jobData: conversation.jobData[0] || null,
        applicationData: conversation.applicationData[0] || null,
        unreadCount: conversation.participants.find(p => 
          p.userId.toString() === userId
        )?.unreadCount || 0
      };
    });

    console.log(`✅ [getConversations] Found ${processedConversations.length} conversations`);

    res.json({
      success: true,
      conversations: processedConversations
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

// ✅ ENHANCED: Get messages with proper pagination and context
const getMessages = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const userId = req.user.id;
  const { page = 1, limit = 50 } = req.query;
  const baseUrl = `${req.protocol}://${req.get('host')}`;

  try {
    console.log('💬 [getMessages] Fetching messages for conversation:', conversationId);

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
        message: 'Access denied - you are not a participant in this conversation'
      });
    }

    // Get messages with pagination
    const messages = await Message.find({
      conversationId,
      isDeleted: false
    })
    .populate('senderId', 'name email avatar')
    .populate('receiverId', 'name email avatar')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

    // Process messages with avatar URLs and file URLs
    const processedMessages = messages.map(message => {
      const messageObj = message.toObject();
      
      // Process attachments with proper URLs
      if (messageObj.attachments && messageObj.attachments.length > 0) {
        messageObj.attachments = messageObj.attachments.map(attachment => ({
          ...attachment,
          url: generateFileUrl(attachment.filePath, baseUrl),
          thumbnailUrl: attachment.thumbnailPath ? 
            generateFileUrl(attachment.thumbnailPath, baseUrl) : null
        }));
      }

      return {
        ...messageObj,
        senderId: processUserData(messageObj.senderId, baseUrl),
        receiverId: processUserData(messageObj.receiverId, baseUrl)
      };
    }).reverse(); // Reverse to show oldest first in UI

    // Mark messages as read
    await Message.updateMany(
      {
        conversationId,
        receiverId: userId,
        read: false
      },
      {
        read: true,
        readAt: new Date()
      }
    );

    // Update conversation unread count
    await Conversation.updateOne(
      { 
        _id: conversationId,
        'participants.userId': userId 
      },
      {
        $set: { 'participants.$.unreadCount': 0 }
      }
    );

    // Emit socket event for read status update
    const io = req.app.get('io');
    if (io) {
      io.to(`conversation_${conversationId}`).emit('messages-read', {
        conversationId,
        readBy: userId,
        readAt: new Date()
      });
    }

    console.log(`✅ [getMessages] Found ${processedMessages.length} messages`);

    res.json({
      success: true,
      messages: processedMessages,
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

// ✅ ENHANCED: Send message with proper email notifications
const sendMessage = asyncHandler(async (req, res) => {
  const senderId = req.user.id;
  const {
    conversationId,
    receiverId,
    content,
    messageType = 'text',
    attachments = [],
    jobId,
    applicationId
  } = req.body;

  try {
    console.log('📨 [sendMessage] Sending message:', { conversationId, receiverId, messageType });

    let conversation;

    if (conversationId) {
      conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        return res.status(404).json({
          success: false,
          message: 'Conversation not found'
        });
      }
    } else if (receiverId) {
      // Create or find conversation
      conversation = await Conversation.findOne({
        participants: {
          $all: [
            { $elemMatch: { userId: senderId, isActive: true } },
            { $elemMatch: { userId: receiverId, isActive: true } }
          ]
        },
        isDeleted: false
      });

      if (!conversation) {
        conversation = await Conversation.create({
          participants: [
            { userId: senderId, isActive: true },
            { userId: receiverId, isActive: true }
          ],
          relatedData: {
            jobId: jobId || null,
            applicationId: applicationId || null
          }
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        message: 'conversationId or receiverId is required'
      });
    }

    // Determine receiver ID if not provided
    const finalReceiverId = receiverId || conversation.participants.find(p => 
      p.userId.toString() !== senderId
    ).userId;

    // Create message
    const message = await Message.create({
      conversationId: conversation._id,
      senderId,
      receiverId: finalReceiverId,
      content,
      messageType,
      attachments,
      relatedData: {
        jobId: jobId || conversation.relatedData?.jobId,
        applicationId: applicationId || conversation.relatedData?.applicationId
      }
    });

    // Update conversation
    await Conversation.findByIdAndUpdate(conversation._id, {
      lastMessage: message._id,
      updatedAt: new Date(),
      $inc: {
        'participants.$[participant].unreadCount': 1
      }
    }, {
      arrayFilters: [
        { 'participant.userId': { $ne: new mongoose.Types.ObjectId(senderId) } }
      ]
    });

    // Populate message data
    await message.populate([
      { path: 'senderId', select: 'name email avatar' },
      { path: 'receiverId', select: 'name email avatar' }
    ]);

    // ✅ NEW: Create notification with email integration
    try {
      await createNotification({
        recipient: message.receiverId._id,
        sender: senderId,
        type: 'new_message',
        title: 'New Message',
        message: `${message.senderId.name} sent you a message: ${content.length > 50 ? content.substring(0, 50) + '...' : content}`,
        relatedData: {
          conversationId: conversation._id,
          messageId: message._id,
          jobId: jobId || conversation.relatedData?.jobId,
          applicationId: applicationId || conversation.relatedData?.applicationId
        },
        emailPreferences: { immediate: true } // ✅ Enable immediate email
      });
    } catch (notificationError) {
      console.error('❌ [sendMessage] Notification error:', notificationError);
      // Don't fail the message send if notification fails
    }

    // Socket.IO real-time update
    const io = req.app.get('io');
    if (io) {
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const processedMessage = {
        ...message.toObject(),
        senderId: processUserData(message.senderId, baseUrl),
        receiverId: processUserData(message.receiverId, baseUrl)
      };

      io.to(`conversation_${conversation._id}`).emit('new-message', {
        message: processedMessage,
        conversation: {
          _id: conversation._id,
          lastMessage: processedMessage,
          updatedAt: new Date()
        }
      });

      // Update receiver's conversation list
      io.to(`user_${message.receiverId._id}`).emit('conversation-updated', {
        conversationId: conversation._id,
        lastMessage: processedMessage,
        unreadCount: 1 // Increment unread count
      });
    }

    console.log('✅ [sendMessage] Message sent successfully');

    res.status(201).json({
      success: true,
      message,
      conversationId: conversation._id
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

// ✅ ENHANCED: Upload message file with thumbnail generation
const uploadMessageFile = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const baseUrl = `${req.protocol}://${req.get('host')}`;

  try {
    console.log('📁 [uploadMessageFile] Processing file upload for user:', userId);

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
        code: 'NO_FILE'
      });
    }

    const file = req.file;
    const fileInfo = {
      originalName: file.originalname,
      fileName: file.filename,
      filePath: file.filename,
      fileSize: file.size,
      mimeType: file.mimetype,
      uploadedBy: userId,
      uploadedAt: new Date()
    };

    // Generate thumbnail for images
    let thumbnailPath = null;
    if (file.mimetype.startsWith('image/')) {
      try {
        const thumbnailFileName = `thumb_${file.filename}`;
        const thumbnailFilePath = path.join('uploads/messages/thumbnails', thumbnailFileName);
        
        await sharp(file.path)
          .resize(200, 200, { 
            fit: 'inside',
            withoutEnlargement: true 
          })
          .jpeg({ quality: 80 })
          .toFile(thumbnailFilePath);
        
        thumbnailPath = `thumbnails/${thumbnailFileName}`;
        fileInfo.thumbnailPath = thumbnailPath;
        
        console.log('🖼️ [uploadMessageFile] Thumbnail generated:', thumbnailFileName);
      } catch (thumbnailError) {
        console.error('❌ [uploadMessageFile] Thumbnail generation error:', thumbnailError);
        // Continue without thumbnail if generation fails
      }
    }

    // Generate URLs
    fileInfo.url = generateFileUrl(fileInfo.filePath, baseUrl);
    if (thumbnailPath) {
      fileInfo.thumbnailUrl = generateFileUrl(thumbnailPath, baseUrl);
    }

    console.log('✅ [uploadMessageFile] File uploaded successfully:', fileInfo.fileName);

    res.json({
      success: true,
      file: fileInfo,
      message: 'File uploaded successfully'
    });

  } catch (error) {
    console.error('❌ [uploadMessageFile] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading file',
      error: error.message,
      code: 'UPLOAD_ERROR'
    });
  }
});

// ✅ ENHANCED: Mark messages as read with real-time updates
const markMessagesAsRead = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const userId = req.user.id;

  try {
    console.log('👁️ [markMessagesAsRead] Marking messages as read:', { conversationId, userId });

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

    // Mark messages as read
    const result = await Message.updateMany(
      {
        conversationId,
        receiverId: userId,
        read: false
      },
      {
        read: true,
        readAt: new Date()
      }
    );

    // Update conversation unread count
    await Conversation.updateOne(
      { 
        _id: conversationId,
        'participants.userId': userId 
      },
      {
        $set: { 'participants.$.unreadCount': 0 }
      }
    );

    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.to(`conversation_${conversationId}`).emit('messages-read', {
        conversationId,
        readBy: userId,
        readAt: new Date(),
        markedCount: result.modifiedCount
      });
    }

    console.log(`✅ [markMessagesAsRead] Marked ${result.modifiedCount} messages as read`);

    res.json({
      success: true,
      message: `${result.modifiedCount} messages marked as read`,
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

// ✅ ENHANCED: Search messages with advanced filters
const searchMessages = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { 
    query, 
    conversationId, 
    messageType, 
    dateFrom, 
    dateTo,
    page = 1,
    limit = 20 
  } = req.query;
  const baseUrl = `${req.protocol}://${req.get('host')}`;

  try {
    console.log('🔍 [searchMessages] Searching messages for user:', userId);

    // Build search criteria
    const searchCriteria = {
      isDeleted: false,
      $or: [
        { senderId: userId },
        { receiverId: userId }
      ]
    };

    if (query) {
      searchCriteria.content = { $regex: query, $options: 'i' };
    }

    if (conversationId) {
      searchCriteria.conversationId = conversationId;
    }

    if (messageType) {
      searchCriteria.messageType = messageType;
    }

    if (dateFrom || dateTo) {
      searchCriteria.createdAt = {};
      if (dateFrom) searchCriteria.createdAt.$gte = new Date(dateFrom);
      if (dateTo) searchCriteria.createdAt.$lte = new Date(dateTo);
    }

    // Execute search
    const messages = await Message.find(searchCriteria)
      .populate('senderId', 'name email avatar')
      .populate('receiverId', 'name email avatar')
      .populate('conversationId', 'participants')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Process messages with URLs
    const processedMessages = messages.map(message => {
      const messageObj = message.toObject();
      
      // Process attachments
      if (messageObj.attachments && messageObj.attachments.length > 0) {
        messageObj.attachments = messageObj.attachments.map(attachment => ({
          ...attachment,
          url: generateFileUrl(attachment.filePath, baseUrl),
          thumbnailUrl: attachment.thumbnailPath ? 
            generateFileUrl(attachment.thumbnailPath, baseUrl) : null
        }));
      }

      return {
        ...messageObj,
        senderId: processUserData(messageObj.senderId, baseUrl),
        receiverId: processUserData(messageObj.receiverId, baseUrl)
      };
    });

    // Get total count for pagination
    const totalCount = await Message.countDocuments(searchCriteria);

    console.log(`✅ [searchMessages] Found ${processedMessages.length} messages`);

    res.json({
      success: true,
      messages: processedMessages,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        hasMore: page * limit < totalCount
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

// ✅ ENHANCED: Create or find conversation with job context
const createOrFindConversation = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { 
    participantId,
    jobId,
    applicationId,
    initialMessage 
  } = req.body;

  try {
    console.log('🔍 [createOrFindConversation] Finding/creating conversation:', {
      userId, participantId, jobId, applicationId
    });

    if (!participantId) {
      return res.status(400).json({
        success: false,
        message: 'participantId is required'
      });
    }

    if (participantId === userId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot create conversation with yourself'
      });
    }

    // Check if conversation already exists
    let conversation = await Conversation.findOne({
      participants: {
        $all: [
          { $elemMatch: { userId, isActive: true } },
          { $elemMatch: { userId: participantId, isActive: true } }
        ]
      },
      isDeleted: false
    }).populate('participants.userId', 'name email avatar');

    if (!conversation) {
      // Create new conversation
      conversation = await Conversation.create({
        participants: [
          { userId, isActive: true },
          { userId: participantId, isActive: true }
        ],
        relatedData: {
          jobId: jobId || null,
          applicationId: applicationId || null
        }
      });

      await conversation.populate('participants.userId', 'name email avatar');
    }

    // Send initial message if provided
    if (initialMessage && initialMessage.trim()) {
      const message = await Message.create({
        conversationId: conversation._id,
        senderId: userId,
        receiverId: participantId,
        content: initialMessage,
        messageType: 'text',
        relatedData: {
          jobId: jobId || null,
          applicationId: applicationId || null
        }
      });

      // Update conversation with initial message
      conversation.lastMessage = message._id;
      await conversation.save();

      // Create notification for initial message
      try {
        await createNotification({
          recipient: participantId,
          sender: userId,
          type: 'new_message',
          title: 'New Conversation',
          message: `New message: ${initialMessage.length > 50 ? initialMessage.substring(0, 50) + '...' : initialMessage}`,
          relatedData: {
            conversationId: conversation._id,
            messageId: message._id,
            jobId,
            applicationId
          },
          emailPreferences: { immediate: true }
        });
      } catch (notificationError) {
        console.error('❌ [createOrFindConversation] Notification error:', notificationError);
      }

      // Emit real-time update for initial message
      const io = req.app.get('io');
      if (io) {
        io.to(`user_${participantId}`).emit('new-conversation', {
          conversation: conversation._id,
          message: message
        });
      }
    }

    console.log('✅ [createOrFindConversation] Conversation ready');

    res.json({
      success: true,
      conversation: {
        _id: conversation._id,
        participants: conversation.participants,
        relatedData: conversation.relatedData,
        createdAt: conversation.createdAt
      }
    });

  } catch (error) {
    console.error('❌ [createOrFindConversation] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating/finding conversation',
      error: error.message
    });
  }
});

// ✅ ENHANCED: Get unread count for notification bell
const getUnreadCount = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  try {
    // Get unread message count from all conversations
    const conversations = await Conversation.find({
      participants: {
        $elemMatch: {
          userId,
          isActive: true
        }
      },
      isDeleted: false
    });

    let totalUnreadCount = 0;
    conversations.forEach(conversation => {
      const participant = conversation.participants.find(p => 
        p.userId.toString() === userId
      );
      if (participant) {
        totalUnreadCount += participant.unreadCount || 0;
      }
    });

    res.json({
      success: true,
      unreadCount: totalUnreadCount
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

// ✅ ENHANCED: Delete conversation with proper cleanup
const deleteConversation = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const userId = req.user.id;

  try {
    console.log('🗑️ [deleteConversation] Deleting conversation:', conversationId);

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

    // Mark conversation as deleted for this user
    await Conversation.updateOne(
      { 
        _id: conversationId,
        'participants.userId': userId 
      },
      {
        $set: { 
          'participants.$.isActive': false,
          'participants.$.deletedAt': new Date()
        }
      }
    );

    // Check if all participants have deleted the conversation
    const updatedConversation = await Conversation.findById(conversationId);
    const activeParticipants = updatedConversation.participants.filter(p => p.isActive);
    
    if (activeParticipants.length === 0) {
      // Mark conversation and all messages as deleted
      await Conversation.updateOne(
        { _id: conversationId },
        { 
          isDeleted: true,
          deletedAt: new Date()
        }
      );

      await Message.updateMany(
        { conversationId },
        { 
          isDeleted: true,
          deletedAt: new Date()
        }
      );
    }

    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.to(`conversation_${conversationId}`).emit('conversation-deleted', {
        conversationId,
        deletedBy: userId,
        deletedAt: new Date()
      });
    }

    console.log('✅ [deleteConversation] Conversation deleted successfully');

    res.json({
      success: true,
      message: 'Conversation deleted successfully'
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

// ✅ ENHANCED: Delete message with real-time updates
const deleteMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const userId = req.user.id;

  try {
    console.log('🗑️ [deleteMessage] Deleting message:', messageId);

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Check if user is sender or receiver
    if (message.senderId.toString() !== userId && message.receiverId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied - you can only delete your own messages'
      });
    }

    // Mark message as deleted
    message.isDeleted = true;
    message.deletedAt = new Date();
    message.deletedBy = userId;
    await message.save();

    // Update conversation's last message if this was the last one
    const conversation = await Conversation.findById(message.conversationId);
    if (conversation && conversation.lastMessage && 
        conversation.lastMessage.toString() === messageId) {
      
      // Find the new last message
      const lastMessage = await Message.findOne({
        conversationId: message.conversationId,
        isDeleted: false
      }).sort({ createdAt: -1 });

      conversation.lastMessage = lastMessage ? lastMessage._id : null;
      await conversation.save();
    }

    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.to(`conversation_${message.conversationId}`).emit('message-deleted', {
        messageId,
        conversationId: message.conversationId,
        deletedBy: userId,
        deletedAt: new Date()
      });
    }

    console.log('✅ [deleteMessage] Message deleted successfully');

    res.json({
      success: true,
      message: 'Message deleted successfully'
    });

  } catch (error) {
    console.error('❌ [deleteMessage] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting message',
      error: error.message
    });
  }
});

module.exports = {
  getConversations,
  getMessages,
  sendMessage,
  uploadMessageFile,
  markMessagesAsRead,
  searchMessages,
  createOrFindConversation,
  getUnreadCount,
  deleteConversation,
  deleteMessage
};
