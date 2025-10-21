const User = require("../models/User");
const jwt = require("jsonwebtoken");
const asyncHandler = require("express-async-handler");

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// ✅ CRITICAL FIX: Generate clean avatar URLs with proper path prefix
const generateAvatarUrl = (avatarPath, baseUrl) => {
  if (!avatarPath) return null;
  
  // If already a full URL, return as is
  if (avatarPath.startsWith('http://') || avatarPath.startsWith('https://')) {
    return avatarPath;
  }
  
  // Clean the avatar path - remove any duplicate /uploads/avatars/ prefixes
  let cleanPath = avatarPath;
  
  // Remove multiple /uploads/avatars/ occurrences
  while (cleanPath.includes('/uploads/avatars//uploads/avatars/')) {
    cleanPath = cleanPath.replace('/uploads/avatars//uploads/avatars/', '/uploads/avatars/');
  }
  
  // Ensure path starts with /uploads/avatars/
  if (!cleanPath.startsWith('/uploads/avatars/')) {
    // If it's just a filename, add the prefix
    if (!cleanPath.includes('/')) {
      cleanPath = `/uploads/avatars/${cleanPath}`;
    }
    // If it starts with /uploads/ but missing avatars, fix it
    else if (cleanPath.startsWith('/uploads/') && !cleanPath.startsWith('/uploads/avatars/')) {
      cleanPath = cleanPath.replace('/uploads/', '/uploads/avatars/');
    }
    // If it starts with / but not /uploads/, add full prefix
    else if (cleanPath.startsWith('/') && !cleanPath.startsWith('/uploads/')) {
      cleanPath = `/uploads/avatars${cleanPath}`;
    }
  }
  
  // Generate final clean URL
  const finalUrl = `${baseUrl}${cleanPath}`;
  
  console.log('🖼️ [generateAvatarUrl] Avatar transformation:', { 
    original: avatarPath, 
    cleaned: cleanPath, 
    final: finalUrl 
  });
  
  return finalUrl;
};

// @desc    Register new user
// @route   POST /api/auth/signup
// @access  Public
const signup = asyncHandler(async (req, res) => {
  try {
    console.log("📝 [Signup] Starting user registration");
    const { name, email, password, role = 'professional' } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({ 
        success: false,
        message: "Name, email and password are required",
        error: "Missing required fields"
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        success: false,
        message: "Password must be at least 6 characters long",
        error: "Password too short"
      });
    }

    console.log("🔍 [Signup] Checking if user exists:", email.toLowerCase().trim());

    // ✅ CASE INSENSITIVE EMAIL CHECK
    const userExists = await User.findOne({ 
      email: { $regex: new RegExp(`^${email.trim()}$`, 'i') }
    });
    
    if (userExists) {
      console.log("❌ [Signup] User already exists:", email);
      return res.status(400).json({ 
        success: false,
        message: "User already exists with this email",
        error: "Duplicate email"
      });
    }

    console.log("✅ [Signup] Creating new user...");

    // Create user (password will be hashed by pre-save hook)
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(), // ✅ ENSURE LOWERCASE STORAGE
      password: password, // Will be hashed by pre-save hook
      role: role.toLowerCase(),
      isActive: true,
    });

    if (user) {
      console.log("✅ [Signup] User created successfully:", user.email);
      
      // Generate token
      const token = generateToken(user._id);
      
      // ✅ CRITICAL FIX: Generate clean avatar URL with proper path
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const avatarUrl = generateAvatarUrl(user.avatar, baseUrl);
      
      res.status(201).json({
        success: true,
        message: "User registered successfully",
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          createdAt: user.createdAt,
          avatar: user.avatar || null,
          avatarUrl: avatarUrl,
          normalizedAvatarUrl: avatarUrl, // For backward compatibility
          bio: user.bio || '',
          category: user.category || null
        }
      });
    } else {
      console.error("❌ [Signup] Failed to create user");
      res.status(400).json({ 
        success: false,
        message: "Invalid user data",
        error: "User creation failed" 
      });
    }
  } catch (error) {
    console.error("❌ [Signup] Error:", error);
    res.status(500).json({ 
      success: false,
      message: "Server error during registration",
      error: process.env.NODE_ENV === 'development' ? error.message : 'Registration failed'
    });
  }
});

// @desc    Authenticate user & get token  
// @route   POST /api/auth/login
// @access  Public
const login = asyncHandler(async (req, res) => {
  try {
    console.log("🔑 [Login] Starting user authentication");
    console.log("🔑 [Login] Request body:", { email: req.body.email, hasPassword: !!req.body.password });
    
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      console.error("❌ [Login] Missing email or password");
      return res.status(400).json({ 
        success: false,
        message: "Email and password are required",
        error: "Missing credentials"
      });
    }

    console.log("🔍 [Login] Looking for user:", email.toLowerCase().trim());

    // ✅ CASE INSENSITIVE EMAIL SEARCH - Try multiple methods
    let user = null;
    const searchEmail = email.toLowerCase().trim();
    
    // Method 1: Direct lowercase search
    user = await User.findOne({ email: searchEmail });
    
    if (!user) {
      console.log("🔍 [Login] Trying case-insensitive regex search...");
      // Method 2: Case insensitive regex search
      user = await User.findOne({ 
        email: { $regex: new RegExp(`^${email.trim()}$`, 'i') }
      });
    }
    
    if (!user) {
      console.log("🔍 [Login] Trying to find ANY admin user...");
      // Method 3: Find any admin user for debugging
      const adminUsers = await User.find({ role: 'admin' });
      console.log("📋 [Login] Found admin users:", adminUsers.map(u => ({ id: u._id, email: u.email })));
    }
    
    if (!user) {
      console.error("❌ [Login] User not found:", email);
      return res.status(401).json({ 
        success: false,
        message: "Invalid email or password",
        error: "Authentication failed"
      });
    }

    console.log("✅ [Login] User found:", { id: user._id, email: user.email, isActive: user.isActive });
    
    // ✅ ENHANCED DEBUG: Log password details for troubleshooting
    console.log("🔍 [Login] Password Debug Info:");
    console.log("  - Input password:", password);
    console.log("  - Input password length:", password.length);
    console.log("  - Stored hash length:", user.password ? user.password.length : 'NO PASSWORD');
    console.log("  - Hash starts with $2:", user.password ? user.password.startsWith('$2') : false);
    console.log("  - First 10 chars of hash:", user.password ? user.password.substring(0, 10) : 'NO HASH');

    // Check if user is active
    if (user.isActive === false) {
      console.error("❌ [Login] User account deactivated:", email);
      return res.status(401).json({ 
        success: false,
        message: "Account has been deactivated. Please contact support.",
        error: "Account deactivated"
      });
    }

    // ✅ CRITICAL FIX: Use the User model's matchPassword method correctly
    console.log("🔐 [Login] Comparing password using matchPassword method...");
    
    try {
      const isPasswordValid = await user.matchPassword(password);
      console.log("🔐 [Login] Password comparison result:", isPasswordValid);
      
      if (!isPasswordValid) {
        console.error("❌ [Login] Invalid password for user:", email);
        console.error("❌ [Login] Debug info:");
        console.error("   - Raw password input:", `'${password}'`);
        console.error("   - Password trimmed:", `'${password.trim()}'`);
        console.error("   - Hash in DB:", user.password.substring(0, 30) + '...');
        
        // ✅ ADDITIONAL DEBUG: Try manual bcrypt compare
        const bcrypt = require('bcryptjs');
        const manualCompare = await bcrypt.compare(password, user.password);
        console.error("   - Manual bcrypt.compare result:", manualCompare);
        
        return res.status(401).json({ 
          success: false,
          message: "Invalid email or password",
          error: "Authentication failed"
        });
      }
    } catch (compareError) {
      console.error("❌ [Login] Error during password comparison:", compareError);
      return res.status(500).json({ 
        success: false,
        message: "Server error during authentication",
        error: "Password comparison failed"
      });
    }

    console.log("✅ [Login] User authenticated successfully:", user.email);
    
    // Update last login
    user.lastLoginAt = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user._id);
    console.log("🎫 [Login] Token generated successfully");

    // ✅ CRITICAL FIX: Generate clean avatar URL with proper path
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const avatarUrl = generateAvatarUrl(user.avatar, baseUrl);

    const responseUser = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
      avatar: user.avatar,
      avatarUrl: avatarUrl,
      normalizedAvatarUrl: avatarUrl, // For backward compatibility
      bio: user.bio || '',
      category: user.category || null,
      skills: user.skills || [],
      experience: user.experience || [],
      certificates: user.certificates || [],
      portfolio: user.portfolio || [],
      contact: user.contact || {},
      education: user.education || {},
      companyName: user.companyName || null,
      industry: user.industry || null
    };

    console.log("✅ [Login] Sending successful response");

    res.json({
      success: true,
      message: "Login successful",
      token,
      user: responseUser
    });
  } catch (error) {
    console.error("❌ [Login] Error:", error);
    res.status(500).json({ 
      success: false,
      message: "Server error during login",
      error: process.env.NODE_ENV === 'development' ? error.message : 'Login failed'
    });
  }
});

// @desc    Get current user info
// @route   GET /api/auth/me
// @access  Private
const getMe = asyncHandler(async (req, res) => {
  try {
    console.log("👤 [getMe] Getting current user info");
    
    if (!req.user || !req.user.id) {
      return res.status(401).json({ 
        success: false,
        message: "No user data found in request",
        error: "Authentication required" 
      });
    }

    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: "User not found",
        error: "User does not exist" 
      });
    }

    console.log("✅ [getMe] User info retrieved:", user.email);

    // ✅ CRITICAL FIX: Generate clean avatar URL with proper path
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const avatarUrl = generateAvatarUrl(user.avatar, baseUrl);
    
    console.log('🖼️ [getMe] Avatar URL generated:', {
      original: user.avatar,
      final: avatarUrl
    });

    res.json({
      success: true,
      message: "User info retrieved successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
        avatar: user.avatar,
        avatarUrl: avatarUrl,
        normalizedAvatarUrl: avatarUrl, // For backward compatibility
        bio: user.bio || '',
        category: user.category || null,
        skills: user.skills || [],
        experience: user.experience || [],
        certificates: user.certificates || [],
        portfolio: user.portfolio || [],
        contact: user.contact || {},
        education: user.education || {},
        companyName: user.companyName || null,
        industry: user.industry || null
      }
    });
  } catch (error) {
    console.error("❌ [getMe] Error:", error);
    res.status(500).json({ 
      success: false,
      message: "Server error retrieving user info",
      error: process.env.NODE_ENV === 'development' ? error.message : 'Failed to get user info'
    });
  }
});

module.exports = {
  signup,
  login,
  getMe
};
