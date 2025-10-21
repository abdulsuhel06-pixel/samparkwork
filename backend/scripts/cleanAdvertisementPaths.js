const mongoose = require('mongoose');
require('dotenv').config();

// Construct MongoDB URI from your encrypted env variables
const MONGODB_URI = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}/${process.env.DB_NAME}?retryWrites=true&w=majority`;

const cleanAdvertisementPaths = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const Advertisement = mongoose.model('Advertisement', require('../models/Advertisement').schema);
    
    const ads = await Advertisement.find({});
    console.log(`📋 Found ${ads.length} advertisements to check`);

    let fixedCount = 0;
    
    for (const ad of ads) {
      if (ad.mediaUrl) {
        const originalPath = ad.mediaUrl;
        console.log(`🔍 Checking: ${ad.title} - Path: ${originalPath}`);
        
        // Clean the path by removing all 'uploads/' occurrences
        let cleanPath = originalPath.replace(/\\/g, '/'); // Convert backslashes
        cleanPath = cleanPath.replace(/^\/+/, ''); // Remove leading slashes
        
        // Remove ALL instances of 'uploads/'
        while (cleanPath.includes('uploads/')) {
          cleanPath = cleanPath.replace('uploads/', '');
        }
        
        // Ensure proper format: advertisements/{videos|images}/filename
        if (!cleanPath.startsWith('advertisements/')) {
          const filename = cleanPath.split('/').pop();
          const isVideo = ad.mediaType === 'video' || originalPath.includes('video');
          const subfolder = isVideo ? 'videos' : 'images';
          cleanPath = `advertisements/${subfolder}/${filename}`;
        }
        
        if (cleanPath !== originalPath) {
          console.log(`🔧 Fixing path:`);
          console.log(`   Before: ${originalPath}`);
          console.log(`   After:  ${cleanPath}`);
          
          ad.mediaUrl = cleanPath;
          await ad.save();
          fixedCount++;
        }
      }
    }
    
    console.log(`✅ Fixed ${fixedCount} advertisement paths`);
    console.log('🎉 Database cleanup complete!');
    
  } catch (error) {
    console.error('❌ Error cleaning paths:', error);
  } finally {
    await mongoose.disconnect();
  }
};

cleanAdvertisementPaths();
