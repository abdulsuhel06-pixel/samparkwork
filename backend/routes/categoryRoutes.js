const express = require("express");
const { protect, isAdmin } = require("../middleware/authMiddleware");
const { uploadCategoryImage } = require("../middleware/uploadMiddleware");
const {
  getCategories,
  getFeaturedCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  toggleFeaturedCategory,
} = require("../controllers/categoryController");

const router = express.Router();

// ✅ DEBUG: Enhanced logging for troubleshooting
router.use((req, res, next) => {
  console.log(`🔍 [categoryRoutes] ${req.method} ${req.path}`);
  console.log(`🔍 [categoryRoutes] Full URL: ${req.originalUrl}`);
  console.log(`🔍 [categoryRoutes] Headers:`, {
    'content-type': req.get('content-type'),
    'authorization': req.get('authorization') ? 'Present' : 'Missing'
  });
  next();
});

// ✅ PUBLIC ROUTE: Featured categories - MUST BE FIRST
router.get("/featured", getFeaturedCategories);

// ✅ PROTECTED: Admin-only routes with proper middleware order
router.get("/", protect, isAdmin, getCategories);
router.post("/", protect, isAdmin, uploadCategoryImage.single("image"), createCategory);
router.put("/:id", protect, isAdmin, uploadCategoryImage.single("image"), updateCategory);
router.delete("/:id", protect, isAdmin, deleteCategory);
router.patch("/:id/featured", protect, isAdmin, toggleFeaturedCategory);

console.log("✅ categoryRoutes module loaded successfully");

module.exports = router;
