const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { protect, isAdmin } = require("../middleware/authMiddleware");

const {
  getDashboardStats,
  getUsers,
  deleteUser,
  getJobs,
  updateJobStatus,
  deleteJob,
  getAdvertisements,
  createAdvertisement,
  updateAdvertisement,
  deleteAdvertisement,
} = require("../controllers/adminController");

const router = express.Router();

// Enhanced debug middleware
router.use((req, res, next) => {
  console.log(`🔧 adminRouter: ${req.method} ${req.path}`);
  console.log(`🕐 Timestamp: ${new Date().toISOString()}`);
  console.log(`👤 User ID: ${req.user ? req.user._id : 'Not authenticated'}`);
  next();
});

// Ensure advertisements upload directories exist
const adsUploadDir = path.join(__dirname, "../uploads/advertisements/images");
const videosUploadDir = path.join(__dirname, "../uploads/advertisements/videos");

if (!fs.existsSync(adsUploadDir)) {
  fs.mkdirSync(adsUploadDir, { recursive: true });
  console.log("✅ Created advertisements images directory");
}

if (!fs.existsSync(videosUploadDir)) {
  fs.mkdirSync(videosUploadDir, { recursive: true });
  console.log("✅ Created advertisements videos directory");
}

// Enhanced multer configuration for Advertisements
const adStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const isVideo = file.mimetype.startsWith('video/');
    const uploadPath = isVideo ? videosUploadDir : adsUploadDir;
    console.log(`📁 File destination: ${uploadPath}`);
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const fileName = "ad-" + uniqueSuffix + path.extname(file.originalname);
    console.log(`📄 Generated filename: ${fileName}`);
    cb(null, fileName);
  },
});

const uploadAd = multer({
  storage: adStorage,
  limits: { 
    fileSize: 100 * 1024 * 1024, // 100MB limit for videos
    files: 1 
  },
  fileFilter: function (req, file, cb) {
    console.log("📁 Upload attempt - File type:", file.mimetype);
    console.log("📁 Upload attempt - File size:", file.size);
    
    if (file.mimetype.startsWith("image/") || file.mimetype.startsWith("video/")) {
      cb(null, true);
    } else {
      console.log("❌ File type not allowed:", file.mimetype);
      cb(new Error("Only image and video files are allowed for advertisements!"), false);
    }
  },
});

// Enhanced error handling middleware for multer
const handleMulterError = (err, req, res, next) => {
  console.log("🔍 Multer error check:", err ? err.message : 'No error');
  
  if (err instanceof multer.MulterError) {
    console.error("❌ Multer error:", err);
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File size too large. Maximum 100MB allowed.' });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ message: 'Too many files. Only 1 file allowed.' });
    }
  }
  if (err) {
    console.error("❌ File upload error:", err.message);
    return res.status(400).json({ message: err.message });
  }
  next();
};

// Apply admin protection to all routes
router.use(protect);
router.use(isAdmin);

// =============================
// Dashboard routes - ENHANCED
// =============================
router.get("/dashboard-stats", async (req, res, next) => {
  try {
    console.log("📊 Admin dashboard-stats endpoint hit");
    console.log("📊 Request headers:", req.headers.authorization ? 'Token present' : 'No token');
    await getDashboardStats(req, res, next);
  } catch (error) {
    console.error("❌ Dashboard stats error:", error);
    next(error);
  }
});

// Test endpoint for debugging
router.get("/test", (req, res) => {
  console.log("🧪 Admin test endpoint hit");
  res.json({ 
    message: "Admin routes working!", 
    user: req.user ? req.user._id : 'No user',
    timestamp: new Date().toISOString()
  });
});

// =============================
// User management
// =============================
router.get("/users", async (req, res, next) => {
  try {
    console.log("👥 Admin fetching users list");
    await getUsers(req, res, next);
  } catch (error) {
    console.error("❌ Get users error:", error);
    next(error);
  }
});

router.delete("/users/:id", async (req, res, next) => {
  try {
    console.log("🗑️ Admin deleting user:", req.params.id);
    await deleteUser(req, res, next);
  } catch (error) {
    console.error("❌ Delete user error:", error);
    next(error);
  }
});

// =============================
// Job management
// =============================
router.get("/jobs", async (req, res, next) => {
  try {
    console.log("💼 Admin fetching jobs list");
    await getJobs(req, res, next);
  } catch (error) {
    console.error("❌ Get jobs error:", error);
    next(error);
  }
});

router.put("/jobs/:id/status", async (req, res, next) => {
  try {
    console.log("📝 Admin updating job status:", req.params.id);
    await updateJobStatus(req, res, next);
  } catch (error) {
    console.error("❌ Update job status error:", error);
    next(error);
  }
});

router.delete("/jobs/:id", async (req, res, next) => {
  try {
    console.log("🗑️ Admin deleting job:", req.params.id);
    await deleteJob(req, res, next);
  } catch (error) {
    console.error("❌ Delete job error:", error);
    next(error);
  }
});

// =============================
// Advertisement management - ENHANCED
// =============================
router.get("/advertisements", async (req, res, next) => {
  try {
    console.log("📺 Admin fetching advertisements list");
    await getAdvertisements(req, res, next);
  } catch (error) {
    console.error("❌ Get advertisements error:", error);
    next(error);
  }
});

router.post("/advertisements", uploadAd.single("media"), handleMulterError, async (req, res, next) => {
  try {
    console.log("📺 Admin creating new advertisement");
    console.log("📁 File uploaded:", req.file ? {
      filename: req.file.filename,
      mimetype: req.file.mimetype,
      size: req.file.size
    } : 'No file');
    console.log("📝 Form data:", req.body);
    await createAdvertisement(req, res, next);
  } catch (error) {
    console.error("❌ Create advertisement error:", error);
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
        console.log("🧹 Cleaned up uploaded file after error");
      } catch (cleanupError) {
        console.error("❌ File cleanup error:", cleanupError);
      }
    }
    next(error);
  }
});

router.put("/advertisements/:id", uploadAd.single("media"), handleMulterError, async (req, res, next) => {
  try {
    console.log("📝 Admin updating advertisement:", req.params.id);
    console.log("📁 New file uploaded:", req.file ? req.file.filename : 'No file');
    console.log("📝 Update data:", req.body);
    await updateAdvertisement(req, res, next);
  } catch (error) {
    console.error("❌ Update advertisement error:", error);
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
        console.log("🧹 Cleaned up uploaded file after error");
      } catch (cleanupError) {
        console.error("❌ File cleanup error:", cleanupError);
      }
    }
    next(error);
  }
});

router.delete("/advertisements/:id", async (req, res, next) => {
  try {
    console.log("🗑️ Admin deleting advertisement:", req.params.id);
    await deleteAdvertisement(req, res, next);
  } catch (error) {
    console.error("❌ Delete advertisement error:", error);
    next(error);
  }
});

// Enhanced error handling middleware for admin routes
router.use((err, req, res, next) => {
  console.error("❌ Admin route error:", err);
  console.error("❌ Error stack:", err.stack);
  console.error("❌ Request details:", {
    method: req.method,
    path: req.path,
    body: req.body,
    params: req.params
  });
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({ message: 'Validation error', error: err.message });
  }
  
  if (err.name === 'CastError') {
    return res.status(400).json({ message: 'Invalid ID format', error: 'Resource not found' });
  }
  
  res.status(500).json({ 
    message: 'Internal server error in admin operations',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
    timestamp: new Date().toISOString()
  });
});

console.log("✅ adminRoutes module loaded successfully");

module.exports = router;
