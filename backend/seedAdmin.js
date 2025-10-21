// seedAdmin.js
require("dotenv").config();
const { connectDB } = require("./config/db");
const User = require("./models/User");

async function createOrUpdateAdmin() {
  try {
    await connectDB();

    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      console.error("❌ Please set ADMIN_EMAIL and ADMIN_PASSWORD in your .env file");
      process.exit(1);
    }

    let adminUser = await User.findOne({ email: adminEmail });

    if (!adminUser) {
      // ✅ Create new admin
      adminUser = new User({
        name: "Admin",
        email: adminEmail,
        password: adminPassword, // pre-save hook will hash
        role: "admin",
      });
      await adminUser.save();
      console.log(`👑 Admin created with email: ${adminEmail}`);
    } else {
      // 🔄 Update existing admin password + role
      adminUser.password = adminPassword; // pre-save hook will hash
      adminUser.role = "admin";
      await adminUser.save();
      console.log(`🔄 Admin updated with email: ${adminEmail}`);
    }

    process.exit(0);
  } catch (err) {
    console.error("❌ Error creating/updating admin:", err.message);
    process.exit(1);
  }
}

createOrUpdateAdmin();
