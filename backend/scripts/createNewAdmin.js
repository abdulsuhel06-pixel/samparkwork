const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const createNewAdmin = async () => {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const adminData = {
      name: 'Admin User',
      email: 'samparkconnect08@gmail.com',
      password: '@rojob08',
      role: 'admin',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      permissions: ['users.read', 'users.write', 'users.delete', 'system.admin']
    };

    // Hash password
    const hashedPassword = await bcrypt.hash(adminData.password, 10);
    console.log('🔐 Password hashed successfully');

    // First, try to delete existing admin user if any
    console.log('🗑️ Removing any existing admin user...');
    const deleteResult = await mongoose.connection.db.collection('users').deleteMany({ 
      email: { $regex: new RegExp(`^${adminData.email}$`, 'i') }
    });
    console.log('   Deleted users:', deleteResult.deletedCount);

    // Create new admin user
    console.log('➕ Creating new admin user...');
    const newAdmin = {
      ...adminData,
      password: hashedPassword,
      _id: new mongoose.Types.ObjectId()
    };

    const insertResult = await mongoose.connection.db.collection('users').insertOne(newAdmin);
    console.log('📝 Insert result:', insertResult);

    if (insertResult.acknowledged) {
      // Test the password
      const testCompare = await bcrypt.compare(adminData.password, hashedPassword);
      console.log('🔐 Password test:', testCompare ? 'SUCCESS' : 'FAILED');

      if (testCompare) {
        console.log('🎉 New admin user created successfully!');
        console.log('👤 Login credentials:');
        console.log('   Email:', adminData.email);
        console.log('   Password:', adminData.password);
        console.log('   Role:', adminData.role);
      }
    }

  } catch (error) {
    console.error('❌ Error creating admin:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

// Run the script
createNewAdmin();
