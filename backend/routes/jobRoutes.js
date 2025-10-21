const express = require("express");
const { body, validationResult } = require("express-validator");
const { 
  protect, 
  authorize, 
  isAdminOrClient, 
  isProfessionalOrClient,
  canAccessApplication  // ✅ CRITICAL: Add this import
} = require("../middleware/authMiddleware");
const {
  createJob,
  getJobs,
  getJobById,
  updateJob,
  deleteJob,
  applyJob,
  getRecentJobs,
  getJobCategories,
  getMyPostedJobs,
  getMyApplications,
  incrementJobView,
  updateApplicationStatus  // ✅ CRITICAL: Add this import
} = require("../controllers/jobController");


const router = express.Router();


// Debug middleware
router.use((req, res, next) => {
  console.log(`💼 jobRouter: ${req.method} ${req.path}`, req.query);
  next();
});


// ===== VALIDATION MIDDLEWARE =====


// ✅ COMPLETELY FIXED: Updated validation to handle businessAddress object
const validateJob = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Job title is required')
    .isLength({ min: 3, max: 100 })
    .withMessage('Title must be between 3 and 100 characters'),
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Job description is required')
    .isLength({ min: 10, max: 5000 })
    .withMessage('Description must be between 10 and 5000 characters'),
  body('category')
    .trim()
    .notEmpty()
    .withMessage('Job category is required'),
  body('budgetMin')
    .isNumeric()
    .withMessage('Minimum budget must be a number')
    .isFloat({ min: 0 })
    .withMessage('Minimum budget cannot be negative'),
  body('budgetMax')
    .isNumeric()
    .withMessage('Maximum budget must be a number')
    .isFloat({ min: 0 })
    .withMessage('Maximum budget cannot be negative')
    .custom((value, { req }) => {
      if (parseFloat(value) < parseFloat(req.body.budgetMin)) {
        throw new Error('Maximum budget cannot be less than minimum budget');
      }
      return true;
    }),
  body('location')
    .optional()
    .isIn(['Remote', 'On-site', 'Hybrid'])
    .withMessage('Invalid location type'),
  body('budgetType')
    .optional()
    .isIn(['Fixed', 'Hourly'])
    .withMessage('Budget type must be Fixed or Hourly'),
  body('experienceLevel')
    .optional()
    .isIn(['Entry', 'Intermediate', 'Expert'])
    .withMessage('Invalid experience level'),
  body('duration')
    .optional()
    .isIn(['Less than 1 month', '1-3 months', '3-6 months', '6+ months'])
    .withMessage('Invalid duration'),
  body('skills')
    .optional()
    .isArray()
    .withMessage('Skills must be an array'),
  body('deadline')
    .optional()
    .isISO8601()
    .withMessage('Invalid deadline date format')
    .custom(value => {
      if (value && new Date(value) <= new Date()) {
        throw new Error('Deadline must be a future date');
      }
      return true;
    }),
  
  // ✅ NEW: Business address validation (conditional based on location)
  body('businessAddress')
    .optional()
    .custom((value, { req }) => {
      // If location is On-site, businessAddress should be provided
      if (req.body.location === 'On-site') {
        if (!value || typeof value !== 'object') {
          throw new Error('Business address is required for on-site jobs');
        }
        
        // Check required fields for on-site jobs
        const required = ['businessName', 'streetAddress', 'city', 'state', 'postalCode'];
        for (const field of required) {
          if (!value[field] || !value[field].toString().trim()) {
            throw new Error(`${field} is required for on-site jobs`);
          }
        }
        
        // Optional length validations
        if (value.businessName && value.businessName.length > 200) {
          throw new Error('Business name cannot exceed 200 characters');
        }
        if (value.streetAddress && value.streetAddress.length > 300) {
          throw new Error('Street address cannot exceed 300 characters');
        }
        if (value.city && value.city.length > 100) {
          throw new Error('City cannot exceed 100 characters');
        }
        if (value.state && value.state.length > 100) {
          throw new Error('State cannot exceed 100 characters');
        }
        if (value.postalCode && value.postalCode.length > 20) {
          throw new Error('Postal code cannot exceed 20 characters');
        }
        if (value.landmark && value.landmark.length > 500) {
          throw new Error('Landmark cannot exceed 500 characters');
        }
        if (value.locationInstructions && value.locationInstructions.length > 1000) {
          throw new Error('Location instructions cannot exceed 1000 characters');
        }
      }
      return true;
    })
];


const validateJobApplication = [
  body('coverLetter')
    .trim()
    .notEmpty()
    .withMessage('Cover letter is required')
    .isLength({ min: 50, max: 2000 })
    .withMessage('Cover letter must be between 50 and 2000 characters'),
  body('proposedBudget')
    .optional()
    .isNumeric()
    .withMessage('Proposed budget must be a number'),
  body('estimatedTimeline')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Estimated timeline cannot exceed 200 characters')
];


// ✅ ENHANCED: Handle validation errors with detailed logging
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log("❌ Job validation errors:", errors.array());
    console.log("❌ Request body for debugging:", JSON.stringify(req.body, null, 2));
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.path || err.param,
        message: err.msg,
        value: err.value,
        location: err.location
      }))
    });
  }
  next();
};


// ===== PUBLIC ROUTES (order matters!) =====
router.get("/", getJobs);
router.get("/recent", getRecentJobs);
router.get("/categories", getJobCategories);


// ===== PROTECTED ROUTES =====
// ✅ FIXED: Simplified middleware chain with proper validation
router.post("/", 
  protect, 
  isAdminOrClient, 
  validateJob, 
  handleValidationErrors, 
  createJob
);


// ✅ CRITICAL FIX: SPECIFIC ROUTES MUST COME BEFORE GENERIC /:id ROUTES
router.post("/:id/increment-view", protect, incrementJobView);
router.post("/:id/apply", protect, validateJobApplication, handleValidationErrors, applyJob);
router.put("/:id", protect, isAdminOrClient, validateJob, handleValidationErrors, updateJob);
router.delete("/:id", protect, isAdminOrClient, deleteJob);


// ===== USER-SPECIFIC ROUTES =====
router.get("/my/posted", protect, isAdminOrClient, getMyPostedJobs);
router.get("/my/applications", protect, getMyApplications);


// ===== ✅ ENHANCED APPLICATION MANAGEMENT ROUTES =====


// Get applications received for client's jobs
router.get("/applications/received", protect, isAdminOrClient, async (req, res) => {
  try {
    console.log(`📋 [Applications] Client fetching received applications, User ID: ${req.user.id}`);
    
    const Application = require("../models/Application");
    const Job = require("../models/Job");
    const { page = 1, limit = 10, status, jobId } = req.query;
    
    // Get client's jobs
    const clientJobs = await Job.find({ createdBy: req.user.id }).select('_id');
    const jobIds = clientJobs.map(job => job._id);
    
    if (jobIds.length === 0) {
      return res.json({
        success: true,
        applications: [],
        totalApplications: 0,
        totalPages: 0,
        currentPage: parseInt(page),
        hasNextPage: false,
        hasPrevPage: false,
        message: "No jobs posted yet"
      });
    }
    
    // Build filter
    const filter = { job: { $in: jobIds } };
    if (status && status !== 'all') {
      filter.status = status;
    }
    if (jobId) {
      filter.job = jobId;
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const applications = await Application.find(filter)
      .populate({
        path: 'job',
        select: 'title budget category status createdAt location deadline'
      })
      .populate({
        path: 'professional',
        select: 'name email avatar avatarUrl bio location skills experience'
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const totalApplications = await Application.countDocuments(filter);
    const totalPages = Math.ceil(totalApplications / parseInt(limit));
    
    // ✅ ENHANCED: Process avatar URLs
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const processedApplications = applications.map(app => ({
      ...app.toObject(),
      professional: {
        ...app.professional.toObject(),
        avatarUrl: app.professional.avatar ? 
          `${baseUrl}/uploads/avatars/${app.professional.avatar}` : null
      }
    }));
    
    console.log(`✅ [Applications] Found ${processedApplications.length} received applications`);
    
    res.json({
      success: true,
      applications: processedApplications,
      totalApplications,
      totalPages,
      currentPage: parseInt(page),
      hasNextPage: parseInt(page) < totalPages,
      hasPrevPage: parseInt(page) > 1
    });
    
  } catch (error) {
    console.error("❌ [Applications] Get received applications error:", error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching received applications', 
      error: error.message 
    });
  }
});


// ✅ CRITICAL FIX: Use controller function instead of inline handler
router.patch("/applications/:id/status", protect, canAccessApplication, updateApplicationStatus);


// ✅ COMPLETELY FIXED: Delete/remove application with proper authorization
router.delete("/applications/:id", protect, canAccessApplication, async (req, res) => {
  try {
    const applicationId = req.params.id;
    console.log(`🗑️ [Applications] Processing application deletion: ${applicationId}`);
    console.log(`🗑️ [Applications] User: ${req.user.email} (${req.user.role})`);
    
    const Application = require("../models/Application");
    
    const application = await Application.findById(applicationId).populate('job');
    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found"
      });
    }
    
    // ✅ ENHANCED: Different behavior based on user role and message
    const { message = '' } = req.body;
    let response;
    
    if (req.user.role === 'professional' && application.professional.toString() === req.user.id) {
      // ✅ PROFESSIONAL: Withdraw their own application
      console.log(`✅ [Applications] Professional withdrawing own application`);
      
      application.status = 'withdrawn';
      application.withdrawnAt = new Date();
      application.withdrawMessage = message || 'Application withdrawn by professional';
      await application.save();
      
      response = {
        success: true,
        message: "Application withdrawn successfully",
        action: 'withdrawn'
      };
      
    } else if (req.user.role === 'client' && application.job.createdBy.toString() === req.user.id) {
      // ✅ CLIENT: Remove application from their job (permanent delete)
      console.log(`✅ [Applications] Client removing application from their job`);
      
      // Add deletion tracking before removing
      const deletionRecord = {
        deletedBy: req.user.id,
        deletedAt: new Date(),
        deleteReason: message || 'Application removed by client',
        applicationData: {
          professional: application.professional,
          job: application.job._id,
          status: application.status,
          appliedAt: application.createdAt
        }
      };
      
      // Store deletion record in application before deleting (optional)
      application.deletionRecord = deletionRecord;
      await application.save();
      
      // Now permanently delete the application
      await Application.findByIdAndDelete(applicationId);
      
      response = {
        success: true,
        message: "Application removed successfully",
        action: 'removed'
      };
      
    } else if (req.user.role === 'admin') {
      // ✅ ADMIN: Can delete any application
      console.log(`✅ [Applications] Admin deleting application`);
      
      await Application.findByIdAndDelete(applicationId);
      
      response = {
        success: true,
        message: "Application deleted successfully by admin",
        action: 'deleted'
      };
      
    } else {
      // ✅ FALLBACK: This should not happen due to canAccessApplication middleware
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this application"
      });
    }
    
    console.log(`✅ [Applications] Application ${response.action} successfully`);
    res.json(response);
    
  } catch (error) {
    console.error("❌ [Applications] Delete error:", error);
    res.status(500).json({
      success: false,
      message: "Error processing application deletion",
      error: error.message
    });
  }
});


// ===== ✅ CRITICAL FIX: MESSAGING INTEGRATION ROUTES =====


// ✅ COMPLETELY FIXED: Start conversation using your existing messageController
router.post("/:jobId/contact/:userId", protect, async (req, res) => {
  try {
    console.log(`💬 [Contact] Starting conversation for job ${req.params.jobId} with user ${req.params.userId}`);
    
    const { jobId, userId } = req.params;
    const currentUserId = req.user.id;
    const mongoose = require("mongoose");
    
    // Basic validation
    if (userId === currentUserId) {
      return res.status(400).json({
        success: false,
        message: "Cannot start conversation with yourself"
      });
    }
    
    // Validate MongoDB ObjectIds
    if (!mongoose.Types.ObjectId.isValid(jobId) || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid job ID or user ID format"
      });
    }
    
    // ✅ CRITICAL FIX: Use your existing messageController function
    const { createOrFindConversation } = require("../controllers/messageController");
    
    // Prepare the request body in the format your messageController expects
    const originalBody = req.body;
    req.body = {
      participantId: userId,  // Your messageController expects 'participantId'
      jobId: jobId,          // Your messageController expects 'jobId' in body
      type: 'project'        // Set conversation type for job-related conversations
    };
    
    // Create a custom response handler to capture the result
    const originalJson = res.json;
    const originalStatus = res.status;
    let controllerResponse = null;
    let controllerStatusCode = 200;
    
    // Override res.json to capture the response
    res.json = function(data) {
      controllerResponse = data;
      return res;
    };
    
    // Override res.status to capture status code
    res.status = function(code) {
      controllerStatusCode = code;
      return {
        json: function(data) {
          controllerResponse = data;
          controllerStatusCode = code;
          return res;
        }
      };
    };
    
    // Call your existing messageController function
    await createOrFindConversation(req, res);
    
    // Restore original methods
    res.json = originalJson;
    res.status = originalStatus;
    req.body = originalBody;
    
    // Handle the response
    if (controllerResponse) {
      if (controllerResponse.success) {
        console.log(`✅ [Contact] Conversation created/found successfully`);
        return res.status(controllerStatusCode).json({
          success: true,
          conversation: controllerResponse.conversation,
          message: "Conversation started successfully",
          isNew: controllerResponse.conversation && 
                 (!controllerResponse.conversation.createdAt || 
                  (new Date() - new Date(controllerResponse.conversation.createdAt)) < 10000)
        });
      } else {
        console.error(`❌ [Contact] Controller returned error:`, controllerResponse);
        return res.status(controllerStatusCode).json(controllerResponse);
      }
    }
    
    // Fallback error response
    return res.status(500).json({
      success: false,
      message: "Unexpected error in conversation creation"
    });
    
  } catch (error) {
    console.error("❌ [Contact] Start conversation error:", error);
    res.status(500).json({
      success: false,
      message: "Error starting conversation",
      error: error.message
    });
  }
});


// Get job applications for a specific job (for job owners)
router.get("/:jobId/applications", protect, isAdminOrClient, async (req, res) => {
  try {
    console.log(`📋 [Job Applications] Fetching applications for job: ${req.params.jobId}`);
    
    const Application = require("../models/Application");
    const Job = require("../models/Job");
    const { jobId } = req.params;
    const { page = 1, limit = 10, status } = req.query;
    
    // Verify job exists and user owns it
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found"
      });
    }
    
    if (job.createdBy.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view applications for this job"
      });
    }
    
    // Build filter
    const filter = { job: jobId };
    if (status && status !== 'all') {
      filter.status = status;
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const applications = await Application.find(filter)
      .populate({
        path: 'professional',
        select: 'name email avatar avatarUrl bio location skills experience'
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const totalApplications = await Application.countDocuments(filter);
    const totalPages = Math.ceil(totalApplications / parseInt(limit));
    
    // ✅ ENHANCED: Process avatar URLs
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const processedApplications = applications.map(app => ({
      ...app.toObject(),
      professional: {
        ...app.professional.toObject(),
        avatarUrl: app.professional.avatar ? 
          `${baseUrl}/uploads/avatars/${app.professional.avatar}` : null
      }
    }));
    
    console.log(`✅ [Job Applications] Found ${processedApplications.length} applications`);
    
    res.json({
      success: true,
      applications: processedApplications,
      job: {
        id: job._id,
        title: job.title,
        status: job.status
      },
      totalApplications,
      totalPages,
      currentPage: parseInt(page),
      hasNextPage: parseInt(page) < totalPages,
      hasPrevPage: parseInt(page) > 1
    });
    
  } catch (error) {
    console.error("❌ [Job Applications] Fetch error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching job applications",
      error: error.message
    });
  }
});


// ✅ CRITICAL FIX: GENERIC /:id ROUTE MUST COME LAST
router.get("/:id", getJobById);


// ===== ERROR HANDLING MIDDLEWARE =====
router.use((err, req, res, next) => {
  console.error("❌ Job route error:", err);
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({ 
      success: false,
      message: 'Job validation error', 
      error: err.message 
    });
  }
  
  if (err.name === 'CastError') {
    return res.status(404).json({ 
      success: false,
      message: 'Job not found', 
      error: 'Invalid job ID' 
    });
  }
  
  if (err.code === 11000) {
    return res.status(409).json({ 
      success: false,
      message: 'Duplicate job entry', 
      error: 'Job already exists' 
    });
  }
  
  res.status(500).json({ 
    success: false,
    message: 'Internal server error in job operations',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});


console.log("✅ jobRoutes module loaded successfully");


module.exports = router;
