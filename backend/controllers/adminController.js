const User = require("../models/User");
const Job = require("../models/Job");
const Advertisement = require("../models/Advertisement");
const Category = require("../models/Category");
const path = require("path");
const fs = require("fs");

// ✅ FIXED: Production-ready media URL generation with proper HTTPS
const generateMediaUrl = (mediaPath) => {
  if (!mediaPath) return null;
  
  console.log('🎥 [generateMediaUrl] Processing:', mediaPath);
  console.log('🎥 [generateMediaUrl] Environment:', process.env.NODE_ENV);
  
  // If already a full URL, return as is
  if (mediaPath.startsWith('http://') || mediaPath.startsWith('https://')) {
    return mediaPath;
  }
  
  // Ensure proper path formatting - FIXED: Remove duplicate uploads
  let cleanPath = mediaPath;
  
  // Remove any leading slashes first
  cleanPath = cleanPath.replace(/^\/+/, '');
  
  // Ensure it starts with uploads/ (no leading slash in the relative path)
  if (!cleanPath.startsWith('uploads/')) {
    cleanPath = `uploads/${cleanPath}`;
  }
  
  // ✅ FIXED: Always use HTTPS in production for mixed content fix
  const isProduction = process.env.NODE_ENV === 'production';
  const BASE_URL = isProduction 
    ? 'https://samparkwork-backend.onrender.com' 
    : 'http://localhost:5000';
  
  // Add leading slash for URL construction
  const finalUrl = `${BASE_URL}/${cleanPath}`;
  
  console.log(`🎬 Generated ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'} URL:`, finalUrl);
  
  return finalUrl;
};

// ================= Dashboard Stats =================
const getDashboardStats = async (req, res) => {
  try {
    console.log('📊 Fetching dashboard stats...');
    console.log('📊 Environment:', process.env.NODE_ENV);
    
    const [
      totalUsers,
      totalProfessionals,
      totalClients,
      totalJobs,
      openJobs,
      totalCategories,
      totalAdvertisements
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: "professional" }),
      User.countDocuments({ role: "client" }),
      Job.countDocuments(),
      Job.countDocuments({ status: "open" }),
      Category.countDocuments(),
      Advertisement.countDocuments()
    ]);

    const statsResponse = {
      users: totalUsers,
      professionals: totalProfessionals,
      clients: totalClients,
      jobs: totalJobs,
      openJobs: openJobs,
      categories: totalCategories,
      advertisements: totalAdvertisements,
      totalPayments: 0,
      lastUpdated: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    };

    console.log('✅ Dashboard stats retrieved successfully');
    res.json(statsResponse);

  } catch (error) {
    console.error('❌ Error fetching dashboard stats:', error);
    res.status(500).json({ 
      message: "Error fetching dashboard stats", 
      error: error.message
    });
  }
};

// ================= User Management =================
const getUsers = async (req, res) => {
  try {
    console.log('👥 Fetching users for admin dashboard...');
    
    const { page = 1, limit = 500, search = "" } = req.query;
    const query = search
      ? {
          $or: [
            { name: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } }
          ]
        }
      : {};

    const users = await User.find(query)
      .select("-password")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    console.log(`✅ Retrieved ${users.length} users for admin`);
    
    res.json({
      users,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    console.error('❌ Error fetching users:', error);
    res.status(500).json({ message: "Error fetching users", error: error.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    console.log('🗑️ Admin deleting user:', req.params.id);
    
    const user = await User.findById(req.params.id);

    if (!user) return res.status(404).json({ message: "User not found" });
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: "Cannot delete your own account" });
    }

    await User.findByIdAndDelete(req.params.id);
    console.log('✅ User deleted successfully by admin');
    
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error('❌ Error deleting user:', error);
    res.status(500).json({ message: "Error deleting user", error: error.message });
  }
};

// ================= Job Management =================
const getJobs = async (req, res) => {
  try {
    console.log('💼 Fetching jobs for admin dashboard...');
    
    const { page = 1, limit = 500, status, category } = req.query;
    let filter = {};

    if (status) filter.status = status;
    if (category) filter.category = category;

    const jobs = await Job.find(filter)
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Job.countDocuments(filter);

    console.log(`✅ Retrieved ${jobs.length} jobs for admin`);
    
    res.json({
      jobs,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    console.error('❌ Error fetching jobs:', error);
    res.status(500).json({ message: "Error fetching jobs", error: error.message });
  }
};

const updateJobStatus = async (req, res) => {
  try {
    console.log('🔄 Admin updating job status:', req.params.id);
    
    const { status } = req.body;
    const job = await Job.findById(req.params.id);

    if (!job) return res.status(404).json({ message: "Job not found" });

    job.status = status;
    const updatedJob = await job.save();
    
    console.log('✅ Job status updated successfully by admin');
    res.json(updatedJob);
  } catch (error) {
    console.error('❌ Error updating job status:', error);
    res.status(500).json({ message: "Error updating job status", error: error.message });
  }
};

const deleteJob = async (req, res) => {
  try {
    console.log('🗑️ Admin deleting job:', req.params.id);
    
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: "Job not found" });

    await Job.findByIdAndDelete(req.params.id);
    console.log('✅ Job deleted successfully by admin');
    
    res.json({ message: "Job deleted successfully" });
  } catch (error) {
    console.error('❌ Error deleting job:', error);
    res.status(500).json({ message: "Error deleting job", error: error.message });
  }
};

// ================= FIXED: Advertisement Management =================

// ✅ FIXED: GET ADVERTISEMENTS - Proper response format
const getAdvertisements = async (req, res) => {
  try {
    console.log('📺 Admin fetching advertisements list...');
    console.log('📺 Environment:', process.env.NODE_ENV);
    
    const advertisements = await Advertisement.find({}).sort({ createdAt: -1 });
    
    console.log(`✅ Found ${advertisements.length} advertisements in database`);
    
    // ✅ Generate proper media URLs for each advertisement  
    const advertisementsWithUrls = advertisements.map((ad, index) => {
      const adObj = ad.toObject();
      const mediaUrl = generateMediaUrl(adObj.mediaUrl);
      
      console.log(`🎬 Ad ${index + 1}: "${ad.title}"`);
      console.log(`   Original: ${adObj.mediaUrl}`);
      console.log(`   Final URL: ${mediaUrl}`);
      
      return {
        ...adObj,
        mediaUrl: mediaUrl,
        _timestamp: Date.now(),
        _environment: process.env.NODE_ENV || 'development'
      };
    });
    
    // ✅ CRITICAL FIX: Return in format expected by AdminDashboard
    console.log(`📤 Returning ${advertisementsWithUrls.length} advertisements`);
    
    res.json({
      success: true,
      count: advertisementsWithUrls.length,
      advertisements: advertisementsWithUrls, // This is what frontend expects
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    console.error('❌ Error fetching advertisements:', error);
    res.status(500).json({ 
      success: false,
      message: "Error fetching advertisements", 
      error: error.message 
    });
  }
};

// ✅ FIXED: CREATE ADVERTISEMENT - Proper file handling
const createAdvertisement = async (req, res) => {
  try {
    console.log('📺 Admin creating new advertisement...');
    console.log('📺 Environment:', process.env.NODE_ENV);
    console.log('📎 File info:', req.file ? {
      filename: req.file.filename,
      mimetype: req.file.mimetype,
      destination: req.file.destination,
      path: req.file.path
    } : 'No file uploaded');

    // ✅ CRITICAL FIX: Require media file
    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        message: 'Media file is required' 
      });
    }

    const { title, content, placement, isActive, link, featured } = req.body;

    // ✅ CRITICAL FIX: Validate required fields
    if (!title || !content) {
      // Clean up uploaded file if validation fails
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ 
        success: false,
        message: 'Title and content are required' 
      });
    }

    // ✅ FIXED: Store clean relative path without double uploads/
    const isVideo = req.file.mimetype.startsWith('video/');
    const subfolder = isVideo ? 'videos' : 'images';
    
    // Store path as: advertisements/videos/filename or advertisements/images/filename
    const cleanMediaUrl = `advertisements/${subfolder}/${req.file.filename}`;
    const mediaType = isVideo ? 'video' : 'image';
    
    console.log('✅ Admin storing clean media path:', cleanMediaUrl);

    const advertisement = new Advertisement({
      title,
      content,
      mediaUrl: cleanMediaUrl, // Clean relative path
      mediaType: mediaType,
      placement: placement || 'homepage',
      isActive: isActive === "true" || isActive === true,
      link: link || '',
      featured: featured === "true" || featured === true,
      targetAudience: 'all' // Default value
    });

    const createdAd = await advertisement.save();
    console.log('✅ Admin advertisement created successfully');

    // Return with production-ready URL
    const responseAd = {
      ...createdAd.toObject(),
      mediaUrl: generateMediaUrl(createdAd.mediaUrl),
      _timestamp: Date.now()
    };

    res.status(201).json({
      success: true,
      message: "Advertisement created successfully",
      advertisement: responseAd
    });
  } catch (error) {
    console.error('❌ Error creating advertisement:', error);
    
    // ✅ CRITICAL: Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
        console.log('🧹 Cleaned up uploaded file after error');
      } catch (cleanupError) {
        console.error('❌ File cleanup error:', cleanupError);
      }
    }
    
    res.status(500).json({ 
      success: false,
      message: "Error creating advertisement", 
      error: error.message 
    });
  }
};

// ✅ FIXED: UPDATE ADVERTISEMENT - Better error handling
const updateAdvertisement = async (req, res) => {
  try {
    console.log('📺 Admin updating advertisement:', req.params.id);
    console.log('📺 Environment:', process.env.NODE_ENV);
    console.log('📁 New file uploaded:', req.file ? req.file.filename : 'No file');
    
    const { title, content, isActive, link, featured } = req.body;
    const advertisement = await Advertisement.findById(req.params.id);

    if (!advertisement) {
      // Clean up uploaded file if ad not found
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({ 
        success: false,
        message: "Advertisement not found" 
      });
    }

    // Update text fields
    if (title) advertisement.title = title;
    if (content) advertisement.content = content;
    if (link !== undefined) advertisement.link = link;
    
    if (isActive !== undefined) {
      advertisement.isActive = isActive === "true" || isActive === true;
    }
    
    if (featured !== undefined) {
      advertisement.featured = featured === "true" || featured === true;
    }

    // ✅ FIXED: Handle new media file upload
    if (req.file) {
      // Delete old media file
      if (advertisement.mediaUrl) {
        const oldFilePath = path.join(__dirname, '../uploads', advertisement.mediaUrl);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
          console.log('🗑️ Deleted old media file:', oldFilePath);
        }
      }
      
      // Store new clean relative path
      const isVideo = req.file.mimetype.startsWith('video/');
      const subfolder = isVideo ? 'videos' : 'images';
      
      advertisement.mediaUrl = `advertisements/${subfolder}/${req.file.filename}`;
      advertisement.mediaType = isVideo ? 'video' : 'image';
      
      console.log('✅ Admin updated with clean media path:', advertisement.mediaUrl);
    }

    const updatedAd = await advertisement.save();
    console.log('✅ Admin advertisement updated successfully');
    
    // Return with production-ready URL
    const responseAd = {
      ...updatedAd.toObject(),
      mediaUrl: generateMediaUrl(updatedAd.mediaUrl),
      _timestamp: Date.now()
    };
    
    res.json({
      success: true,
      message: "Advertisement updated successfully",
      advertisement: responseAd
    });
  } catch (error) {
    console.error('❌ Error updating advertisement:', error);
    
    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
        console.log('🧹 Cleaned up uploaded file after error');
      } catch (cleanupError) {
        console.error('❌ File cleanup error:', cleanupError);
      }
    }
    
    res.status(500).json({ 
      success: false,
      message: "Error updating advertisement", 
      error: error.message 
    });
  }
};

// ✅ FIXED: DELETE ADVERTISEMENT - Better file cleanup
const deleteAdvertisement = async (req, res) => {
  try {
    console.log('🗑️ Admin deleting advertisement:', req.params.id);
    
    const advertisement = await Advertisement.findById(req.params.id);
    
    if (!advertisement) {
      return res.status(404).json({ 
        success: false,
        message: "Advertisement not found" 
      });
    }

    // Delete media file
    if (advertisement.mediaUrl) {
      const filePath = path.join(__dirname, '../uploads', advertisement.mediaUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log('🗑️ Deleted media file:', filePath);
      }
    }

    await Advertisement.findByIdAndDelete(req.params.id);
    console.log('✅ Admin advertisement deleted successfully');
    
    res.json({ 
      success: true,
      message: "Advertisement deleted successfully" 
    });
  } catch (error) {
    console.error('❌ Error deleting advertisement:', error);
    res.status(500).json({ 
      success: false,
      message: "Error deleting advertisement", 
      error: error.message 
    });
  }
};
//export all modules
module.exports = {
  getDashboardStats,
  getUsers,
  deleteUser,
  getJobs,
  updateJobStatus,
  deleteJob,
  getAdvertisements,
  createAdvertisement,
  updateAdvertisement,
  deleteAdvertisement
};
