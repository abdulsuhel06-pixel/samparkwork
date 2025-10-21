const mongoose = require("mongoose");

// Path validation function to prevent 'uploads/' in stored paths
const validateMediaPath = (path) => {
  if (!path) return true; // Allow empty paths
  
  // Path should not contain 'uploads/' anywhere
  if (path.includes('uploads/')) {
    throw new Error('mediaUrl should not contain "uploads/" prefix. Use format: advertisements/{videos|images}/filename');
  }
  
  // Path should start with 'advertisements/'
  if (!path.startsWith('advertisements/')) {
    throw new Error('mediaUrl must start with "advertisements/". Use format: advertisements/{videos|images}/filename');
  }
  
  return true;
};

const advertisementSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    mediaUrl: {
      type: String,
      required: true,
      validate: {
        validator: validateMediaPath,
        message: 'Invalid mediaUrl format. Should be: advertisements/{videos|images}/filename'
      }
    },
    mediaType: {
      type: String,
      enum: ["image", "video"],
      required: true,
    },
    targetAudience: {
      type: String,
      enum: ["all", "job-seekers", "employers", "professionals"],
      default: "all",
    },
    link: {
      type: String,
      default: "",
    },
    placement: {
      type: String,
      enum: ["homepage", "sidebar", "banner"],
      default: "homepage",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    featured: {
      type: Boolean,
      default: false,
    },
    clickCount: {
      type: Number,
      default: 0,
    },
    impressionCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// ✅ PRE-SAVE HOOK: Automatically clean paths before saving
advertisementSchema.pre('save', function(next) {
  if (this.mediaUrl && this.isModified('mediaUrl')) {
    console.log('🧹 Cleaning mediaUrl before save:', this.mediaUrl);
    
    // Clean the path before saving
    let cleanPath = this.mediaUrl.replace(/\\/g, '/'); // Convert backslashes
    cleanPath = cleanPath.replace(/^\/+/, ''); // Remove leading slashes
    
    // ✅ CRITICAL: Remove ALL occurrences of 'uploads/' from path
    while (cleanPath.includes('uploads/')) {
      cleanPath = cleanPath.replace('uploads/', '');
      console.log('🔧 Removed "uploads/" from path, now:', cleanPath);
    }
    
    // Ensure proper format: advertisements/{videos|images}/filename
    if (!cleanPath.startsWith('advertisements/')) {
      const filename = cleanPath.split('/').pop();
      const isVideo = this.mediaType === 'video' || cleanPath.includes('video');
      const subfolder = isVideo ? 'videos' : 'images';
      cleanPath = `advertisements/${subfolder}/${filename}`;
      console.log('🔧 Fixed path format to:', cleanPath);
    }
    
    this.mediaUrl = cleanPath;
    console.log('✅ Final cleaned mediaUrl:', this.mediaUrl);
  }
  next();
});

// ✅ FIND HOOK: Clean corrupted paths when retrieving from database
advertisementSchema.post(['find', 'findOne', 'findOneAndUpdate'], function(docs) {
  if (!docs) return;
  
  const documents = Array.isArray(docs) ? docs : [docs];
  
  documents.forEach(doc => {
    if (doc && doc.mediaUrl && doc.mediaUrl.includes('uploads/')) {
      console.log('🧹 Cleaning corrupted path on retrieval:', doc.mediaUrl);
      
      let cleanPath = doc.mediaUrl.replace(/\\/g, '/').replace(/^\/+/, '');
      
      while (cleanPath.includes('uploads/')) {
        cleanPath = cleanPath.replace('uploads/', '');
      }
      
      if (!cleanPath.startsWith('advertisements/')) {
        const filename = cleanPath.split('/').pop();
        const isVideo = doc.mediaType === 'video' || cleanPath.includes('video');
        const subfolder = isVideo ? 'videos' : 'images';
        cleanPath = `advertisements/${subfolder}/${filename}`;
      }
      
      doc.mediaUrl = cleanPath;
      console.log('✅ Auto-cleaned corrupted path to:', cleanPath);
      
      // Save the cleaned path back to database
      doc.save().catch(err => console.log('Warning: Could not auto-save cleaned path:', err.message));
    }
  });
});

module.exports = mongoose.model("Advertisement", advertisementSchema);
