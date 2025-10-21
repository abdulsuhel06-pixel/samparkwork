const User = require("../models/User");
const Job = require("../models/Job");
const Advertisement = require("../models/Advertisement");
const Category = require("../models/Category");
const path = require("path");
const fs = require("fs");

// ================= Dashboard Stats =================
const getDashboardStats = async (req, res) => {
  try {
    console.log('📊 Fetching dashboard stats...');
    
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
      lastUpdated: new Date().toISOString()
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

    res.json({
      users,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('❌ Error fetching users:', error);
    res.status(500).json({ message: "Error fetching users", error: error.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) return res.status(404).json({ message: "User not found" });
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: "Cannot delete your own account" });
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error('❌ Error deleting user:', error);
    res.status(500).json({ message: "Error deleting user", error: error.message });
  }
};

// ================= Job Management =================
const getJobs = async (req, res) => {
  try {
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

    res.json({
      jobs,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('❌ Error fetching jobs:', error);
    res.status(500).json({ message: "Error fetching jobs", error: error.message });
  }
};

const updateJobStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const job = await Job.findById(req.params.id);

    if (!job) return res.status(404).json({ message: "Job not found" });

    job.status = status;
    const updatedJob = await job.save();
    res.json(updatedJob);
  } catch (error) {
    console.error('❌ Error updating job status:', error);
    res.status(500).json({ message: "Error updating job status", error: error.message });
  }
};

const deleteJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: "Job not found" });

    await Job.findByIdAndDelete(req.params.id);
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
    const advertisements = await Advertisement.find({}).sort({ createdAt: -1 });
    
    console.log(`✅ Retrieved ${advertisements.length} advertisements for admin`);
    
    // Return raw advertisement objects - let frontend handle URL construction
    res.json(advertisements);
  } catch (error) {
    console.error('❌ Error fetching advertisements:', error);
    res.status(500).json({ message: "Error fetching advertisements", error: error.message });
  }
};

// ✅ CREATE ADVERTISEMENT - Clean path guaranteed
const createAdvertisement = async (req, res) => {
  try {
    console.log('📺 Admin creating new advertisement...');

    const { title, content, placement, isActive, link, featured } = req.body;

    let mediaUrl = null;
    let mediaType = 'image';

    if (req.file) {
      // ✅ GUARANTEED CLEAN PATH - Never includes 'uploads/'
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
      mediaUrl: mediaUrl, // Clean path without uploads/ prefix
      mediaType: mediaType,
      placement: placement || 'homepage',
      isActive: isActive === "true" || isActive === true,
      link: link || '',
      featured: featured === "true" || featured === true
    });

    const createdAd = await advertisement.save();
    console.log('✅ Admin advertisement created successfully');

    res.status(201).json(createdAd);
  } catch (error) {
    console.error('❌ Error creating advertisement:', error);
    res.status(500).json({ message: "Error creating advertisement", error: error.message });
  }
};

// ✅ UPDATE ADVERTISEMENT - Clean path guaranteed
const updateAdvertisement = async (req, res) => {
  try {
    console.log('📺 Admin updating advertisement:', req.params.id);
    
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
      
      // ✅ GUARANTEED CLEAN PATH - Never includes 'uploads/'
      const isVideo = req.file.mimetype.startsWith('video/');
      const subfolder = isVideo ? 'videos' : 'images';
      
      advertisement.mediaUrl = `advertisements/${subfolder}/${req.file.filename}`;
      advertisement.mediaType = isVideo ? 'video' : 'image';
      
      console.log('✅ Admin updated with clean media path:', advertisement.mediaUrl);
    }

    const updatedAd = await advertisement.save();
    console.log('✅ Admin advertisement updated successfully');
    
    res.json(updatedAd);
  } catch (error) {
    console.error('❌ Error updating advertisement:', error);
    res.status(500).json({ message: "Error updating advertisement", error: error.message });
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
    
    res.json({ message: "Advertisement deleted successfully" });
  } catch (error) {
    console.error('❌ Error deleting advertisement:', error);
    res.status(500).json({ message: "Error deleting advertisement", error: error.message });
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
