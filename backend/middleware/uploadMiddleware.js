const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure directories exist
const ensureDirectoryExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`✅ Created directory: ${dirPath}`);
  }
};

// Avatar storage
const avatarStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../uploads/avatars');
    ensureDirectoryExists(uploadPath);
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = 'avatar-' + uniqueSuffix + path.extname(file.originalname);
    console.log(`📸 Avatar filename: ${filename}`);
    cb(null, filename);
  }
});

// Certificate storage
const certificateStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../uploads/certificates');
    ensureDirectoryExists(uploadPath);
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = 'certificate-' + uniqueSuffix + path.extname(file.originalname);
    console.log(`📄 Certificate filename: ${filename}`);
    cb(null, filename);
  }
});

// Portfolio storage
const portfolioStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../uploads/portfolio');
    ensureDirectoryExists(uploadPath);
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = 'portfolio-' + uniqueSuffix + path.extname(file.originalname);
    console.log(`🎨 Portfolio filename: ${filename}`);
    cb(null, filename);
  }
});

// Category image storage
const categoryStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../uploads/categories');
    ensureDirectoryExists(uploadPath);
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = 'category-' + uniqueSuffix + path.extname(file.originalname);
    console.log(`📂 Category filename: ${filename}`);
    cb(null, filename);
  }
});

// ✅ ADDED: Advertisement storage configuration
const advertisementStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Determine if it's video or image
    const isVideo = file.mimetype.startsWith('video/');
    const subfolder = isVideo ? 'videos' : 'images';
    const uploadPath = path.join(__dirname, '../uploads/advertisements', subfolder);
    
    ensureDirectoryExists(uploadPath);
    console.log(`📺 Advertisement upload path: ${uploadPath}`);
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = 'ad-' + uniqueSuffix + path.extname(file.originalname);
    console.log(`📺 Advertisement filename: ${filename}`);
    cb(null, filename);
  }
});

// ✅ CRITICAL FIX: Company Image Storage Configuration
const companyImageStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    // ✅ FIXED: Use proper path.join instead of relative path
    const uploadPath = path.join(__dirname, '../uploads/companies');
    ensureDirectoryExists(uploadPath);
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = 'company-' + uniqueSuffix + path.extname(file.originalname);
    console.log(`🏢 Company filename: ${filename}`);
    cb(null, filename);
  }
});

// ✅ ENHANCED: File filter function with video support
const fileFilter = (req, file, cb) => {
  console.log(`📁 File upload attempt: ${file.originalname}, Type: ${file.mimetype}`);
  
  const allowedTypes = {
    'image/jpeg': true,
    'image/jpg': true,
    'image/png': true,
    'image/gif': true,
    'image/webp': true,
    'application/pdf': true,
    'video/mp4': true,
    'video/avi': true,
    'video/quicktime': true,
    'video/x-msvideo': true,
    'video/x-ms-wmv': true,
    'video/webm': true
  };

  if (allowedTypes[file.mimetype]) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} not allowed`), false);
  }
};

// Upload configurations
const uploadAvatar = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: fileFilter
});

const uploadCertificate = multer({
  storage: certificateStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: fileFilter
});

const uploadPortfolio = multer({
  storage: portfolioStorage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: fileFilter
});

const uploadCategoryImage = multer({
  storage: categoryStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: fileFilter
});

// ✅ ADDED: Advertisement upload configuration
const uploadAdvertisement = multer({
  storage: advertisementStorage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB for videos
  fileFilter: fileFilter
});

const uploadCompanyImage = multer({
  storage: companyImageStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    // Check file type
    const filetypes = /jpeg|jpg|png|gif|webp/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed!'));
    }
  }
});

module.exports = {
  uploadAvatar,
  uploadCertificate,
  uploadPortfolio,
  uploadCategoryImage,
  uploadAdvertisement, // ✅ ADDED
  uploadCompanyImage  
};
