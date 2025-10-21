const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Job title is required"],
      trim: true,
      maxlength: [100, "Job title cannot exceed 100 characters"],
      minlength: [3, "Job title must be at least 3 characters"]
    },
    description: {
      type: String,
      required: [true, "Job description is required"],
      trim: true,
      maxlength: [5000, "Job description cannot exceed 5000 characters"],
      minlength: [10, "Job description must be at least 10 characters"]
    },
    category: {
      type: String,
      required: [true, "Job category is required"],
      trim: true
    },
    subCategory: {
      type: String,
      trim: true,
      default: ""
    },
    skills: [{
      type: String,
      trim: true
    }],
    // ✅ FIXED: Budget structure to match controller expectations
    budget: {
      min: {
        type: Number,
        required: [true, "Minimum budget is required"],
        min: [0, "Budget cannot be negative"]
      },
      max: {
        type: Number,
        required: [true, "Maximum budget is required"],
        min: [0, "Budget cannot be negative"],
        validate: {
          validator: function(value) {
            return value >= this.budget.min;
          },
          message: 'Maximum budget must be greater than or equal to minimum budget'
        }
      },
      type: {
        type: String,
        enum: {
          values: ['Fixed', 'Hourly'],
          message: 'Budget type must be Fixed or Hourly'
        },
        default: 'Fixed'
      },
      currency: {
        type: String,
        default: 'INR'
      }
    },
    // ✅ KEPT: Backward compatibility fields (will be removed by controller)
    budgetMin: {
      type: Number,
      min: [0, "Budget cannot be negative"]
    },
    budgetMax: {
      type: Number,
      min: [0, "Budget cannot be negative"]
    },
    budgetType: {
      type: String,
      enum: ['Fixed', 'Hourly'],
      default: 'Fixed'
    },
    location: {
      type: String,
      enum: {
        values: ['Remote', 'On-site', 'Hybrid'],
        message: 'Location must be Remote, On-site, or Hybrid'
      },
      default: 'Remote'
    },
    // ✅ NEW: Complete business address information
    businessAddress: {
      businessName: {
        type: String,
        trim: true,
        maxlength: [200, "Business name cannot exceed 200 characters"],
        // Required only when location is On-site
        validate: {
          validator: function(value) {
            // If location is On-site, businessName is required
            return this.location !== 'On-site' || (value && value.trim().length > 0);
          },
          message: 'Business name is required for on-site jobs'
        }
      },
      streetAddress: {
        type: String,
        trim: true,
        maxlength: [300, "Street address cannot exceed 300 characters"],
        validate: {
          validator: function(value) {
            return this.location !== 'On-site' || (value && value.trim().length > 0);
          },
          message: 'Street address is required for on-site jobs'
        }
      },
      addressLine2: {
        type: String,
        trim: true,
        maxlength: [300, "Address line 2 cannot exceed 300 characters"],
        default: ""
      },
      city: {
        type: String,
        trim: true,
        maxlength: [100, "City cannot exceed 100 characters"],
        validate: {
          validator: function(value) {
            return this.location !== 'On-site' || (value && value.trim().length > 0);
          },
          message: 'City is required for on-site jobs'
        }
      },
      state: {
        type: String,
        trim: true,
        maxlength: [100, "State cannot exceed 100 characters"],
        validate: {
          validator: function(value) {
            return this.location !== 'On-site' || (value && value.trim().length > 0);
          },
          message: 'State is required for on-site jobs'
        }
      },
      postalCode: {
        type: String,
        trim: true,
        maxlength: [20, "Postal code cannot exceed 20 characters"],
        validate: {
          validator: function(value) {
            return this.location !== 'On-site' || (value && value.trim().length > 0);
          },
          message: 'Postal code is required for on-site jobs'
        }
      },
      country: {
        type: String,
        trim: true,
        maxlength: [100, "Country cannot exceed 100 characters"],
        default: "India"
      },
      landmark: {
        type: String,
        trim: true,
        maxlength: [500, "Landmark cannot exceed 500 characters"],
        default: ""
      },
      locationInstructions: {
        type: String,
        trim: true,
        maxlength: [1000, "Location instructions cannot exceed 1000 characters"],
        default: ""
      }
    },
    experienceLevel: {
      type: String,
      enum: {
        values: ['Entry', 'Intermediate', 'Expert'],
        message: 'Experience level must be Entry, Intermediate, or Expert'
      },
      default: 'Intermediate'
    },
    duration: {
      type: String,
      enum: {
        values: ['Less than 1 month', '1-3 months', '3-6 months', '6+ months'],
        message: 'Invalid duration'
      },
      default: '1-3 months'
    },
    deadline: {
      type: Date,
      validate: {
        validator: function(value) {
          return !value || value > new Date();
        },
        message: 'Deadline must be a future date'
      }
    },
    // ✅ FIXED: Status field to match controller usage
    status: {
      type: String,
      enum: {
        values: ['open', 'paused', 'closed', 'completed', 'cancelled', 'expired'],
        message: 'Status must be open, paused, closed, completed, cancelled, or expired'
      },
      default: 'open'
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Job creator is required']
    },
    applications: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application'
    }],
    views: {
      type: Number,
      default: 0
    },
    viewedBy: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      viewedAt: {
        type: Date,
        default: Date.now
      }
    }],
    featured: {
      type: Boolean,
      default: false
    },
    urgent: {
      type: Boolean,
      default: false
    },
    // ✅ NEW: Auto-expiration fields
    isExpired: {
      type: Boolean,
      default: false,
      index: true
    },
    expiredAt: {
      type: Date
    },
    autoExpireChecked: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// ✅ ENHANCED INDEXES for better performance
jobSchema.index({ createdBy: 1, status: 1, createdAt: -1 });
jobSchema.index({ category: 1, status: 1, createdAt: -1 });
jobSchema.index({ skills: 1, status: 1 });
jobSchema.index({ location: 1, status: 1 });
jobSchema.index({ 'budget.min': 1, 'budget.max': 1, status: 1 });
jobSchema.index({ deadline: 1, status: 1, isExpired: 1 });
jobSchema.index({ isExpired: 1, status: 1 });
jobSchema.index({ experienceLevel: 1, status: 1 });
jobSchema.index({ duration: 1, status: 1 });
// ✅ NEW: Address-based indexes
jobSchema.index({ 'businessAddress.city': 1, 'businessAddress.state': 1, status: 1 });
jobSchema.index({ location: 1, 'businessAddress.city': 1, status: 1 });

// ✅ ENHANCED: Text search index with weights
jobSchema.index(
  { 
    title: 'text', 
    description: 'text', 
    skills: 'text',
    category: 'text',
    'businessAddress.businessName': 'text',
    'businessAddress.city': 'text'
  },
  { 
    weights: { 
      title: 10, 
      skills: 5, 
      category: 3, 
      'businessAddress.businessName': 2,
      'businessAddress.city': 2,
      description: 1 
    },
    name: 'job_text_index'
  }
);

// ✅ COMPOUND INDEXES for complex queries
jobSchema.index({ status: 1, createdAt: -1, category: 1 });
jobSchema.index({ status: 1, 'budget.min': 1, 'budget.max': 1 });
jobSchema.index({ status: 1, location: 1, experienceLevel: 1 });

// Virtual for application count
jobSchema.virtual('applicationCount').get(function() {
  return this.applications ? this.applications.length : 0;
});

// ✅ FIXED: Budget range display using new structure
jobSchema.virtual('budgetRange').get(function() {
  if (this.budget && this.budget.min !== undefined && this.budget.max !== undefined) {
    const formatter = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    });
    
    if (this.budget.min === this.budget.max) {
      return `${formatter.format(this.budget.min)} ${this.budget.type}`;
    }
    return `${formatter.format(this.budget.min)} - ${formatter.format(this.budget.max)} ${this.budget.type}`;
  }
  return 'Budget not specified';
});

// ✅ NEW: Complete address display virtual
jobSchema.virtual('formattedAddress').get(function() {
  if (this.location !== 'On-site' || !this.businessAddress?.streetAddress) {
    return this.location || 'Remote';
  }

  const parts = [];
  const addr = this.businessAddress;
  
  if (addr.businessName) parts.push(addr.businessName);
  if (addr.streetAddress) parts.push(addr.streetAddress);
  if (addr.addressLine2) parts.push(addr.addressLine2);
  if (addr.city) parts.push(addr.city);
  if (addr.state) parts.push(addr.state);
  if (addr.postalCode) parts.push(addr.postalCode);
  
  return parts.length > 0 ? parts.join(', ') : 'On-site';
});

// ✅ NEW: Short address for cards
jobSchema.virtual('shortAddress').get(function() {
  if (this.location !== 'On-site' || !this.businessAddress?.city) {
    return this.location || 'Remote';
  }

  const addr = this.businessAddress;
  const parts = [];
  
  if (addr.businessName) parts.push(addr.businessName);
  if (addr.city) parts.push(addr.city);
  if (addr.state && addr.city !== addr.state) parts.push(addr.state);
  
  return parts.length > 0 ? parts.join(', ') : 'On-site';
});

// ✅ CRITICAL FIX: Proper null checks for date formatting
jobSchema.virtual('postedDate').get(function() {
  // ✅ FIXED: Add null/undefined checks
  if (!this.createdAt || !(this.createdAt instanceof Date)) {
    return 'Date not available';
  }
  
  try {
    return this.createdAt.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (error) {
    console.error('Error formatting posted date:', error);
    return 'Date not available';
  }
});

// ✅ CRITICAL FIX: Days until deadline with proper null checks
jobSchema.virtual('daysUntilDeadline').get(function() {
  // ✅ FIXED: Add null/undefined checks
  if (!this.deadline || !(this.deadline instanceof Date)) {
    return null;
  }
  
  try {
    const now = new Date();
    const deadline = new Date(this.deadline);
    
    // Check if deadline is valid
    if (isNaN(deadline.getTime())) {
      return null;
    }
    
    const diffTime = deadline - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  } catch (error) {
    console.error('Error calculating days until deadline:', error);
    return null;
  }
});

// ✅ MIDDLEWARE: Auto-migration for old budget structure
jobSchema.pre('save', function(next) {
  // Convert old budgetMin/budgetMax to new budget structure
  if (this.budgetMin !== undefined && this.budgetMax !== undefined && !this.budget.min) {
    this.budget = {
      min: this.budgetMin,
      max: this.budgetMax,
      type: this.budgetType || 'Fixed',
      currency: 'INR'
    };
    
    // Remove old fields
    this.budgetMin = undefined;
    this.budgetMax = undefined;
    this.budgetType = undefined;
  }
  
  // Auto-expire check with proper date validation
  if (this.deadline && !this.isExpired && this.deadline instanceof Date) {
    const now = new Date();
    if (this.deadline <= now && this.status === 'open') {
      this.isExpired = true;
      this.expiredAt = now;
      this.status = 'expired';
      console.log(`📅 Job ${this._id} auto-expired due to deadline`);
    }
  }
  
  next();
});

// ✅ STATIC METHODS for advanced queries
jobSchema.statics.findWithAdvancedSearch = function(searchParams) {
  const {
    search,
    category,
    minBudget,
    maxBudget,
    location,
    experienceLevel,
    duration,
    sortBy = 'newest',
    page = 1,
    limit = 12
  } = searchParams;

  // Build aggregation pipeline
  const pipeline = [];

  // Match active jobs only
  const matchStage = { 
    status: 'open', 
    isExpired: { $ne: true } 
  };

  // Add text search if provided
  if (search) {
    matchStage.$text = { $search: search };
  }

  // Add filters
  if (category && category !== 'all') matchStage.category = category;
  if (location && location !== 'all') matchStage.location = location;
  if (experienceLevel && experienceLevel !== 'all') matchStage.experienceLevel = experienceLevel;
  if (duration && duration !== 'all') matchStage.duration = duration;

  // Budget range filter
  if (minBudget || maxBudget) {
    if (minBudget) matchStage['budget.min'] = { $gte: Number(minBudget) };
    if (maxBudget) matchStage['budget.max'] = { $lte: Number(maxBudget) };
  }

  pipeline.push({ $match: matchStage });

  // Add text search score for sorting
  if (search) {
    pipeline.push({ 
      $addFields: { 
        textScore: { $meta: "textScore" } 
      } 
    });
  }

  // Lookup createdBy user
  pipeline.push({
    $lookup: {
      from: 'users',
      localField: 'createdBy',
      foreignField: '_id',
      as: 'createdBy',
      pipeline: [
        { $project: { name: 1, companyName: 1, avatar: 1 } }
      ]
    }
  });

  pipeline.push({
    $unwind: '$createdBy'
  });

  // Sort stage
  let sortStage = {};
  switch (sortBy) {
    case 'newest':
      sortStage = { createdAt: -1 };
      break;
    case 'oldest':
      sortStage = { createdAt: 1 };
      break;
    case 'highestBudget':
      sortStage = { 'budget.max': -1 };
      break;
    case 'lowestBudget':
      sortStage = { 'budget.min': 1 };
      break;
    case 'deadline':
      sortStage = { deadline: 1 };
      break;
    case 'relevance':
      if (search) {
        sortStage = { textScore: { $meta: "textScore" }, createdAt: -1 };
      } else {
        sortStage = { createdAt: -1 };
      }
      break;
    default:
      sortStage = { createdAt: -1 };
  }

  pipeline.push({ $sort: sortStage });

  // Pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);
  pipeline.push({ $skip: skip });
  pipeline.push({ $limit: parseInt(limit) });

  return this.aggregate(pipeline);
};

// ✅ STATIC METHOD: Auto-expire jobs with proper error handling
jobSchema.statics.autoExpireJobs = async function() {
  try {
    const now = new Date();
    
    const expiredJobs = await this.updateMany(
      { 
        deadline: { $lte: now, $ne: null },
        status: 'open',
        isExpired: { $ne: true }
      },
      { 
        $set: { 
          isExpired: true,
          expiredAt: now,
          status: 'expired'
        }
      }
    );
    
    if (expiredJobs.modifiedCount > 0) {
      console.log(`📅 Auto-expired ${expiredJobs.modifiedCount} jobs due to deadline`);
    }
    
    return expiredJobs;
  } catch (error) {
    console.error('Error auto-expiring jobs:', error);
    return { modifiedCount: 0 };
  }
};

module.exports = mongoose.model("Job", jobSchema);
