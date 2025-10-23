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
    // ✅ CRITICAL FIX: Budget structure - make nested budget optional but keep validation
    budget: {
      min: {
        type: Number,
        min: [0, "Budget cannot be negative"]
        // ✅ REMOVED: required validation - will be set by middleware
      },
      max: {
        type: Number,
        min: [0, "Budget cannot be negative"]
        // ✅ REMOVED: required validation - will be set by middleware
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
    // ✅ CRITICAL FIX: Make these required temporarily until middleware converts
    budgetMin: {
      type: Number,
      required: [true, "Minimum budget is required"],
      min: [0, "Budget cannot be negative"]
    },
    budgetMax: {
      type: Number,
      required: [true, "Maximum budget is required"],
      min: [0, "Budget cannot be negative"],
      validate: {
        validator: function(value) {
          return value >= this.budgetMin;
        },
        message: 'Maximum budget must be greater than or equal to minimum budget'
      }
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
    // ✅ Business address information
    businessAddress: {
      businessName: {
        type: String,
        trim: true,
        maxlength: [200, "Business name cannot exceed 200 characters"],
        validate: {
          validator: function(value) {
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
jobSchema.index({ budgetMin: 1, budgetMax: 1, status: 1 });
jobSchema.index({ deadline: 1, status: 1, isExpired: 1 });
jobSchema.index({ isExpired: 1, status: 1 });
jobSchema.index({ experienceLevel: 1, status: 1 });
jobSchema.index({ duration: 1, status: 1 });
jobSchema.index({ 'businessAddress.city': 1, 'businessAddress.state': 1, status: 1 });
jobSchema.index({ location: 1, 'businessAddress.city': 1, status: 1 });

// ✅ Text search index with weights
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

// Virtual for application count
jobSchema.virtual('applicationCount').get(function() {
  return this.applications ? this.applications.length : 0;
});

// ✅ Budget range display - prefer flat fields
jobSchema.virtual('budgetRange').get(function() {
  const minBudget = this.budgetMin || this.budget?.min;
  const maxBudget = this.budgetMax || this.budget?.max;
  const budgetType = this.budgetType || this.budget?.type || 'Fixed';
  
  if (!minBudget || !maxBudget) return 'Budget not specified';
  
  const formatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  });
  
  if (minBudget === maxBudget) {
    return `${formatter.format(minBudget)} ${budgetType}`;
  }
  return `${formatter.format(minBudget)} - ${formatter.format(maxBudget)} ${budgetType}`;
});

// ✅ Complete address display virtual
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

// ✅ Short address for cards
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

jobSchema.virtual('postedDate').get(function() {
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

jobSchema.virtual('daysUntilDeadline').get(function() {
  if (!this.deadline || !(this.deadline instanceof Date)) {
    return null;
  }
  
  try {
    const now = new Date();
    const deadline = new Date(this.deadline);
    
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

// ✅ CRITICAL FIX: Middleware to populate nested budget AFTER validation passes
jobSchema.pre('save', function(next) {
  // ✅ ONLY populate nested budget if flat fields exist
  if (this.budgetMin !== undefined && this.budgetMax !== undefined) {
    this.budget = {
      min: this.budgetMin,
      max: this.budgetMax,
      type: this.budgetType || 'Fixed',
      currency: 'INR'
    };
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

  const pipeline = [];
  const matchStage = { 
    status: 'open', 
    isExpired: { $ne: true } 
  };

  if (search) {
    matchStage.$text = { $search: search };
  }

  if (category && category !== 'all') matchStage.category = category;
  if (location && location !== 'all') matchStage.location = location;
  if (experienceLevel && experienceLevel !== 'all') matchStage.experienceLevel = experienceLevel;
  if (duration && duration !== 'all') matchStage.duration = duration;

  // ✅ Use flat budget fields for filtering
  if (minBudget || maxBudget) {
    if (minBudget) matchStage['budgetMax'] = { $gte: Number(minBudget) };
    if (maxBudget) matchStage['budgetMin'] = { $lte: Number(maxBudget) };
  }

  pipeline.push({ $match: matchStage });

  if (search) {
    pipeline.push({ 
      $addFields: { 
        textScore: { $meta: "textScore" } 
      } 
    });
  }

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

  let sortStage = {};
  switch (sortBy) {
    case 'newest':
      sortStage = { createdAt: -1 };
      break;
    case 'oldest':
      sortStage = { createdAt: 1 };
      break;
    case 'highestBudget':
      sortStage = { 'budgetMax': -1 };
      break;
    case 'lowestBudget':
      sortStage = { 'budgetMin': 1 };
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

  const skip = (parseInt(page) - 1) * parseInt(limit);
  pipeline.push({ $skip: skip });
  pipeline.push({ $limit: parseInt(limit) });

  return this.aggregate(pipeline);
};

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
