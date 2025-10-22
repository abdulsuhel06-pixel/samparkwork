const User = require("../models/User");
const Job = require("../models/Job");
const Advertisement = require("../models/Advertisement");
const Category = require("../models/Category");
const path = require("path");
const fs = require("fs");

// ✅ PRODUCTION-READY: Smart media URL generation
const generateMediaUrl = (mediaPath) => {
  if (!mediaPath) return null;
  
  console.log('🎥 [generateMediaUrl] Processing:', mediaPath);
  console.log('🎥 [generateMediaUrl] Environment:', process.env.NODE_ENV);
  
  // If already a full URL, return as is
  if (mediaPath.startsWith('http://') || mediaPath.startsWith('https://')) {
    return mediaPath;
  }
  
  // Ensure proper path formatting
  let cleanPath = mediaPath;
  if (!cleanPath.startsWith('/uploads/')) {
    if (cleanPath.startsWith('uploads/')) {
      cleanPath = `/${cleanPath}`;
    } else {
      cleanPath = `/uploads/${cleanPath}`;
    }
  }
  
  // ✅ PRODUCTION-AWARE URL GENERATION
  const isProduction = process.env.NODE_ENV === 'production';
  const BASE_URL = isProduction 
    ? 'https://samparkwork-backend.onrender.com' 
    : 'http://localhost:5000';
  
  const finalUrl = `${BASE_URL}${cleanPath}`;
  
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
    
    const { page = 1, limit = 10, search = "" } = req.query;
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
    
    const { page = 1, limit = 10, status, category } = req.query;
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

// ================= Advertisement Management =================
const getAdvertisements = async (req, res) => {
  try {
    console.log('📺 Fetching advertisements for admin dashboard...');
    console.log('📺 Environment:', process.env.NODE_ENV);
    
    const advertisements = await Advertisement.find({}).sort({ createdAt: -1 });
    
    console.log(`✅ Retrieved ${advertisements.length} advertisements for admin`);
    
    // ✅ Generate proper media URLs for each advertisement
    const advertisementsWithUrls = advertisements.map(ad => {
      const adObj = ad.toObject();
      return {
        ...adObj,
        mediaUrl: generateMediaUrl(adObj.mediaUrl),
        _timestamp: Date.now(),
        _environment: process.env.NODE_ENV || 'development'
      };
    });
    
    res.json({
      success: true,
      count: advertisementsWithUrls.length,
      advertisements: advertisementsWithUrls,
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    console.error('❌ Error fetching advertisements:', error);
    res.status(500).json({ 
      message: "Error fetching advertisements", 
      error: error.message 
    });
  }
};

// ✅ CREATE ADVERTISEMENT - PRODUCTION READY
const createAdvertisement = async (req, res) => {
  try {
    console.log('📺 Admin creating new advertisement...');
    console.log('📺 Environment:', process.env.NODE_ENV);

    const { title, content, placement, isActive, link, featured } = req.body;

    let mediaUrl = null;
    let mediaType = 'image';

    if (req.file) {
      // ✅ Store RELATIVE path in database (no leading slash)
      const isVideo = req.file.mimetype.startsWith('video/');
      const subfolder = isVideo ? 'videos' : 'images';
      
      // Store path as: advertisements/{videos|images}/filename
      mediaUrl = `advertisements/${subfolder}/${req.file.filename}`;
      mediaType = isVideo ? 'video' : 'image';
      
      console.log('✅ Admin storing clean media path:', mediaUrl);
    }

    const advertisement = new Advertisement({
      title,
      content,
      mediaUrl: mediaUrl, // Relative path stored
      mediaType: mediaType,
      placement: placement || 'homepage',
      isActive: isActive === "true" || isActive === true,
      link: link || '',
      featured: featured === "true" || featured === true
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
    res.status(500).json({ 
      message: "Error creating advertisement", 
      error: error.message 
    });
  }
};

// ✅ UPDATE ADVERTISEMENT - PRODUCTION READY
const updateAdvertisement = async (req, res) => {
  try {
    console.log('📺 Admin updating advertisement:', req.params.id);
    console.log('📺 Environment:', process.env.NODE_ENV);
    
    const { title, content, isActive, link, featured } = req.body;
    const advertisement = await Advertisement.findById(req.params.id);

    if (!advertisement) {
      return res.status(404).json({ message: "Advertisement not found" });
    }

    advertisement.title = title || advertisement.title;
    advertisement.content = content || advertisement.content;
    advertisement.link = link || advertisement.link;
    
    if (isActive !== undefined) {
      advertisement.isActive = isActive === "true" || isActive === true;
    }
    
    if (featured !== undefined) {
      advertisement.featured = featured === "true" || featured === true;
    }

    if (req.file) {
      // Delete old file
      if (advertisement.mediaUrl) {
        const oldFilePath = path.join(__dirname, '../uploads', advertisement.mediaUrl);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }
      
      // ✅ Store RELATIVE path in database (no leading slash)
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
    res.status(500).json({ 
      message: "Error updating advertisement", 
      error: error.message 
    });
  }
};

// Delete advertisement
const deleteAdvertisement = async (req, res) => {
  try {
    console.log('🗑️ Admin deleting advertisement:', req.params.id);
    
    const advertisement = await Advertisement.findById(req.params.id);
    
    if (!advertisement) {
      return res.status(404).json({ message: "Advertisement not found" });
    }

    // Delete media file
    if (advertisement.mediaUrl) {
      const filePath = path.join(__dirname, '../uploads', advertisement.mediaUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
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
      message: "Error deleting advertisement", 
      error: error.message 
    });
  }
};

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
