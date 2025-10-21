const Job = require("../models/Job");
const User = require("../models/User");
const Application = require("../models/Application");
const Message = require("../models/Message");
const Conversation = require("../models/Conversation");
const asyncHandler = require("express-async-handler");
const mongoose = require("mongoose");


// ===== EXISTING FUNCTIONS (ENHANCED) =====


// @desc    Create a new job
// @route   POST /api/jobs
// @access  Private (Admin/Client only)
const createJob = asyncHandler(async (req, res) => {
  try {
    console.log("💼 [createJob] Starting job creation");
    console.log("💼 [createJob] Body:", req.body);
    console.log("💼 [createJob] User:", req.user?.id, req.user?.role);


    // Prevent professionals from posting jobs
    if (req.user.role === "professional") {
      return res.status(403).json({ 
        success: false,
        message: "Professionals cannot create jobs. Only clients and admins can post jobs." 
      });
    }


    const {
      title,
      description,
      category,
      budgetMin,
      budgetMax,
      budgetType = "Fixed",
      location = "Remote",
      skills = [],
      experienceLevel = "Intermediate",
      duration = "1-3 months",
      deadline,
      businessAddress
    } = req.body;


    // ✅ ENHANCED: Validate required fields with detailed logging
    if (!title || !description || !category || budgetMin === undefined || budgetMax === undefined) {
      console.log("❌ [createJob] Missing required fields");
      return res.status(400).json({
        success: false,
        message: "Missing required fields: title, description, category, budgetMin, budgetMax"
      });
    }


    // ✅ ENHANCED: Validate budget logic
    if (parseFloat(budgetMax) < parseFloat(budgetMin)) {
      return res.status(400).json({
        success: false,
        message: "Maximum budget cannot be less than minimum budget"
      });
    }


    // ✅ CRITICAL FIX: Create job with 'open' status (matches model default)
    const jobData = {
      title: title.trim(),
      description: description.trim(),
      category,
      budgetMin: parseFloat(budgetMin),
      budgetMax: parseFloat(budgetMax),
      budgetType,
      location,
      skills: Array.isArray(skills) ? skills : [],
      experienceLevel,
      duration,
      createdBy: req.user.id,
      status: "open"  // ✅ CRITICAL FIX: Use 'open' not 'active'
    };


    // ✅ ENHANCED: Add deadline if provided
    if (deadline) {
      const deadlineDate = new Date(deadline);
      if (deadlineDate > new Date()) {
        jobData.deadline = deadlineDate;
      } else {
        return res.status(400).json({
          success: false,
          message: "Deadline must be a future date"
        });
      }
    }


    // ✅ ENHANCED: Add business address for on-site jobs
    if (location === "On-site" && businessAddress) {
      jobData.businessAddress = {
        businessName: businessAddress.businessName?.trim(),
        streetAddress: businessAddress.streetAddress?.trim(),
        city: businessAddress.city?.trim(),
        state: businessAddress.state?.trim(),
        postalCode: businessAddress.postalCode?.trim(),
        country: businessAddress.country?.trim() || "India",
        landmark: businessAddress.landmark?.trim(),
        locationInstructions: businessAddress.locationInstructions?.trim()
      };
    }


    const job = new Job(jobData);
    const savedJob = await job.save();


    // ✅ ENHANCED: Populate created job for response
    await savedJob.populate("createdBy", "name email role");


    console.log("✅ [createJob] Job created successfully with status 'open':", savedJob._id);


    res.status(201).json({
      success: true,
      job: savedJob,
      message: "Job created successfully"
    });


  } catch (error) {
    console.error("❌ [createJob] Error:", error);


    // ✅ ENHANCED: Handle specific validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: errors
      });
    }


    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Duplicate job entry",
        error: "A similar job already exists"
      });
    }


    res.status(500).json({
      success: false,
      message: "Error creating job",
      error: process.env.NODE_ENV === 'development' ? error.message : "Internal server error"
    });
  }
});


// @desc    Get all jobs with enhanced filtering
// @route   GET /api/jobs
// @access  Public
const getJobs = asyncHandler(async (req, res) => {
  try {
    console.log("💼 [getJobs] Fetching jobs with query:", req.query);


    const {
      page = 1,
      limit = 10,
      category,
      budgetMin,
      budgetMax,
      location,
      experienceLevel,
      skills,
      search,
      sortBy = "createdAt",
      sortOrder = "desc"
    } = req.query;


    // ✅ CRITICAL FIX: Use 'open' status instead of 'active'
    const filter = { status: "open" };
    console.log("💼 [getJobs] Base filter:", filter);


    if (category) {
      filter.category = category;
      console.log("💼 [getJobs] Added category filter:", category);
    }
    if (location) {
      filter.location = location;
      console.log("💼 [getJobs] Added location filter:", location);
    }
    if (experienceLevel) {
      filter.experienceLevel = experienceLevel;
      console.log("💼 [getJobs] Added experience filter:", experienceLevel);
    }


    // ✅ FIXED: Budget filtering logic
    if (budgetMin || budgetMax) {
      if (budgetMin) {
        // Find jobs where the maximum budget is >= user's minimum budget
        filter.budgetMax = { $gte: parseFloat(budgetMin) };
        console.log("💼 [getJobs] Added budgetMin filter - jobs with budgetMax >=", budgetMin);
      }
      if (budgetMax) {
        // Find jobs where the minimum budget is <= user's maximum budget
        filter.budgetMin = { $lte: parseFloat(budgetMax) };
        console.log("💼 [getJobs] Added budgetMax filter - jobs with budgetMin <=", budgetMax);
      }
    }


    // Skills filtering
    if (skills) {
      const skillsArray = Array.isArray(skills) ? skills : [skills];
      filter.skills = { $in: skillsArray };
      console.log("💼 [getJobs] Added skills filter:", skillsArray);
    }


    // Search functionality
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } }
      ];
      console.log("💼 [getJobs] Added search filter:", search);
    }


    console.log("💼 [getJobs] Final filter object:", JSON.stringify(filter, null, 2));


    // ✅ ENHANCED: Sorting logic
    const sortOptions = {};
    const validSortFields = ['createdAt', 'budgetMin', 'budgetMax', 'title'];
    if (validSortFields.includes(sortBy)) {
      sortOptions[sortBy] = sortOrder === "asc" ? 1 : -1;
    } else {
      sortOptions.createdAt = -1; // Default sort
    }
    console.log("💼 [getJobs] Sort options:", sortOptions);


    const skip = (parseInt(page) - 1) * parseInt(limit);
    console.log("💼 [getJobs] Pagination - Page:", page, "Limit:", limit, "Skip:", skip);


    // ✅ ENHANCED: Execute query with proper population
    console.log("💼 [getJobs] Executing database query...");
    const jobs = await Job.find(filter)
      .populate("createdBy", "name email role businessName")
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();


    const totalJobs = await Job.countDocuments(filter);
    const totalPages = Math.ceil(totalJobs / parseInt(limit));


    console.log(`✅ [getJobs] Query successful - Found ${jobs.length} jobs (${totalJobs} total)`);
    console.log(`✅ [getJobs] Sample job data:`, jobs.length > 0 ? {
      id: jobs[0]._id,
      title: jobs[0].title,
      status: jobs[0].status,
      createdAt: jobs[0].createdAt
    } : 'No jobs found');


    res.json({
      success: true,
      jobs,
      currentPage: parseInt(page),
      totalPages,
      totalJobs,
      hasNextPage: parseInt(page) < totalPages,
      hasPrevPage: parseInt(page) > 1
    });


  } catch (error) {
    console.error("❌ [getJobs] Error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching jobs",
      error: error.message
    });
  }
});


// @desc    Get recent jobs (last 7 days)
// @route   GET /api/jobs/recent
// @access  Public
const getRecentJobs = asyncHandler(async (req, res) => {
  try {
    console.log("💼 [getRecentJobs] Fetching recent jobs");


    const { limit = 5 } = req.query;
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);


    // ✅ CRITICAL FIX: Use 'open' status
    const recentJobs = await Job.find({
      status: "open",  // ✅ Changed from "active" to "open"
      createdAt: { $gte: sevenDaysAgo }
    })
      .populate("createdBy", "name role businessName")
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .lean();


    console.log(`✅ [getRecentJobs] Found ${recentJobs.length} recent jobs`);


    res.json({
      success: true,
      jobs: recentJobs,
      count: recentJobs.length
    });


  } catch (error) {
    console.error("❌ [getRecentJobs] Error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching recent jobs",
      error: error.message
    });
  }
});


// @desc    Get unique job categories
// @route   GET /api/jobs/categories
// @access  Public
const getJobCategories = asyncHandler(async (req, res) => {
  try {
    console.log("💼 [getJobCategories] Fetching job categories");


    // ✅ CRITICAL FIX: Use 'open' status
    const categories = await Job.distinct("category", { status: "open" });


    // ✅ ENHANCED: Get categories with counts
    const categoriesWithCount = await Job.aggregate([
      { $match: { status: "open" } },  // ✅ Changed from "active" to "open"
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);


    console.log(`✅ [getJobCategories] Found ${categories.length} categories`);


    res.json({
      success: true,
      categories,
      categoriesWithCount
    });


  } catch (error) {
    console.error("❌ [getJobCategories] Error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching job categories",
      error: error.message
    });
  }
});


// @desc    Get single job by ID
// @route   GET /api/jobs/:id
// @access  Public
const getJobById = asyncHandler(async (req, res) => {
  try {
    console.log("💼 [getJobById] Fetching job:", req.params.id);


    const job = await Job.findById(req.params.id)
      .populate("createdBy", "name email role businessName avatar")
      .lean();


    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found"
      });
    }


    // ✅ ENHANCED: Get application count and user's application status
    const applicationCount = await Application.countDocuments({
      job: job._id,
      status: { $ne: "withdrawn" }
    });


    let userApplication = null;
    if (req.user) {
      userApplication = await Application.findOne({
        job: job._id,
        professional: req.user.id,
        status: { $ne: "withdrawn" }
      }).lean();
    }


    const enhancedJob = {
      ...job,
      applicationCount,
      userApplication: userApplication ? {
        id: userApplication._id,
        status: userApplication.status,
        appliedAt: userApplication.createdAt
      } : null
    };


    console.log("✅ [getJobById] Job found with application data");


    res.json({
      success: true,
      job: enhancedJob
    });


  } catch (error) {
    console.error("❌ [getJobById] Error:", error);
    
    if (error.name === 'CastError') {
      return res.status(404).json({
        success: false,
        message: "Job not found"
      });
    }


    res.status(500).json({
      success: false,
      message: "Error fetching job",
      error: error.message
    });
  }
});


// @desc    Update job
// @route   PUT /api/jobs/:id
// @access  Private (Job owner only)
const updateJob = asyncHandler(async (req, res) => {
  try {
    console.log("💼 [updateJob] Updating job:", req.params.id);


    const job = await Job.findById(req.params.id);


    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found"
      });
    }


    // ✅ ENHANCED: Check ownership
    if (job.createdBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this job"
      });
    }


    // ✅ ENHANCED: Validate budget changes
    const { budgetMin, budgetMax } = req.body;
    if (budgetMin !== undefined && budgetMax !== undefined) {
      if (parseFloat(budgetMax) < parseFloat(budgetMin)) {
        return res.status(400).json({
          success: false,
          message: "Maximum budget cannot be less than minimum budget"
        });
      }
    }


    // Update job with new data
    Object.keys(req.body).forEach(key => {
      if (req.body[key] !== undefined && key !== 'createdBy') {
        job[key] = req.body[key];
      }
    });


    job.updatedAt = new Date();
    const updatedJob = await job.save();


    await updatedJob.populate("createdBy", "name email role");


    console.log("✅ [updateJob] Job updated successfully");


    res.json({
      success: true,
      job: updatedJob,
      message: "Job updated successfully"
    });


  } catch (error) {
    console.error("❌ [updateJob] Error:", error);


    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: errors
      });
    }


    res.status(500).json({
      success: false,
      message: "Error updating job",
      error: error.message
    });
  }
});


// @desc    Delete job PERMANENTLY
// @route   DELETE /api/jobs/:id
// @access  Private (Job owner only)
const deleteJob = asyncHandler(async (req, res) => {
  try {
    console.log("💼 [deleteJob] Permanently deleting job:", req.params.id);

    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found"
      });
    }

    // Check ownership
    if (job.createdBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this job"
      });
    }

    // ✅ CRITICAL: PERMANENT DELETE from database
    await Job.findByIdAndDelete(req.params.id);

    // ✅ OPTIONAL: Also delete related applications
    await Application.deleteMany({ job: req.params.id });

    console.log("✅ [deleteJob] Job permanently deleted from database");

    res.json({
      success: true,
      message: "Job deleted permanently"
    });

  } catch (error) {
    console.error("❌ [deleteJob] Error:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting job",
      error: error.message
    });
  }
});



// @desc    Apply for a job
// @route   POST /api/jobs/:id/apply
// @access  Private (Professionals only)
const applyJob = asyncHandler(async (req, res) => {
  try {
    console.log("💼 [applyJob] Processing application for job:", req.params.id);
    console.log("💼 [applyJob] Professional:", req.user.id);


    // Only professionals can apply
    if (req.user.role !== "professional") {
      return res.status(403).json({
        success: false,
        message: "Only professionals can apply for jobs"
      });
    }


    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found"
      });
    }


    // ✅ CRITICAL FIX: Check for 'open' status
    if (job.status !== "open") {
      return res.status(400).json({
        success: false,
        message: "This job is no longer accepting applications"
      });
    }


    // ✅ ENHANCED: Prevent self-application
    if (job.createdBy.toString() === req.user.id) {
      return res.status(400).json({
        success: false,
        message: "Cannot apply to your own job posting"
      });
    }


    // Check for existing application
    const existingApplication = await Application.findOne({
      job: req.params.id,
      professional: req.user.id,
      status: { $ne: "withdrawn" }
    });


    if (existingApplication) {
      return res.status(409).json({
        success: false,
        message: "You have already applied for this job",
        application: existingApplication
      });
    }


    // ✅ ENHANCED: Create application with validation
    const { coverLetter, proposedBudget, estimatedTimeline } = req.body;


    if (!coverLetter || coverLetter.trim().length < 50) {
      return res.status(400).json({
        success: false,
        message: "Cover letter must be at least 50 characters long"
      });
    }


    const applicationData = {
      job: req.params.id,
      professional: req.user.id,
      coverLetter: coverLetter.trim(),
      status: "pending"
    };


    if (proposedBudget && !isNaN(proposedBudget)) {
      applicationData.proposedBudget = parseFloat(proposedBudget);
    }


    if (estimatedTimeline) {
      applicationData.estimatedTimeline = estimatedTimeline.trim();
    }


    const application = new Application(applicationData);
    const savedApplication = await application.save();


    // ✅ ENHANCED: Populate for response
    await savedApplication.populate("professional", "name email avatar");
    await savedApplication.populate("job", "title budgetMin budgetMax");


    console.log("✅ [applyJob] Application submitted successfully");


    res.status(201).json({
      success: true,
      application: savedApplication,
      message: "Application submitted successfully"
    });


  } catch (error) {
    console.error("❌ [applyJob] Error:", error);


    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: "Application validation error",
        errors: errors
      });
    }


    res.status(500).json({
      success: false,
      message: "Error submitting application",
      error: error.message
    });
  }
});


// @desc    Get user's posted jobs (for clients)
// @route   GET /api/jobs/my/posted
// @access  Private (Clients only)
const getMyPostedJobs = asyncHandler(async (req, res) => {
  try {
    console.log("💼 [getMyPostedJobs] Fetching posted jobs for user:", req.user.id);


    const { page = 1, limit = 10, status } = req.query;
    const filter = { createdBy: req.user.id };


    if (status && status !== "all") {
      filter.status = status;
    } else {
      filter.status = { $ne: "cancelled" }; // ✅ Exclude cancelled jobs by default
    }


    const skip = (parseInt(page) - 1) * parseInt(limit);


    const jobs = await Job.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();


    // ✅ ENHANCED: Get application counts for each job
    const jobsWithApplicationCounts = await Promise.all(
      jobs.map(async (job) => {
        const applicationCount = await Application.countDocuments({
          job: job._id,
          status: { $ne: "withdrawn" }
        });


        const pendingCount = await Application.countDocuments({
          job: job._id,
          status: "pending"
        });


        return {
          ...job,
          applicationCount,
          pendingCount
        };
      })
    );


    const totalJobs = await Job.countDocuments(filter);
    const totalPages = Math.ceil(totalJobs / parseInt(limit));


    console.log(`✅ [getMyPostedJobs] Found ${jobs.length} posted jobs`);


    res.json({
      success: true,
      jobs: jobsWithApplicationCounts,
      currentPage: parseInt(page),
      totalPages,
      totalJobs,
      hasNextPage: parseInt(page) < totalPages,
      hasPrevPage: parseInt(page) > 1
    });


  } catch (error) {
    console.error("❌ [getMyPostedJobs] Error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching posted jobs",
      error: error.message
    });
  }
});


// @desc    Get user's applications (for professionals)
// @route   GET /api/jobs/my/applications
// @access  Private (Professionals only)
const getMyApplications = asyncHandler(async (req, res) => {
  try {
    console.log("💼 [getMyApplications] Fetching applications for professional:", req.user.id);


    const { page = 1, limit = 10, status } = req.query;
    const filter = { professional: req.user.id };


    if (status && status !== "all") {
      filter.status = status;
    }


    const skip = (parseInt(page) - 1) * parseInt(limit);


    const applications = await Application.find(filter)
      .populate({
        path: "job",
        select: "title description budgetMin budgetMax location category status createdBy deadline",
        populate: {
          path: "createdBy",
          select: "name email businessName"
        }
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();


    const totalApplications = await Application.countDocuments(filter);
    const totalPages = Math.ceil(totalApplications / parseInt(limit));


    console.log(`✅ [getMyApplications] Found ${applications.length} applications`);


    res.json({
      success: true,
      applications,
      currentPage: parseInt(page),
      totalPages,
      totalApplications,
      hasNextPage: parseInt(page) < totalPages,
      hasPrevPage: parseInt(page) > 1
    });


  } catch (error) {
    console.error("❌ [getMyApplications] Error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching applications",
      error: error.message
    });
  }
});


// @desc    Increment job view count
// @route   POST /api/jobs/:id/increment-view
// @access  Private
const incrementJobView = asyncHandler(async (req, res) => {
  try {
    console.log("💼 [incrementJobView] Incrementing view for job:", req.params.id);


    const job = await Job.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },  // ✅ Fixed: increment 'views' not 'viewCount'
      { new: true }
    ).select("views");


    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found"
      });
    }


    console.log("✅ [incrementJobView] View count incremented");


    res.json({
      success: true,
      viewCount: job.views  // ✅ Fixed: return 'views' not 'viewCount'
    });


  } catch (error) {
    console.error("❌ [incrementJobView] Error:", error);
    res.status(500).json({
      success: false,
      message: "Error incrementing view count",
      error: error.message
    });
  }
});


// ===== NEW FUNCTIONS FOR APPLICATION MANAGEMENT =====


// @desc    Get applications for a specific job (for job owners)
// @route   GET /api/jobs/:jobId/applications
// @access  Private (Job owners only)
const getJobApplications = asyncHandler(async (req, res) => {
  try {
    console.log("💼 [getJobApplications] Fetching applications for job:", req.params.jobId);


    const job = await Job.findById(req.params.jobId);
    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found"
      });
    }


    // Verify job ownership
    if (job.createdBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view applications for this job"
      });
    }


    const { page = 1, limit = 10, status } = req.query;
    const filter = { job: req.params.jobId };


    if (status && status !== "all") {
      filter.status = status;
    }


    const skip = (parseInt(page) - 1) * parseInt(limit);


    const applications = await Application.find(filter)
      .populate({
        path: "professional",
        select: "name email avatar bio location skills experience"
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));


    const totalApplications = await Application.countDocuments(filter);


    console.log(`✅ [getJobApplications] Found ${applications.length} applications`);


    res.json({
      success: true,
      applications,
      job: {
        id: job._id,
        title: job.title,
        status: job.status
      },
      totalApplications,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalApplications / parseInt(limit))
    });


  } catch (error) {
    console.error("❌ [getJobApplications] Error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching job applications",
      error: error.message
    });
  }
});


// @desc    Accept application
// @route   POST /api/jobs/applications/:id/accept
// @access  Private (Job owners only)
const acceptApplication = asyncHandler(async (req, res) => {
  try {
    console.log("💼 [acceptApplication] Accepting application:", req.params.id);


    const application = await Application.findById(req.params.id)
      .populate("job")
      .populate("professional", "name email");


    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found"
      });
    }


    // Verify job ownership
    if (application.job.createdBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to manage this application"
      });
    }


    application.status = "accepted";
    application.reviewedAt = new Date();
    application.reviewedBy = req.user.id;
    if (req.body.message) {
      application.notes = req.body.message;
    }


    await application.save();


    console.log("✅ [acceptApplication] Application accepted successfully");


    res.json({
      success: true,
      application,
      message: "Application accepted successfully"
    });


  } catch (error) {
    console.error("❌ [acceptApplication] Error:", error);
    res.status(500).json({
      success: false,
      message: "Error accepting application",
      error: error.message
    });
  }
});


// @desc    Reject application
// @route   POST /api/jobs/applications/:id/reject
// @access  Private (Job owners only)
const rejectApplication = asyncHandler(async (req, res) => {
  try {
    console.log("💼 [rejectApplication] Rejecting application:", req.params.id);


    const application = await Application.findById(req.params.id)
      .populate("job")
      .populate("professional", "name email");


    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found"
      });
    }


    // Verify job ownership
    if (application.job.createdBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to manage this application"
      });
    }


    application.status = "rejected";
    application.reviewedAt = new Date();
    application.reviewedBy = req.user.id;
    if (req.body.message) {
      application.notes = req.body.message;
    }


    await application.save();


    console.log("✅ [rejectApplication] Application rejected successfully");


    res.json({
      success: true,
      application,
      message: "Application rejected successfully"
    });


  } catch (error) {
    console.error("❌ [rejectApplication] Error:", error);
    res.status(500).json({
      success: false,
      message: "Error rejecting application",
      error: error.message
    });
  }
});


// @desc    Start conversation with professional
// @route   POST /api/jobs/:jobId/contact/:userId
// @access  Private (Job owners only)
const startConversation = asyncHandler(async (req, res) => {
  try {
    console.log("💼 [startConversation] Starting conversation for job:", req.params.jobId);


    const { jobId, userId } = req.params;


    // Basic validation
    if (userId === req.user.id) {
      return res.status(400).json({
        success: false,
        message: "Cannot start conversation with yourself"
      });
    }


    // Use the existing messageController function
    const { createOrFindConversation } = require("../controllers/messageController");


    // Prepare request for messageController
    const originalBody = req.body;
    req.body = {
      participantId: userId,
      jobId: jobId,
      type: 'project'
    };


    // Create response handler to capture result
    let controllerResponse = null;
    const originalJson = res.json;


    res.json = function(data) {
      controllerResponse = data;
      return res;
    };


    await createOrFindConversation(req, res);


    // Restore original methods
    res.json = originalJson;
    req.body = originalBody;


    if (controllerResponse && controllerResponse.success) {
      console.log("✅ [startConversation] Conversation started successfully");
      return res.json({
        success: true,
        conversation: controllerResponse.conversation,
        message: "Conversation started successfully"
      });
    }


    return res.status(500).json({
      success: false,
      message: "Error starting conversation"
    });


  } catch (error) {
    console.error("❌ [startConversation] Error:", error);
    res.status(500).json({
      success: false,
      message: "Error starting conversation",
      error: error.message
    });
  }
});


// ✅ CRITICAL ADDITION: Update application status (for PATCH route)
// @desc    Update application status with optional message
// @route   PATCH /api/jobs/applications/:id/status
// @access  Private (Job owner only)
const updateApplicationStatus = asyncHandler(async (req, res) => {
  try {
    console.log('🔄 [updateApplicationStatus] Processing status update:', req.params.id);
    console.log('🔄 [updateApplicationStatus] Request body:', req.body);
    
    const { status, message } = req.body;
    
    if (!['accepted', 'rejected', 'under_review'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Must be 'accepted', 'rejected', or 'under_review'"
      });
    }
    
    // Find application and verify client owns the job
    const application = await Application.findById(req.params.id)
      .populate('job')
      .populate('professional', 'name email');
    
    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found"
      });
    }
    
    if (application.job.createdBy.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this application"
      });
    }
    
    // Update application
    const oldStatus = application.status;
    application.status = status;
    application.reviewedAt = new Date();
    application.reviewedBy = req.user.id;
    if (message) application.notes = message;
    await application.save();
    
    // Populate for response
    await application.populate('professional', 'name avatar avatarUrl skills');
    await application.populate('job', 'title');
    
    // ✅ CRITICAL: Create conversation and send system message
    let conversation = await Conversation.findOne({
      'participants.userId': { $all: [req.user.id, application.professional._id] },
      $or: [
        { 'metadata.applicationId': application._id },
        { 'metadata.jobId': application.job._id }
      ]
    });
    
    if (!conversation) {
      console.log('🔄 [updateApplicationStatus] Creating new conversation');
      conversation = await Conversation.create({
        participants: [
          { userId: req.user.id, role: 'client', isActive: true },
          { userId: application.professional._id, role: 'professional', isActive: true }
        ],
        conversationType: 'direct',
        title: `${application.job.title} - Application Discussion`,
        metadata: {
          applicationId: application._id,
          jobId: application.job._id,
          projectTitle: application.job.title,
          status: 'active'
        }
      });
    }
    
    // Send system message based on status
    let systemMessageContent = '';
    if (status === 'accepted') {
      systemMessageContent = message || `🎉 Congratulations! Your application for "${application.job.title}" has been accepted.`;
    } else if (status === 'rejected') {
      systemMessageContent = message || `We appreciate your interest in "${application.job.title}". Unfortunately, we have decided to move forward with other candidates.`;
    } else if (status === 'under_review') {
      systemMessageContent = message || `Your application for "${application.job.title}" is under review.`;
    }
    
    if (systemMessageContent) {
      await Message.create({
        conversationId: conversation._id,
        senderId: req.user.id,
        receiverId: application.professional._id,
        messageType: 'text',
        content: {
          text: systemMessageContent
        },
        metadata: {
          applicationId: application._id,
          jobId: application.job._id
        }
      });
    }
    
    console.log(`✅ [updateApplicationStatus] Application status updated from ${oldStatus} to ${status}`);
    
    res.json({
      success: true,
      message: `Application ${status} successfully`,
      application,
      conversationId: conversation._id
    });
    
  } catch (error) {
    console.error('❌ [updateApplicationStatus] Error:', error);
    res.status(500).json({
      success: false,
      message: "Error updating application status",
      error: error.message
    });
  }
});


// ✅ Export all functions
module.exports = {
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
  
  // ✅ NEW: Messaging & Application Management
  getJobApplications,
  acceptApplication,
  rejectApplication,
  startConversation,
  updateApplicationStatus  // ✅ CRITICAL: Add this new function
};
