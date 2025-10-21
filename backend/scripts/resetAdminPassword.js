const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const resetAdminPassword = async () => {
  try {
    console.log('🔄 Connecting to MongoDB...');
    console.log('🔍 Connection string:', process.env.MONGO_URI.replace(/\/\/.*@/, '//***:***@'));
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // List all databases to verify connection
    const admin = mongoose.connection.db.admin();
    const dbList = await admin.listDatabases();
    console.log('📋 Available databases:', dbList.databases.map(db => db.name));
    console.log('🎯 Currently connected to:', mongoose.connection.name);

    const adminEmail = 'samparkconnect08@gmail.com';
    const newPassword = '@rojob08';

    console.log('🔍 Searching for admin user with different methods...');
    
    // Try multiple search methods
    const searchMethods = [
      { method: 'Exact match', query: { email: adminEmail } },
      { method: 'Lowercase', query: { email: adminEmail.toLowerCase() } },
      { method: 'Case insensitive regex', query: { email: { $regex: new RegExp(`^${adminEmail}$`, 'i') } } },
      { method: 'Any admin role', query: { role: 'admin' } }
    ];

    let adminUser = null;
    
    for (const search of searchMethods) {
      console.log(`🔍 Trying ${search.method}:`, search.query);
      
      // Import User model with explicit collection check
      let User;
      try {
        User = mongoose.model('User');
      } catch (error) {
        console.log('📁 Defining User model...');
        const userSchema = new mongoose.Schema({}, { strict: false, collection: 'users' });
        User = mongoose.model('User', userSchema);
      }

      const users = await User.find(search.query);
      console.log(`   Found ${users.length} users`);
      
      if (users.length > 0) {
        adminUser = users[0];
        console.log('✅ Admin user found using:', search.method);
        console.log('👤 User details:', {
          id: adminUser._id,
          email: adminUser.email,
          role: adminUser.role,
          hasPassword: !!adminUser.password,
          passwordLength: adminUser.password ? adminUser.password.length : 0
        });
        break;
      }
    }

    if (!adminUser) {
      console.log('🔍 Let\'s check all collections in the database...');
      const collections = await mongoose.connection.db.listCollections().toArray();
      console.log('📁 Available collections:', collections.map(c => c.name));
      
      // Try to find user in any collection that might contain users
      for (const collection of collections) {
        if (collection.name.toLowerCase().includes('user')) {
          console.log(`🔍 Checking collection: ${collection.name}`);
          const docs = await mongoose.connection.db.collection(collection.name)
            .find({ email: { $regex: new RegExp(`^${adminEmail}$`, 'i') } }).toArray();
          
          if (docs.length > 0) {
            console.log(`✅ Found user in collection: ${collection.name}`);
            adminUser = docs[0];
            
            // Update password in the correct collection
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            
            const updateResult = await mongoose.connection.db.collection(collection.name)
              .updateOne(
                { _id: adminUser._id },
                { $set: { password: hashedPassword, lastLoginAt: null } }
              );
            
            console.log('📝 Update result:', updateResult);
            
            if (updateResult.modifiedCount > 0) {
              console.log('✅ Admin password reset successfully!');
              
              // Verify the password works
              const testComparison = await bcrypt.compare(newPassword, hashedPassword);
              console.log('🔐 Password verification test:', testComparison ? 'PASS' : 'FAIL');
              
              if (testComparison) {
                console.log('🎉 Password reset completed successfully!');
                console.log('👤 Login credentials:');
                console.log('   Email:', adminEmail);
                console.log('   Password:', newPassword);
              }
            }
            
            await mongoose.disconnect();
            console.log('🔌 Disconnected from MongoDB');
            process.exit(0);
          }
        }
      }
      
      console.error('❌ Could not find admin user in any collection');
      process.exit(1);
    }

    // If user found with mongoose model, update using mongoose
    console.log('🔐 Hashing new password...');
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    console.log('🔍 Password hash details:');
    console.log('  - Hash length:', hashedPassword.length);
    console.log('  - Hash preview:', hashedPassword.substring(0, 20) + '...');

    // Update the password
    adminUser.password = hashedPassword;
    adminUser.lastLoginAt = null;
    
    const saveResult = await adminUser.save();
    console.log('📝 Save result successful');

    // Verify the password works
    const testComparison = await bcrypt.compare(newPassword, hashedPassword);
    console.log('🔐 Password verification test:', testComparison ? 'PASS' : 'FAIL');
    
    if (testComparison) {
      console.log('🎉 Password reset completed successfully!');
      console.log('👤 You can now login with:');
      console.log('   Email:', adminEmail);
      console.log('   Password:', newPassword);
    } else {
      console.error('❌ Password verification failed after reset');
    }

  } catch (error) {
    console.error('❌ Error resetting admin password:', error);
    console.error('Stack trace:', error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
};

// Run the script
resetAdminPassword();
