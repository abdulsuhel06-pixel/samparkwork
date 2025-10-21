const express = require("express");
const { body, validationResult } = require("express-validator");
const { signup, login, getMe } = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// Debug middleware
router.use((req, res, next) => {
  console.log(`🔐 authRouter: ${req.method} ${req.path}`);
  next();
});

// ✅ FIXED: More reasonable password validation
const validateSignup = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  // ✅ CRITICAL FIX: Relaxed password validation - allows @raja12
  body('password')
    .isLength({ min: 6, max: 30 })
    .withMessage('Password must be between 6 and 30 characters')
    .matches(/^(?=.*[a-z])(?=.*[0-9])/)
    .withMessage('Password must contain at least one lowercase letter and one number')
    .matches(/^[a-zA-Z0-9@#$%^&*!._-]+$/)
    .withMessage('Password can only contain letters, numbers, and these special characters: @#$%^&*!._-'),
  
  body('role')
    .optional()
    .isIn(['user', 'professional', 'client', 'admin'])
    .withMessage('Invalid role specified')
];

// ✅ ALTERNATIVE: Very lenient validation (for testing)
const validateSignupLenient = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required'),
    
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
    
  // ✅ VERY LENIENT: Only requires 4+ characters
  body('password')
    .isLength({ min: 4 })
    .withMessage('Password must be at least 4 characters long'),
    
  body('role')
    .optional()
    .isIn(['user', 'professional', 'client', 'admin'])
    .withMessage('Invalid role specified')
];

const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// ✅ ENHANCED: Better error handling with more user-friendly messages
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log("❌ Validation errors:", errors.array());
    
    // Format errors for better user experience
    const formattedErrors = errors.array().map(error => ({
      type: 'field',
      value: error.value,
      msg: error.msg,
      path: error.path || error.param,
      location: error.location || 'body'
    }));

    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: formattedErrors,
      totalErrors: formattedErrors.length
    });
  }
  
  console.log("✅ Validation passed successfully");
  next();
};

// ✅ FIXED: Auth routes with better validation
router.post("/signup", 
  validateSignupLenient, // Use lenient validation for easier signup
  handleValidationErrors, 
  async (req, res, next) => {
    try {
      console.log("📝 User signup attempt:", req.body.email);
      console.log("📝 Password length:", req.body.password?.length);
      await signup(req, res, next);
    } catch (error) {
      console.error("❌ Signup error:", error);
      next(error);
    }
  }
);

router.post("/login", 
  validateLogin, 
  handleValidationErrors, 
  async (req, res, next) => {
    try {
      console.log("🔑 User login attempt:", req.body.email);
      await login(req, res, next);
    } catch (error) {
      console.error("❌ Login error:", error);
      next(error);
    }
  }
);

router.get("/me", protect, async (req, res, next) => {
  try {
    console.log("👤 Get current user:", req.user?.id);
    await getMe(req, res, next);
  } catch (error) {
    console.error("❌ Get user error:", error);
    next(error);
  }
});

// Additional auth routes for better functionality
router.post("/logout", protect, async (req, res) => {
  try {
    console.log("🚪 User logout:", req.user?.id);
    res.json({ 
      success: true,
      message: 'Logged out successfully',
      instructions: 'Please remove the token from your client storage'
    });
  } catch (error) {
    console.error("❌ Logout error:", error);
    res.status(500).json({ 
      success: false,
      message: 'Error during logout', 
      error: error.message 
    });
  }
});

router.post("/refresh-token", protect, async (req, res) => {
  try {
    console.log("🔄 Token refresh request:", req.user?.id);
    
    const jwt = require('jsonwebtoken');
    const newToken = jwt.sign(
      { id: req.user.id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({ 
      success: true,
      message: 'Token refreshed successfully',
      token: newToken,
      expiresIn: '7d'
    });
  } catch (error) {
    console.error("❌ Token refresh error:", error);
    res.status(500).json({ 
      success: false,
      message: 'Error refreshing token', 
      error: error.message 
    });
  }
});

// ✅ ENHANCED: Better error handling middleware
router.use((err, req, res, next) => {
  console.error("❌ Auth route error:", err);
  
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ 
      success: false,
      message: 'Invalid token', 
      error: 'Authentication failed' 
    });
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ 
      success: false,
      message: 'Token expired', 
      error: 'Please login again' 
    });
  }
  
  if (err.code === 11000) {
    return res.status(409).json({ 
      success: false,
      message: 'Email already exists', 
      error: 'Duplicate user' 
    });
  }
  
  res.status(500).json({ 
    success: false,
    message: 'Internal server error in authentication',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Authentication failed'
  });
});

console.log("✅ authRoutes module loaded successfully");

module.exports = router;
