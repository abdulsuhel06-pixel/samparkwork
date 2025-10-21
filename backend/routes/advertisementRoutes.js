const express = require('express');
const path = require('path');
const fs = require('fs');
const Advertisement = require('../models/Advertisement');
const { protect, isAdmin } = require('../middleware/authMiddleware');
const { uploadAdvertisement } = require('../middleware/uploadMiddleware');

const router = express.Router();

// Create upload directories
const createUploadDirs = () => {
  const dirs = [
    'uploads/advertisements',
    'uploads/advertisements/images', 
    'uploads/advertisements/videos'
  ];
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`✅ Created directory: ${dir}`);
    }
  });
};

createUploadDirs();

// ✅ CRITICAL MOBILE FIX: Smart URL construction that works on ALL devices
const buildMobileCompatibleUrl = (mediaPath, req) => {
  if (!mediaPath) return null;
  
  console.log('🔗 [buildMobileCompatibleUrl] Processing:', mediaPath);
  console.log('🔗 [buildMobileCompatibleUrl] Request headers:', {
    host: req.get('host'),
    referer: req.get('referer'),
    userAgent: req.get('user-agent')?.includes('Mobile') ? 'MOBILE' : 'DESKTOP'
  });
  
  // If already complete URL, return as-is
  if (typeof mediaPath === 'string' && (mediaPath.startsWith('http://') || mediaPath.startsWith('https://'))) {
    console.log('✅ Already complete URL:', mediaPath);
    return mediaPath;
  }
  
  // Clean path processing
  let cleanPath = String(mediaPath).replace(/\\/g, '/').replace(/^\/+/, '');
  const originalPath = cleanPath;
  while (cleanPath.includes('uploads/')) {
    cleanPath = cleanPath.replace('uploads/', '');
  }
  
  // ✅ CRITICAL: Detect if request is from mobile network access
  const requestHost = req.get('host');
  const referer = req.get('referer');
  const isMobileNetworkRequest = requestHost && (
    requestHost.includes('172.31.180.157') || 
    requestHost.includes('192.168.') || 
    requestHost.includes('10.') ||
    (referer && referer.includes('172.31.180.157'))
  );
  
  let finalUrl;
  if (isMobileNetworkRequest) {
    // ✅ MOBILE: Extract network IP from request and use backend port 5000
    let networkIP = '172.31.180.157'; // Your current network IP
    
    // Try to extract IP from host or referer
    if (requestHost && requestHost.includes(':')) {
      const hostIP = requestHost.split(':')[0];
      if (hostIP !== 'localhost' && hostIP !== '127.0.0.1') {
        networkIP = hostIP;
      }
    }
    
    finalUrl = `http://${networkIP}:5000/uploads/${cleanPath}`;
    console.log('📱 Mobile URL generated:', finalUrl);
  } else {
    // ✅ DESKTOP: Use localhost backend
    finalUrl = `http://localhost:5000/uploads/${cleanPath}`;
    console.log('💻 Desktop URL generated:', finalUrl);
  }
  
  return finalUrl;
};

// ✅ FORCE NO-CACHE middleware for all requests
router.use((req, res, next) => {
  res.set({
    'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
    'Pragma': 'no-cache',
    'Expires': '0',
    'X-Mobile-Compatible': 'true',
    'X-Timestamp': Date.now().toString()
  });
  next();
});

// Get all advertisements (public route)
router.get('/', async (req, res) => {
  try {
    console.log('📢 GET /api/advertisements - Query params:', req.query);
    console.log('📢 Request analysis:', {
      host: req.get('host'),
      userAgent: req.get('user-agent')?.includes('Mobile') ? 'MOBILE' : 'DESKTOP',
      referer: req.get('referer')
    });
    
    const { isActive, placement, featured } = req.query;
    
    let filter = {};
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (placement) filter.placement = placement;
    if (featured !== undefined) filter.featured = featured === 'true';

    console.log('🔍 Applied filter:', filter);

    const ads = await Advertisement.find(filter).sort({ createdAt: -1 }).select('-__v');
    console.log(`✅ Found ${ads.length} advertisements in database`);

    // ✅ MOBILE COMPATIBLE: Return ads with proper URLs and no caching
    const adsWithUrls = ads.map((ad, index) => {
      const adObj = ad.toObject();
      const mobileUrl = buildMobileCompatibleUrl(adObj.mediaUrl, req);
      
      console.log(`📱 Ad ${index + 1}: "${ad.title}"`);
      console.log(`   Original: ${adObj.mediaUrl}`);
      console.log(`   Mobile URL: ${mobileUrl}`);
      
      return {
        ...adObj,
        mediaUrl: mobileUrl,
        _timestamp: Date.now(), // Force refresh
        _mobile: req.get('user-agent')?.includes('Mobile') || false
      };
    });

    console.log(`📤 Returning ${adsWithUrls.length} advertisements with mobile-compatible URLs`);
    
    // ✅ CRITICAL: Return as plain array (not wrapped object)
    res.json(adsWithUrls);
  } catch (error) {
    console.error('❌ Error fetching advertisements:', error);
    res.status(500).json({ message: 'Error fetching advertisements', error: error.message });
  }
});

// Get single advertisement by ID
router.get('/:id', async (req, res) => {
  try {
    const ad = await Advertisement.findById(req.params.id);
    if (!ad) {
      return res.status(404).json({ message: 'Advertisement not found' });
    }

    // Increment impression count
    ad.impressionCount += 1;
    await ad.save();

    const adWithUrl = {
      ...ad.toObject(),
      mediaUrl: buildMobileCompatibleUrl(ad.mediaUrl, req),
      _timestamp: Date.now()
    };

    res.json(adWithUrl);
  } catch (error) {
    console.error('❌ Error fetching advertisement:', error);
    res.status(500).json({ message: 'Error fetching advertisement', error: error.message });
  }
});

// ✅ CREATE ADVERTISEMENT
router.post('/', protect, isAdmin, uploadAdvertisement.single('media'), async (req, res) => {
  try {
    console.log('📝 POST /api/advertisements - Creating advertisement');
    console.log('📎 File info:', req.file ? {
      filename: req.file.filename,
      mimetype: req.file.mimetype,
      destination: req.file.destination,
      path: req.file.path
    } : 'No file uploaded');

    if (!req.file) {
      return res.status(400).json({ message: 'Media file is required' });
    }

    const { title, content, targetAudience, link, placement, isActive, featured } = req.body;

    if (!title || !content) {
      return res.status(400).json({ message: 'Title and content are required' });
    }

    const mediaType = req.file.mimetype.startsWith('video/') ? 'video' : 'image';
    
    // ✅ Store clean path in database
    const isVideo = req.file.mimetype.startsWith('video/');
    const subfolder = isVideo ? 'videos' : 'images';
    const cleanMediaUrl = `advertisements/${subfolder}/${req.file.filename}`;

    console.log(`✅ Storing clean path in DB: ${cleanMediaUrl}`);

    const advertisement = new Advertisement({
      title,
      content,
      mediaUrl: cleanMediaUrl, // Clean path stored
      mediaType,
      targetAudience: targetAudience || 'all',
      link: link || '',
      placement: placement || 'homepage',
      isActive: isActive !== undefined ? isActive === 'true' || isActive === true : true,
      featured: featured !== undefined ? featured === 'true' || featured === true : false
    });

    const savedAd = await advertisement.save();
    
    // Return with mobile-compatible URL
    const responseAd = {
      ...savedAd.toObject(),
      mediaUrl: buildMobileCompatibleUrl(savedAd.mediaUrl, req),
      _timestamp: Date.now()
    };

    console.log('✅ Advertisement created successfully');
    res.status(201).json(responseAd);
  } catch (error) {
    console.error('❌ Error creating advertisement:', error);
    
    // Cleanup uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ message: 'Error creating advertisement', error: error.message });
  }
});

// ✅ UPDATE ADVERTISEMENT
router.put('/:id', protect, isAdmin, uploadAdvertisement.single('media'), async (req, res) => {
  try {
    console.log('📝 PUT /api/advertisements - Updating:', req.params.id);

    const ad = await Advertisement.findById(req.params.id);
    if (!ad) {
      return res.status(404).json({ message: 'Advertisement not found' });
    }

    const { title, content, targetAudience, link, placement, isActive, featured } = req.body;
    const updateData = {};

    if (title) updateData.title = title;
    if (content) updateData.content = content;
    if (targetAudience) updateData.targetAudience = targetAudience;
    if (link !== undefined) updateData.link = link;
    if (placement) updateData.placement = placement;
    if (isActive !== undefined) updateData.isActive = isActive === 'true' || isActive === true;
    if (featured !== undefined) updateData.featured = featured === 'true' || featured === true;

    if (req.file) {
      // Delete old file
      if (ad.mediaUrl) {
        const oldFilePath = path.join(__dirname, '../uploads', ad.mediaUrl);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }
      
      // Store clean path
      const isVideo = req.file.mimetype.startsWith('video/');
      const subfolder = isVideo ? 'videos' : 'images';
      updateData.mediaUrl = `advertisements/${subfolder}/${req.file.filename}`;
      updateData.mediaType = isVideo ? 'video' : 'image';
    }

    const updatedAd = await Advertisement.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    const responseAd = {
      ...updatedAd.toObject(),
      mediaUrl: buildMobileCompatibleUrl(updatedAd.mediaUrl, req),
      _timestamp: Date.now()
    };

    res.json(responseAd);
  } catch (error) {
    console.error('❌ Error updating advertisement:', error);
    
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ message: 'Error updating advertisement', error: error.message });
  }
});

// Delete advertisement
router.delete('/:id', protect, isAdmin, async (req, res) => {
  try {
    console.log('🗑️ DELETE /api/advertisements - Deleting:', req.params.id);

    const ad = await Advertisement.findById(req.params.id);
    if (!ad) {
      return res.status(404).json({ message: 'Advertisement not found' });
    }

    // Delete media file
    if (ad.mediaUrl) {
      const filePath = path.join(__dirname, '../uploads', ad.mediaUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await Advertisement.findByIdAndDelete(req.params.id);
    res.json({ message: 'Advertisement deleted successfully' });
  } catch (error) {
    console.error('❌ Error deleting advertisement:', error);
    res.status(500).json({ message: 'Error deleting advertisement', error: error.message });
  }
});

// Track click
router.post('/:id/click', async (req, res) => {
  try {
    const ad = await Advertisement.findById(req.params.id);
    if (!ad) {
      return res.status(404).json({ message: 'Advertisement not found' });
    }

    ad.clickCount += 1;
    await ad.save();

    res.json({ 
      message: 'Click tracked successfully',
      clickCount: ad.clickCount
    });
  } catch (error) {
    console.error('❌ Error tracking click:', error);
    res.status(500).json({ message: 'Error tracking click', error: error.message });
  }
});

// Analytics
router.get('/:id/analytics', protect, isAdmin, async (req, res) => {
  try {
    const ad = await Advertisement.findById(req.params.id);
    if (!ad) {
      return res.status(404).json({ message: 'Advertisement not found' });
    }

    const analytics = {
      impressions: ad.impressionCount || 0,
      clicks: ad.clickCount || 0,
      ctr: ad.impressionCount > 0 ? ((ad.clickCount || 0) / ad.impressionCount * 100).toFixed(2) : 0,
      createdAt: ad.createdAt,
      isActive: ad.isActive,
      featured: ad.featured
    };

    res.json(analytics);
  } catch (error) {
    console.error('❌ Error fetching analytics:', error);
    res.status(500).json({ message: 'Error fetching analytics', error: error.message });
  }
});

module.exports = router;
