const mongoose = require("mongoose");
const User = require("./models/User");

const migrateCertificates = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/your-db-name");
    
    console.log("🔄 Starting certificate migration...");
    
    const users = await User.find({ 
      $or: [
        { "certificates.0": { $exists: true } },
        { "portfolio.0": { $exists: true } }
      ]
    });
    
    console.log(`📋 Found ${users.length} users with certificates/portfolio`);
    
    for (const user of users) {
      let updated = false;
      
      // Fix certificates without _id
      if (user.certificates && user.certificates.length > 0) {
        user.certificates.forEach((cert, index) => {
          if (!cert._id) {
            cert._id = new mongoose.Types.ObjectId();
            updated = true;
            console.log(`✅ Added _id to certificate "${cert.name}" for user ${user.name}`);
          }
        });
      }
      
      // Fix portfolio items without _id  
      if (user.portfolio && user.portfolio.length > 0) {
        user.portfolio.forEach((item, index) => {
          if (!item._id) {
            item._id = new mongoose.Types.ObjectId();
            updated = true;
            console.log(`✅ Added _id to portfolio "${item.title}" for user ${user.name}`);
          }
        });
      }
      
      if (updated) {
        await user.save();
        console.log(`💾 Updated user: ${user.name}`);
      }
    }
    
    console.log("✅ Migration completed successfully!");
    process.exit(0);
    
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
};

migrateCertificates();
