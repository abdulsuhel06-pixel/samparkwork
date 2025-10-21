const express = require("express");
const { protect, authorize, isAdmin, isProfessional, isClient } = require("../middleware/authMiddleware");
const { 
  uploadAvatar, 
  uploadCertificate, 
  uploadPortfolio,
  uploadCompanyImage
} = require("../middleware/uploadMiddleware");
const {
  getProfessionals,
  getProfile,
  updateProfile,
  uploadProfileImage,
  uploadCertificateFile,
  uploadPortfolioFile,
  uploadCompanyImageFile,
  deleteCompanyImageFile,
  deleteAvatarFile,
  getUserById,
  deletePortfolioItem,
  deleteCertificate,
  getAllUsers,
  getUserStats,
  updateUserRole,
  deactivateUser,
  // ✅ NEW: Education CRUD methods
  addEducation,
  updateEducation,
  deleteEducation,
  // ✅ NEW: Experience CRUD methods
  addExperience,
  updateExperience,
  deleteExperience,
  // ✅ NEW: Address validation
  validateAddress
} = require("../controllers/userController");

const router = express.Router();

// Error handling middleware for multer
const handleMulterError = (err, req, res, next) => {
  if (err) {
    console.error("❌ Multer error:", err);
    return res.status(500).json({ message: 'File upload error', error: err.message });
  }
  next();
};

// Debug middleware
router.use((req, res, next) => {
  console.log(`🔍 userRouter: ${req.method} ${req.path}`);
  next();
});

// ✅ PUBLIC ROUTES
router.get("/professionals", getProfessionals);

// ✅ PROTECTED ROUTES
router.use(protect);

// ✅ PROFILE ROUTES
router.get("/profile", getProfile);
router.put("/profile", updateProfile);

// ✅ AVATAR ROUTES
router.post("/profile/avatar", uploadAvatar.single('avatar'), handleMulterError, uploadProfileImage);
router.delete("/profile/avatar", deleteAvatarFile);

// ✅ NEW: EDUCATION CRUD ROUTES
router.post("/profile/education", addEducation);
router.put("/profile/education/:educationId", updateEducation);
router.delete("/profile/education/:educationId", deleteEducation);

// ✅ NEW: EXPERIENCE CRUD ROUTES
router.post("/profile/experience", addExperience);
router.put("/profile/experience/:experienceId", updateExperience);
router.delete("/profile/experience/:experienceId", deleteExperience);

// ✅ NEW: ADDRESS VALIDATION ROUTE
router.post("/profile/validate-address", validateAddress);

// ✅ PROFESSIONAL-ONLY ROUTES
router.post("/profile/certificate", 
  isProfessional, 
  uploadCertificate.single('certificate'), 
  handleMulterError, 
  uploadCertificateFile
);
router.delete("/profile/certificate/:certId", isProfessional, deleteCertificate);

router.post("/profile/portfolio", 
  isProfessional, 
  uploadPortfolio.single('portfolioFile'), 
  handleMulterError, 
  uploadPortfolioFile
);
router.delete("/profile/portfolio/:itemId", isProfessional, deletePortfolioItem);

// ✅ CLIENT-ONLY ROUTES
router.post("/profile/company-image",
  isClient,
  uploadCompanyImage.single('companyImage'),
  handleMulterError,
  uploadCompanyImageFile
);
router.delete("/profile/company-image", isClient, deleteCompanyImageFile);

// ✅ ADMIN-ONLY ROUTES
router.get("/admin/all-users", isAdmin, getAllUsers);
router.get("/admin/user-stats", isAdmin, getUserStats);
router.put("/admin/user/:userId/role", isAdmin, updateUserRole);
router.put("/admin/user/:userId/deactivate", isAdmin, deactivateUser);

// ✅ PARAMETERIZED ROUTES
router.get("/:userId", getUserById);

module.exports = router;
