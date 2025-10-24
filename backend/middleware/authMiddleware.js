const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');

// @desc  Protect routes - verify JWT token
const protect = asyncHandler(async (req, res, next) => {
  let token;

  try {
    console.log("🔐 [protect] === AUTHENTICATION CHECK ===");
    console.log("🔐 [protect] Request path:", req.path);
    console.log("🔐 [protect] Authorization header:", req.headers.authorization ? 'Present' : 'Missing');

    // Extract token from Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
      console.log("🔐 [protect] Token extracted:", token ? 'Yes' : 'No');
      console.log("🔐 [protect] Token preview:", token ? `${token.substring(0, 20)}...` : 'None');
    }

    if (!token) {
      console.error("❌ [protect] No token provided");
      return res.status(401).json({ 
        success: false,
        message: 'Not authorized, no token provided',
        error: 'Authentication required'
      });
    }

    // Verify token
    console.log("🔐 [protect] Verifying token...");
    console.log("🔐 [protect] JWT_SECRET present:", process.env.JWT_SECRET ? 'Yes' : 'No');
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("🔐 [protect] Token decoded successfully:", {
      id: decoded.id,
      userId: decoded.userId, // ✅ NEW: Also log userId
      iat: decoded.iat,
      exp: decoded.exp
    });

    // ✅ CRITICAL FIX: Support both 'id' and 'userId' for backward compatibility
    const userId = decoded.id || decoded.userId;
    
    if (!userId) {
      console.error("❌ [protect] No user ID found in token payload:", decoded);
      return res.status(401).json({ 
        success: false,
        message: 'Not authorized, invalid token format',
        error: 'Token missing user identifier'
      });
    }

    // Get user from token
    console.log("🔐 [protect] Fetching user from database with ID:", userId);
    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      console.error("❌ [protect] User not found for token ID:", userId);
      return res.status(401).json({ 
        success: false,
        message: 'Not authorized, user not found',
        error: 'Invalid token - user does not exist'
      });
    }

    console.log("✅ [protect] User authenticated successfully");
    console.log("✅ [protect] User details:", {
      id: user._id,
      email: user.email,
      role: user.role,
      authProvider: user.authProvider // ✅ NEW: Log auth provider
    });

    // Attach user to request object
    req.user = user;
    next();

  } catch (error) {
    console.error("❌ [protect] === AUTHENTICATION ERROR ===");
    console.error("  Error name:", error.name);
    console.error("  Error message:", error.message);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false,
        message: 'Not authorized, invalid token',
        error: 'Token verification failed'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false,
        message: 'Not authorized, token expired',
        error: 'Please login again'
      });
    }

    return res.status(401).json({ 
      success: false,
      message: 'Not authorized, authentication failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Authentication error'
    });
  }
});

// ✅ ENHANCED: Role-based authorization middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    console.log(`🔒 [authorize] Checking roles: ${roles.join(', ')}`);
    console.log(`🔒 [authorize] User role: ${req.user?.role}`);
    
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, please authenticate first'
      });
    }

    if (!roles.includes(req.user.role)) {
      console.error(`❌ [authorize] Access denied. Required: ${roles.join('|')}, Got: ${req.user.role}`);
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${roles.join(' or ')}`,
        currentRole: req.user.role,
        requiredRoles: roles
      });
    }

    console.log(`✅ [authorize] Role authorization passed`);
    next();
  };
};

// ✅ ENHANCED: Admin-only middleware
const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    console.log("✅ [isAdmin] Admin access granted");
    next();
  } else {
    console.error("❌ [isAdmin] Admin access denied for role:", req.user?.role);
    res.status(403).json({ 
      success: false,
      message: 'Not authorized as admin',
      currentRole: req.user?.role || 'unknown'
    });
  }
};

// ✅ ENHANCED: Professional-only middleware
const isProfessional = (req, res, next) => {
  if (req.user && req.user.role === 'professional') {
    console.log("✅ [isProfessional] Professional access granted");
    next();
  } else {
    console.error("❌ [isProfessional] Professional access denied for role:", req.user?.role);
    res.status(403).json({ 
      success: false,
      message: 'Not authorized as professional',
      currentRole: req.user?.role || 'unknown'
    });
  }
};

// ✅ ENHANCED: Client-only middleware
const isClient = (req, res, next) => {
  if (req.user && req.user.role === 'client') {
    console.log("✅ [isClient] Client access granted");
    next();
  } else {
    console.error("❌ [isClient] Client access denied for role:", req.user?.role);
    res.status(403).json({ 
      success: false,
      message: 'Not authorized as client',
      currentRole: req.user?.role || 'unknown'
    });
  }
};

// ✅ NEW: Admin or Client middleware (for job management)
const isAdminOrClient = (req, res, next) => {
  console.log("🔐 [isAdminOrClient] Checking admin/client access for user:", req.user?.role);
  
  if (!req.user) {
    return res.status(401).json({ 
      success: false,
      message: "Authentication required" 
    });
  }
  
  if (req.user.role === "admin" || req.user.role === "client") {
    console.log("✅ [isAdminOrClient] Access granted for role:", req.user.role);
    next();
  } else {
    console.log("❌ [isAdminOrClient] Access denied for role:", req.user.role);
    res.status(403).json({ 
      success: false,
      message: "Access denied. Admins or Clients only.",
      currentRole: req.user.role,
      requiredRoles: ["admin", "client"]
    });
  }
};

// ✅ NEW: Professional or Client middleware (for applications)
const isProfessionalOrClient = (req, res, next) => {
  console.log("🔐 [isProfessionalOrClient] Checking professional/client access for user:", req.user?.role);
  
  if (!req.user) {
    return res.status(401).json({ 
      success: false,
      message: "Authentication required" 
    });
  }
  
  if (req.user.role === "professional" || req.user.role === "client" || req.user.role === "admin") {
    console.log("✅ [isProfessionalOrClient] Access granted for role:", req.user.role);
    next();
  } else {
    console.log("❌ [isProfessionalOrClient] Access denied for role:", req.user.role);
    res.status(403).json({ 
      success: false,
      message: "Access denied. Professionals, Clients, or Admins only.",
      currentRole: req.user.role,
      requiredRoles: ["professional", "client", "admin"]
    });
  }
};

// ✅ NEW: Resource owner check (user can access their own resources)
const isResourceOwner = (resourceField = 'userId') => {
  return asyncHandler(async (req, res, next) => {
    const resourceUserId = req.params[resourceField] || req.params.id || req.body[resourceField];
    
    if (!resourceUserId) {
      return res.status(400).json({
        success: false,
        message: 'Resource identifier required'
      });
    }

    // Admin can access all resources
    if (req.user.role === 'admin') {
      console.log(`✅ [isResourceOwner] Admin access granted: ${req.user.email} accessing ${resourceUserId}`);
      return next();
    }

    // User can access their own resources
    if (req.user.id === resourceUserId) {
      console.log(`✅ [isResourceOwner] Resource owner access granted: ${req.user.email}`);
      return next();
    }

    console.log(`❌ [isResourceOwner] Resource access denied: ${req.user.email} trying to access ${resourceUserId}`);
    res.status(403).json({
      success: false,
      message: 'Access denied. You can only access your own resources.',
      currentRole: req.user.role
    });
  });
};

// ✅ NEW: Job owner check (for job-related operations)
const isJobOwner = asyncHandler(async (req, res, next) => {
  try {
    const jobId = req.params.jobId || req.params.id;
    
    if (!jobId) {
      return res.status(400).json({
        success: false,
        message: 'Job ID required'
      });
    }

    const Job = require('../models/Job');
    const job = await Job.findById(jobId);
    
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    // Admin can access all jobs
    if (req.user.role === 'admin') {
      console.log(`✅ [isJobOwner] Admin access granted: ${req.user.email} accessing job ${jobId}`);
      return next();
    }

    // Job creator can access their job
    if (job.createdBy.toString() === req.user.id) {
      console.log(`✅ [isJobOwner] Job owner access granted: ${req.user.email}`);
      return next();
    }

    console.log(`❌ [isJobOwner] Job access denied: ${req.user.email} trying to access job ${jobId}`);
    res.status(403).json({
      success: false,
      message: 'Access denied. You can only access your own jobs.',
      currentRole: req.user.role
    });
  } catch (error) {
    console.error('❌ [isJobOwner] Error checking job ownership:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking job access permissions'
    });
  }
});

// ✅ NEW: Application access check (for application-related operations)
const canAccessApplication = asyncHandler(async (req, res, next) => {
  try {
    const applicationId = req.params.applicationId || req.params.id;
    
    if (!applicationId) {
      return res.status(400).json({
        success: false,
        message: 'Application ID required'
      });
    }

    const Application = require('../models/Application');
    const application = await Application.findById(applicationId).populate('job');
    
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    // Admin can access all applications
    if (req.user.role === 'admin') {
      console.log(`✅ [canAccessApplication] Admin access granted: ${req.user.email}`);
      return next();
    }

    // Professional can access their own applications
    if (req.user.role === 'professional' && application.professional.toString() === req.user.id) {
      console.log(`✅ [canAccessApplication] Professional access granted: ${req.user.email}`);
      return next();
    }

    // Client can access applications for their jobs
    if (req.user.role === 'client' && application.job.createdBy.toString() === req.user.id) {
      console.log(`✅ [canAccessApplication] Client access granted: ${req.user.email}`);
      return next();
    }

    console.log(`❌ [canAccessApplication] Application access denied: ${req.user.email} (${req.user.role})`);
    res.status(403).json({
      success: false,
      message: 'Access denied. You can only access your own applications or applications for your jobs.',
      currentRole: req.user.role
    });
  } catch (error) {
    console.error('❌ [canAccessApplication] Error checking application access:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking application access permissions'
    });
  }
});

module.exports = { 
  protect, 
  authorize, 
  isAdmin, 
  isProfessional, 
  isClient,
  isAdminOrClient,
  isProfessionalOrClient,
  isResourceOwner,
  isJobOwner,
  canAccessApplication
};
