const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const fixAdminPassword = async () => {
  try {
    console.log('🔄 Connecting to MongoDB...');
    console.log('🔍 Connection URI (masked):', process.env.MONGO_URI.replace(/\/\/[^@]+@/, '//***:***@'));
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
    console.log('🎯 Connected to database:', mongoose.connection.name);

    // List all databases and collections for debugging
    const admin = mongoose.connection.db.admin();
    const dbList = await admin.listDatabases();
    console.log('📋 Available databases:', dbList.databases.map(db => ({ name: db.name, sizeOnDisk: db.sizeOnDisk })));

    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('📁 Collections in current database:', collections.map(c => c.name));

    const adminEmail = 'samparkconnect08@gmail.com';
    const newPassword = '@rojob08';
    
    console.log('🔍 Searching for admin user with multiple strategies...');

    // Strategy 1: Direct collection access to 'users' collection
    console.log('\n🔍 Strategy 1: Direct users collection search...');
    const usersCollection = mongoose.connection.db.collection('users');
    const directSearch = await usersCollection.find({}).toArray();
    console.log(`   Found ${directSearch.length} total documents in users collection`);
    
    if (directSearch.length > 0) {
      console.log('   Sample document structure:', Object.keys(directSearch[0]));
      
      // Look for our specific user
      const adminUser = await usersCollection.findOne({ 
        email: { $regex: new RegExp(`^${adminEmail}$`, 'i') } 
      });
      
      if (adminUser) {
        console.log('✅ Found admin user via direct search:', {
          id: adminUser._id,
          email: adminUser.email,
          role: adminUser.role,
          hasPassword: !!adminUser.password
        });
        
        // Hash new password
        console.log('🔐 Hashing new password...');
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        console.log('   Hash preview:', hashedPassword.substring(0, 20) + '...');
        
        // Update directly in collection
        const updateResult = await usersCollection.updateOne(
          { _id: adminUser._id },
          { 
            $set: { 
              password: hashedPassword,
              lastLoginAt: null,
              email: adminEmail.toLowerCase() // Ensure lowercase
            }
          }
        );
        
        console.log('📝 Direct update result:', updateResult);
        
        if (updateResult.modifiedCount > 0) {
          // Verify the password works
          const testCompare = await bcrypt.compare(newPassword, hashedPassword);
          console.log('🔐 Password verification test:', testCompare ? 'SUCCESS' : 'FAILED');
          
          if (testCompare) {
            console.log('🎉 Password updated successfully via direct collection access!');
            console.log('👤 Login credentials:');
            console.log('   Email:', adminEmail);
            console.log('   Password:', newPassword);
          }
        } else {
          console.log('❌ Update failed even with direct collection access');
        }
        
        await mongoose.disconnect();
        process.exit(0);
      }
    }

    // Strategy 2: Search all collections for user data
    console.log('\n🔍 Strategy 2: Searching all collections...');
    for (const collection of collections) {
      console.log(`   Checking collection: ${collection.name}`);
      
      const collectionRef = mongoose.connection.db.collection(collection.name);
      const sampleDoc = await collectionRef.findOne({});
      
      if (sampleDoc && (sampleDoc.email || sampleDoc.username)) {
        console.log(`     Collection ${collection.name} contains user-like documents`);
        
        const adminUser = await collectionRef.findOne({ 
          $or: [
            { email: adminEmail },
            { email: adminEmail.toLowerCase() },
            { email: { $regex: new RegExp(`^${adminEmail}$`, 'i') } }
          ]
        });
        
        if (adminUser) {
          console.log('✅ Found admin user in collection:', collection.name);
          console.log('👤 User details:', {
            id: adminUser._id,
            email: adminUser.email,
            role: adminUser.role
          });
          
          // Hash and update password
          const hashedPassword = await bcrypt.hash(newPassword, 10);
          
          const updateResult = await collectionRef.updateOne(
            { _id: adminUser._id },
            { $set: { password: hashedPassword, lastLoginAt: null } }
          );
          
          console.log('📝 Update result:', updateResult);
          
          if (updateResult.modifiedCount > 0) {
            const testCompare = await bcrypt.compare(newPassword, hashedPassword);
            console.log('🔐 Password test:', testCompare ? 'SUCCESS' : 'FAILED');
            
            if (testCompare) {
              console.log('🎉 Admin password reset successfully!');
              console.log('👤 Login credentials:');
              console.log('   Email:', adminEmail);
              console.log('   Password:', newPassword);
            }
          }
          
          await mongoose.disconnect();
          process.exit(0);
        }
      }
    }

    // Strategy 3: Check if we're in the wrong database
    console.log('\n🔍 Strategy 3: Checking other databases...');
    for (const dbInfo of dbList.databases) {
      if (dbInfo.name !== mongoose.connection.name && 
          !['admin', 'local', 'config'].includes(dbInfo.name)) {
        
        console.log(`   Checking database: ${dbInfo.name}`);
        
        try {
          const otherDb = mongoose.connection.client.db(dbInfo.name);
          const otherCollections = await otherDb.listCollections().toArray();
          
          for (const col of otherCollections) {
            if (col.name.toLowerCase().includes('user')) {
              console.log(`     Checking collection ${col.name} in database ${dbInfo.name}`);
              
              const userDoc = await otherDb.collection(col.name).findOne({ 
                email: { $regex: new RegExp(`^${adminEmail}$`, 'i') }
              });
              
              if (userDoc) {
                console.log('✅ Found admin user in different database!');
                console.log('📍 Location:', `${dbInfo.name}.${col.name}`);
                console.log('👤 User:', { id: userDoc._id, email: userDoc.email });
                
                console.log('⚠️  Your connection string might be pointing to the wrong database!');
                console.log('🔧 Update your MONGO_URI to use database:', dbInfo.name);
                
                // Update password in correct location
                const hashedPassword = await bcrypt.hash(newPassword, 10);
                const updateResult = await otherDb.collection(col.name).updateOne(
                  { _id: userDoc._id },
                  { $set: { password: hashedPassword, lastLoginAt: null } }
                );
                
                console.log('📝 Update result:', updateResult);
                
                if (updateResult.modifiedCount > 0) {
                  console.log('🎉 Password updated in correct database!');
                  console.log('👤 Login credentials:');
                  console.log('   Email:', adminEmail);
                  console.log('   Password:', newPassword);
                }
                
                await mongoose.disconnect();
                process.exit(0);
              }
            }
          }
        } catch (dbError) {
          console.log(`     Error accessing database ${dbInfo.name}:`, dbError.message);
        }
      }
    }

    console.log('❌ Could not find admin user in any database or collection');
    console.log('🔧 Troubleshooting suggestions:');
    console.log('   1. Verify your MONGO_URI points to the correct cluster');
    console.log('   2. Check if the email is exactly:', adminEmail);
    console.log('   3. Verify user exists in MongoDB Atlas interface');
    console.log('   4. Try creating a new admin user instead');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
};

// Run the script
fixAdminPassword();
