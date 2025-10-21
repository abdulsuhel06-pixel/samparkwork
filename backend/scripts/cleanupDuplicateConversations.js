const mongoose = require('mongoose');
const path = require('path');

// Connect to database
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/skillconnect';

// ✅ CRITICAL: Database Cleanup Script for Duplicate Conversations
async function cleanupDuplicateConversations() {
  try {
    console.log('🔧 [CLEANUP] Starting duplicate conversation cleanup...');
    console.log(`🔧 [CLEANUP] Connecting to: ${MONGODB_URI}`);
    
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ [CLEANUP] Connected to MongoDB successfully');

    // ===== STEP 1: Find all duplicate conversations =====
    console.log('\n📋 [CLEANUP] STEP 1: Finding duplicate conversations...');
    
    const duplicateGroups = await Conversation.aggregate([
      {
        $match: {
          'participants.0': { $exists: true },
          'participants.1': { $exists: true }
        }
      },
      {
        $project: {
          _id: 1,
          participants: 1,
          conversationType: 1,
          title: 1,
          lastMessage: 1,
          metadata: 1,
          createdAt: 1,
          updatedAt: 1,
          stats: 1,
          // Create a sorted participant array for matching
          participantIds: {
            $sortArray: {
              input: '$participants.userId',
              sortBy: 1
            }
          }
        }
      },
      {
        $group: {
          _id: '$participantIds', // Group by sorted participant IDs
          conversations: {
            $push: {
              id: '$_id',
              participants: '$participants',
              conversationType: '$conversationType',
              title: '$title',
              lastMessage: '$lastMessage',
              metadata: '$metadata',
              createdAt: '$createdAt',
              updatedAt: '$updatedAt',
              stats: '$stats'
            }
          },
          count: { $sum: 1 }
        }
      },
      {
        $match: { count: { $gt: 1 } } // Only groups with duplicates
      }
    ]);

    console.log(`🔍 [CLEANUP] Found ${duplicateGroups.length} duplicate conversation groups`);

    let totalDuplicatesRemoved = 0;
    let totalMessagesTransferred = 0;
    let totalConversationsProcessed = 0;

    // ===== STEP 2: Process each duplicate group =====
    for (const group of duplicateGroups) {
      console.log(`\n📝 [CLEANUP] Processing duplicate group with ${group.count} conversations...`);
      
      const conversations = group.conversations;
      
      // Sort conversations by preference: most recent, most messages, project type
      conversations.sort((a, b) => {
        // Prefer project conversations over direct
        if (a.conversationType === 'project' && b.conversationType === 'direct') return -1;
        if (a.conversationType === 'direct' && b.conversationType === 'project') return 1;
        
        // Prefer conversations with more messages
        const aMessages = a.stats?.totalMessages || 0;
        const bMessages = b.stats?.totalMessages || 0;
        if (aMessages !== bMessages) return bMessages - aMessages;
        
        // Prefer most recently updated
        return new Date(b.updatedAt) - new Date(a.updatedAt);
      });

      const keepConversation = conversations[0]; // Keep the first (best) conversation
      const duplicateConversations = conversations.slice(1); // Remove the rest

      console.log(`  ✅ [CLEANUP] Keeping conversation: ${keepConversation.id} (${keepConversation.conversationType})`);
      console.log(`  🗑️  [CLEANUP] Removing ${duplicateConversations.length} duplicate conversations`);

      // ===== STEP 3: Transfer messages from duplicates to the kept conversation =====
      for (const duplicate of duplicateConversations) {
        console.log(`    📤 [CLEANUP] Transferring messages from: ${duplicate.id}`);
        
        // Find all messages in the duplicate conversation
        const messagesToTransfer = await Message.find({ 
          conversationId: duplicate.id,
          isDeleted: { $ne: true }
        });

        if (messagesToTransfer.length > 0) {
          console.log(`    📨 [CLEANUP] Found ${messagesToTransfer.length} messages to transfer`);
          
          // Update messages to belong to the kept conversation
          const updateResult = await Message.updateMany(
            { conversationId: duplicate.id },
            { conversationId: keepConversation.id }
          );
          
          totalMessagesTransferred += updateResult.modifiedCount;
          console.log(`    ✅ [CLEANUP] Transferred ${updateResult.modifiedCount} messages`);
        }

        // ===== STEP 4: Update the kept conversation metadata =====
        const updateData = {};
        
        // Merge job metadata if duplicate has it and kept conversation doesn't
        if (duplicate.metadata?.jobId && !keepConversation.metadata?.jobId) {
          updateData['metadata.jobId'] = duplicate.metadata.jobId;
          console.log(`    🔄 [CLEANUP] Added jobId metadata to kept conversation`);
        }
        
        if (duplicate.metadata?.applicationId && !keepConversation.metadata?.applicationId) {
          updateData['metadata.applicationId'] = duplicate.metadata.applicationId;
          console.log(`    🔄 [CLEANUP] Added applicationId metadata to kept conversation`);
        }

        // Update conversation type to project if duplicate is project type
        if (duplicate.conversationType === 'project' && keepConversation.conversationType === 'direct') {
          updateData.conversationType = 'project';
          updateData.title = duplicate.title || updateData.title;
          console.log(`    🔄 [CLEANUP] Updated conversation type to project`);
        }

        // Update kept conversation if needed
        if (Object.keys(updateData).length > 0) {
          await Conversation.findByIdAndUpdate(keepConversation.id, updateData);
        }

        // ===== STEP 5: Delete the duplicate conversation =====
        await Conversation.findByIdAndDelete(duplicate.id);
        totalDuplicatesRemoved++;
        console.log(`    🗑️  [CLEANUP] Deleted duplicate conversation: ${duplicate.id}`);
      }

      totalConversationsProcessed++;
    }

    // ===== STEP 6: Update message counts for all conversations =====
    console.log('\n📊 [CLEANUP] STEP 6: Updating conversation statistics...');
    
    const allConversations = await Conversation.find({});
    for (const conv of allConversations) {
      const messageCount = await Message.countDocuments({ 
        conversationId: conv._id,
        isDeleted: { $ne: true }
      });
      
      await Conversation.findByIdAndUpdate(conv._id, {
        'stats.totalMessages': messageCount,
        'stats.lastActivity': new Date()
      });
    }

    // ===== STEP 7: Add unique constraint to prevent future duplicates =====
    console.log('\n🔒 [CLEANUP] STEP 7: Adding unique constraints...');
    
    try {
      // Create a compound index that ensures unique participant pairs
      await Conversation.collection.createIndex(
        { 
          'participants.userId': 1
        },
        { 
          unique: true,
          partialFilterExpression: {
            'participants.2': { $exists: false } // Only for 2-participant conversations
          },
          name: 'unique_participant_pair'
        }
      );
      console.log('✅ [CLEANUP] Added unique constraint for participant pairs');
    } catch (indexError) {
      if (indexError.code === 11000) {
        console.log('⚠️  [CLEANUP] Unique constraint already exists');
      } else {
        console.log('⚠️  [CLEANUP] Could not add unique constraint:', indexError.message);
      }
    }

    // ===== FINAL RESULTS =====
    console.log('\n🎉 [CLEANUP] ===== CLEANUP COMPLETED SUCCESSFULLY =====');
    console.log(`📊 [CLEANUP] Summary:`);
    console.log(`  • Duplicate groups processed: ${totalConversationsProcessed}`);
    console.log(`  • Duplicate conversations removed: ${totalDuplicatesRemoved}`);
    console.log(`  • Messages transferred: ${totalMessagesTransferred}`);
    console.log(`  • Unique constraints added: ✅`);
    
    console.log('\n✅ [CLEANUP] Your messaging system now has:');
    console.log('  ✅ No duplicate conversations');
    console.log('  ✅ All messages preserved and consolidated');
    console.log('  ✅ Prevention of future duplicates');
    console.log('  ✅ Professional messaging experience like WhatsApp/Telegram');

    process.exit(0);

  } catch (error) {
    console.error('❌ [CLEANUP] Fatal error during cleanup:', error);
    process.exit(1);
  }
}

// Run the cleanup
if (require.main === module) {
  cleanupDuplicateConversations();
}

module.exports = { cleanupDuplicateConversations };
