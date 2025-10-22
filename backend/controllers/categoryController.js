const Category = require("../models/Category");
const path = require("path");
const fs = require("fs");

// ✅ PRODUCTION-READY: Smart image URL generation
const generateImageUrl = (imagePath, req) => {
  if (!imagePath) return null;
  
  console.log('🖼️ [generateImageUrl] Processing:', imagePath);
  console.log('🖼️ [generateImageUrl] Environment:', process.env.NODE_ENV);
  
  // If already a full URL, return as is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  
  // Ensure proper path formatting
  let cleanPath = imagePath;
  if (!cleanPath.startsWith('/uploads/')) {
    if (!cleanPath.includes('/')) {
      cleanPath = `/uploads/categories/${cleanPath}`;
    } else if (cleanPath.startsWith('uploads/')) {
      cleanPath = `/${cleanPath}`;
    }
  }
  
  // ✅ PRODUCTION-AWARE URL GENERATION
  const isProduction = process.env.NODE_ENV === 'production';
  const BASE_URL = isProduction 
    ? 'https://samparkwork-backend.onrender.com' 
    : 'http://localhost:5000';
  
  const finalUrl = `${BASE_URL}${cleanPath}`;
  
  console.log(`🌐 Generated ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'} URL:`, finalUrl);
  
  return finalUrl;
};

// @desc    Get featured categories with industry filtering
// @route   GET /api/categories/featured?industry=Jewellery
// @access  Public
const getFeaturedCategories = async (req, res) => {
  try {
    console.log("🔍 [getFeaturedCategories] === STARTING ===");
    console.log("🔍 [getFeaturedCategories] Environment:", process.env.NODE_ENV);
    
    // Set no-cache headers
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0',
      'X-Mobile-Compatible': 'true',
      'X-Environment': process.env.NODE_ENV || 'development',
      'X-Timestamp': Date.now().toString()
    });
    
    const { industry } = req.query;
    console.log("🏭 [getFeaturedCategories] Industry filter:", industry);
    
    const query = {
      isFeatured: true,
      active: true
    };
    
    if (industry && industry !== 'All') {
      query.industry = industry;
      console.log("🏭 [getFeaturedCategories] Applying industry filter:", industry);
    }
    
    const categories = await Category.find(query)
    .select('name description image industry parentCategory createdAt')
    .sort({ createdAt: -1 })
    .limit(16);
    
    console.log(`✅ [getFeaturedCategories] Found ${categories.length} categories in database`);
    
    // ✅ Generate production-ready image URLs
    const categoriesWithUrls = categories.map((category, index) => {
      const categoryObj = category.toObject();
      const imageUrl = generateImageUrl(categoryObj.image, req);
      
      console.log(`📱 Category ${index + 1}: "${category.name}"`);
      console.log(`   Original: ${categoryObj.image}`);
      console.log(`   Final URL: ${imageUrl}`);
      
      return {
        ...categoryObj,
        imageUrl: imageUrl,
        _timestamp: Date.now(),
        _environment: process.env.NODE_ENV || 'development'
      };
    });
    
    console.log(`📤 [getFeaturedCategories] Returning ${categoriesWithUrls.length} categories`);
    
    res.status(200).json({
      success: true,
      count: categoriesWithUrls.length,
      industry: industry || 'All',
      categories: categoriesWithUrls,
      environment: process.env.NODE_ENV || 'development'
    });
    
  } catch (error) {
    console.error("❌ [getFeaturedCategories] Error:", error);
    res.status(500).json({ 
      success: false,
      message: "Unable to load featured categories", 
      error: process.env.NODE_ENV === 'development' ? error.message : 'Service temporarily unavailable'
    });
  }
};

// @desc    Get all categories
// @route   GET /api/admin/categories
// @access  Admin
const getCategories = async (req, res) => {
  try {
    console.log("🔍 [getCategories] Fetching all categories (Admin)");
    
    // Set no-cache headers
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'X-Mobile-Compatible': 'true',
      'X-Environment': process.env.NODE_ENV || 'development'
    });
    
    const categories = await Category.find().sort({ createdAt: -1 });
    console.log(`✅ [getCategories] Found ${categories.length} categories`);
    
    const categoriesWithUrls = categories.map(category => {
      const categoryObj = category.toObject();
      return {
        ...categoryObj,
        imageUrl: generateImageUrl(categoryObj.image, req),
        _timestamp: Date.now()
      };
    });
    
    res.json({
      success: true,
      count: categoriesWithUrls.length,
      categories: categoriesWithUrls,
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    console.error("❌ [getCategories] Error:", error);
    res.status(500).json({ 
      success: false,
      message: "Server error", 
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Create new category
// @route   POST /api/admin/categories
// @access  Admin
const createCategory = async (req, res) => {
  try {
    console.log("📝 [createCategory] Creating new category");
    console.log("📝 [createCategory] Environment:", process.env.NODE_ENV);
    console.log("📝 [createCategory] Body:", req.body);
    console.log("📝 [createCategory] File:", req.file);
    
    const { name, industry, parentCategory, description, isFeatured } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ 
        success: false,
        message: "Category name is required" 
      });
    }

    if (!industry) {
      return res.status(400).json({ 
        success: false,
        message: "Industry is required" 
      });
    }

    if (!parentCategory) {
      return res.status(400).json({ 
        success: false,
        message: "Parent category is required" 
      });
    }

    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        message: "Category image is required" 
      });
    }

    const existingCategory = await Category.findOne({ 
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') }
    });
    
    if (existingCategory) {
      if (req.file) {
        const filePath = path.join(__dirname, "..", "uploads", "categories", req.file.filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
      return res.status(400).json({
        success: false,
        message: "Category with this name already exists"
      });
    }

    // ✅ STORE RELATIVE PATH (NOT FULL URL)
    let imagePath = null;
    if (req.file) {
      imagePath = `uploads/categories/${req.file.filename}`;  // No leading slash
      console.log("📷 [createCategory] Image saved with relative path:", imagePath);
    }

    const category = new Category({
      name: name.trim(),
      industry: industry?.trim(),
      parentCategory: parentCategory?.trim(),
      description: description?.trim(),
      isFeatured: isFeatured === "true" || isFeatured === true,
      image: imagePath,  // Store relative path
    });

    const createdCategory = await category.save();
    console.log("✅ [createCategory] Category created:", createdCategory.name);
    
    const categoryResponse = {
      ...createdCategory.toObject(),
      imageUrl: generateImageUrl(createdCategory.image, req),
      _timestamp: Date.now()
    };
    
    res.status(201).json({
      success: true,
      message: "Category created successfully",
      category: categoryResponse
    });
  } catch (error) {
    console.error("❌ [createCategory] Error:", error);
    
    // Cleanup uploaded file on error
    if (req.file) {
      const filePath = path.join(__dirname, "..", "uploads", "categories", req.file.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    
    res.status(500).json({ 
      success: false,
      message: "Failed to create category", 
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Update category
// @route   PUT /api/admin/categories/:id
// @access  Admin
const updateCategory = async (req, res) => {
  try {
    console.log(`🔄 [updateCategory] Updating category: ${req.params.id}`);
    console.log("🔄 [updateCategory] Environment:", process.env.NODE_ENV);
    
    const { name, industry, parentCategory, description, isFeatured } = req.body;

    const category = await Category.findById(req.params.id);
    if (!category) {
      if (req.file) {
        const filePath = path.join(__dirname, "..", "uploads", "categories", req.file.filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
      return res.status(404).json({ 
        success: false,
        message: "Category not found" 
      });
    }

    // Check for duplicate names
    if (name && name.trim() !== category.name) {
      const existingCategory = await Category.findOne({ 
        name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
        _id: { $ne: req.params.id }
      });
      
      if (existingCategory) {
        if (req.file) {
          const filePath = path.join(__dirname, "..", "uploads", "categories", req.file.filename);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        }
        return res.status(400).json({
          success: false,
          message: "Category with this name already exists"
        });
      }
    }

    // Update fields
    if (name) category.name = name.trim();
    if (industry !== undefined) category.industry = industry?.trim();
    if (parentCategory !== undefined) category.parentCategory = parentCategory?.trim();
    if (description !== undefined) category.description = description?.trim();
    if (isFeatured !== undefined) {
      category.isFeatured = isFeatured === "true" || isFeatured === true;
    }

    // Handle image updates
    if (req.file) {
      // Delete old image
      if (category.image) {
        const oldImagePath = category.image.replace(/^\/uploads\/categories\//, '').replace(/^uploads\/categories\//, '');
        const oldPath = path.join(__dirname, "..", "uploads", "categories", oldImagePath);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }
      // ✅ Set relative path (no leading slash)
      category.image = `uploads/categories/${req.file.filename}`;
      console.log("📷 [updateCategory] New image set with relative path:", category.image);
    }

    const updatedCategory = await category.save();
    console.log("✅ [updateCategory] Category updated:", updatedCategory.name);
    
    const categoryResponse = {
      ...updatedCategory.toObject(),
      imageUrl: generateImageUrl(updatedCategory.image, req),
      _timestamp: Date.now()
    };
    
    res.json({
      success: true,
      message: "Category updated successfully",
      category: categoryResponse
    });
  } catch (error) {
    console.error("❌ [updateCategory] Error:", error);
    if (req.file) {
      const filePath = path.join(__dirname, "..", "uploads", "categories", req.file.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    res.status(500).json({ 
      success: false,
      message: "Failed to update category", 
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Delete category
// @route   DELETE /api/admin/categories/:id
// @access  Admin
const deleteCategory = async (req, res) => {
  try {
    console.log(`🗑️ [deleteCategory] Deleting category: ${req.params.id}`);
    
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ 
        success: false,
        message: "Category not found" 
      });
    }

    // Clean up image file
    if (category.image) {
      const imagePath = category.image.replace(/^\/uploads\/categories\//, '').replace(/^uploads\/categories\//, '');
      const fullPath = path.join(__dirname, "..", "uploads", "categories", imagePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    }

    await category.deleteOne();
    
    res.json({ 
      success: true,
      message: "Category deleted successfully" 
    });
  } catch (error) {
    console.error("❌ [deleteCategory] Error:", error);
    res.status(500).json({ 
      success: false,
      message: "Failed to delete category", 
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Toggle featured flag of a category
// @route   PATCH /api/admin/categories/:id/featured
// @access  Admin
const toggleFeaturedCategory = async (req, res) => {
  try {
    console.log(`⭐ [toggleFeaturedCategory] Toggling featured status: ${req.params.id}`);
    
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ 
        success: false,
        message: "Category not found" 
      });
    }

    const previousStatus = category.isFeatured;
    category.isFeatured = !category.isFeatured;
    
    await category.save();
    
    const categoryResponse = {
      ...category.toObject(),
      imageUrl: generateImageUrl(category.image, req),
      _timestamp: Date.now()
    };
    
    res.json({
      success: true,
      message: `Category ${category.isFeatured ? 'marked as featured' : 'removed from featured'}`,
      category: categoryResponse
    });
  } catch (error) {
    console.error("❌ [toggleFeaturedCategory] Error:", error);
    res.status(500).json({ 
      success: false,
      message: "Failed to update featured status", 
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

module.exports = {
  getCategories,
  getFeaturedCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  toggleFeaturedCategory,
};
