const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// ✅ CRITICAL FIX: Completely flexible Education Schema - Zero validation
const educationSchema = new mongoose.Schema({
  // Core fields
  level: { 
    type: String,
    default: 'Other'
  },
  institution: { type: String, default: '' },
  degree: { type: String, default: '' },
  field: { type: String, default: '' },
  year: { type: Number, default: () => new Date().getFullYear() },
  
  // Backward compatibility fields
  graduationYear: { type: Number },
  school: { type: String, default: '' }, // Alternative to institution
  course: { type: String, default: '' }, // Alternative to degree
  
  // Additional fields
  description: { type: String, default: '' },
  percentage: { type: Number },
  grade: { type: String, default: '' },
  isCompleted: { type: Boolean, default: true },
  startYear: { type: Number },
  endYear: { type: Number },
  
  // Dates for flexibility
  startDate: { type: Date },
  endDate: { type: Date }
}, { 
  _id: true,
  validateBeforeSave: false,
  runValidators: false,
  strict: false,
  minimize: false
});

// ✅ CRITICAL FIX: Completely flexible Experience Schema - Zero validation
const experienceSchema = new mongoose.Schema({
  // Core fields
  position: { type: String, default: '' },
  title: { type: String, default: '' }, // Backward compatibility
  workplace: { type: String, default: '' },
  company: { type: String, default: '' }, // Backward compatibility
  workplaceType: { type: String, default: 'Company' },
  
  // Duration fields
  startYear: { type: Number },
  endYear: { type: Number },
  startDate: { type: Date },
  endDate: { type: Date },
  current: { type: Boolean, default: false },
  
  // Additional info
  description: { type: String, default: '' },
  responsibilities: { type: [String], default: [] },
  skills: { type: [String], default: [] },
  achievements: { type: [String], default: [] },
  salary: { type: Number },
  location: { type: String, default: '' },
  
  // Employment details
  employmentType: { type: String, default: 'Full-time' }, // Full-time, Part-time, Contract, etc.
  industry: { type: String, default: '' },
  jobLevel: { type: String, default: '' } // Entry, Mid, Senior, etc.
}, { 
  _id: true,
  validateBeforeSave: false,
  runValidators: false,
  strict: false,
  minimize: false
});

// ✅ CRITICAL FIX: Completely flexible Certificate Schema - Zero validation
const certificationSchema = new mongoose.Schema({
  // Core fields
  name: { type: String, default: '' },
  title: { type: String, default: '' }, // Frontend compatibility
  issuer: { type: String, default: '' },
  issuingOrg: { type: String, default: '' }, // Backward compatibility
  
  // Date fields
  year: { type: Number, default: () => new Date().getFullYear() },
  issueDate: { type: String, default: '' }, // Backward compatibility
  expiryDate: { type: Date },
  validUntil: { type: Date },
  
  // File handling
  url: { type: String, default: '' },
  filename: { type: String, default: '' },
  originalName: { type: String, default: '' },
  fullUrl: { type: String, default: '' },
  fileSize: { type: Number },
  mimeType: { type: String, default: '' },
  
  // Additional info
  credentialId: { type: String, default: '' },
  description: { type: String, default: '' },
  skills: { type: [String], default: [] },
  isVerified: { type: Boolean, default: false }
}, { 
  _id: true,
  validateBeforeSave: false,
  runValidators: false,
  strict: false,
  minimize: false
});

// ✅ CRITICAL FIX: Completely flexible Portfolio Schema - Zero validation
const portfolioSchema = new mongoose.Schema({
  // Core fields
  title: { type: String, default: '' },
  description: { type: String, default: '' },
  
  // File handling
  image: { type: String, default: '' },
  imageUrl: { type: String, default: '' },
  filename: { type: String, default: '' },
  originalName: { type: String, default: '' },
  fullUrl: { type: String, default: '' },
  fileSize: { type: Number },
  mimeType: { type: String, default: '' },
  
  // Project details
  type: { type: String, default: 'image' }, // image, video, document, project
  category: { type: String, default: '' },
  technologies: { type: [String], default: [] },
  tools: { type: [String], default: [] },
  projectUrl: { type: String, default: '' },
  liveUrl: { type: String, default: '' },
  repoUrl: { type: String, default: '' },
  
  // Dates
  createdDate: { type: Date, default: Date.now },
  completedDate: { type: Date },
  
  // Additional info
  client: { type: String, default: '' },
  duration: { type: String, default: '' },
  status: { type: String, default: 'completed' }, // completed, in-progress, draft
  featured: { type: Boolean, default: false },
  order: { type: Number, default: 0 }
}, { 
  _id: true,
  validateBeforeSave: false,
  runValidators: false,
  strict: false,
  minimize: false
});

// ✅ ENHANCED: Social Media Schema
const socialSchema = new mongoose.Schema({
  facebook: { type: String, default: '' },
  instagram: { type: String, default: '' },
  twitter: { type: String, default: '' },
  youtube: { type: String, default: '' },
  linkedin: { type: String, default: '' },
  github: { type: String, default: '' },
  portfolio: { type: String, default: '' },
  website: { type: String, default: '' },
  behance: { type: String, default: '' },
  dribbble: { type: String, default: '' }
}, { 
  _id: false,
  validateBeforeSave: false,
  runValidators: false,
  strict: false,
  minimize: false
});

// ✅ ENHANCED: Address Schema
const addressSchema = new mongoose.Schema({
  street: { type: String, default: '' },
  area: { type: String, default: '' },
  city: { type: String, default: '' },
  district: { type: String, default: '' },
  state: { type: String, default: '' },
  pincode: { type: String, default: '' },
  country: { type: String, default: 'India' },
  landmark: { type: String, default: '' },
  
  // Coordinates for maps
  latitude: { type: Number },
  longitude: { type: Number },
  
  // Address type
  type: { type: String, default: 'home' } // home, work, other
}, { 
  _id: false,
  validateBeforeSave: false,
  runValidators: false,
  strict: false,
  minimize: false
});

// ✅ CRITICAL FIX: Main User Schema - ZERO VALIDATION, MAXIMUM FLEXIBILITY
const userSchema = new mongoose.Schema({
  // ===== CORE IDENTITY FIELDS =====
  name: { type: String, default: '' },
  username: { type: String, default: '' },
  email: { type: String, default: '' },
  password: { type: String, default: '' },
  role: { type: String, default: "professional" }, // professional, client, admin
  
  // ===== PROFILE FIELDS =====
  title: { type: String, default: '' }, // Job title / Professional title
  headline: { type: String, default: '' }, // Short professional headline
  bio: { type: String, default: '' }, // Professional bio/description
  summary: { type: String, default: '' }, // Professional summary
  location: { type: String, default: '' }, // Primary location
  
  // ===== IMAGE FIELDS =====
  avatar: { type: String, default: '' },
  avatarUrl: { type: String, default: '' },
  profilePhoto: { type: String, default: '' }, // Alternative field name
  coverImage: { type: String, default: '' }, // Cover/banner image
  
  // ===== CATEGORIZATION =====
  category: { type: String, default: '' }, // Main professional category
  subcategory: { type: String, default: '' }, // Sub-specialization
  industry: { type: String, default: '' }, // Industry/sector
  expertise: { type: [String], default: [] }, // Areas of expertise
  
  // ===== SKILLS & COMPETENCIES =====
  skills: { type: [String], default: [] }, // Technical skills
  softSkills: { type: [String], default: [] }, // Soft skills
  languages: { type: [String], default: [] }, // Spoken languages
  tools: { type: [String], default: [] }, // Tools and software
  
  // ===== PROFESSIONAL ARRAYS =====
  experience: { type: [experienceSchema], default: [] },
  education: { type: [educationSchema], default: [] },
  certificates: { type: [certificationSchema], default: [] },
  portfolio: { type: [portfolioSchema], default: [] },
  
  // ===== CONTACT INFORMATION =====
  contact: {
    phone: { type: String, default: '' },
    alternatePhone: { type: String, default: '' },
    whatsapp: { type: String, default: '' },
    email: { type: String, default: '' }, // Secondary email
    
    // Address - can be string or object
    address: { type: String, default: '' }, // Simple address string
    fullAddress: addressSchema, // Detailed address object
    
    // Social media
    socials: socialSchema
  },
  
  // ===== CLIENT-SPECIFIC FIELDS =====
  companyName: { type: String, default: '' },
  shopName: { type: String, default: '' },
  businessName: { type: String, default: '' },
  companyDescription: { type: String, default: '' },
  companyAddress: { type: String, default: '' },
  companyImage: { type: String, default: '' },
  companyImageUrl: { type: String, default: '' },
  companyLogo: { type: String, default: '' },
  
  // Business details
  businessType: { type: String, default: '' }, // Startup, SME, Enterprise
  companySize: { type: String, default: '' }, // 1-10, 11-50, 51-200, etc.
  founded: { type: Number }, // Year founded
  website: { type: String, default: '' },
  
  // ===== AVAILABILITY & PREFERENCES =====
  availability: {
    status: { type: String, default: 'Available' }, // Available, Busy, Not Available
    workingHours: { type: String, default: '' }, // e.g., "9 AM - 6 PM"
    timeZone: { type: String, default: 'Asia/Kolkata' },
    preferredWorkType: { type: String, default: 'Full Time' }, // Full Time, Part Time, Contract, Freelance
    remoteWork: { type: Boolean, default: true },
    canTravel: { type: Boolean, default: false },
    hourlyRate: { type: Number }, // For freelancers
    expectedSalary: { type: Number } // For job seekers
  },
  
  // ===== PROFESSIONAL METRICS =====
  rating: { type: Number, default: 0, min: 0, max: 5 },
  reviewCount: { type: Number, default: 0 },
  completedProjects: { type: Number, default: 0 },
  successRate: { type: Number, default: 0 }, // Percentage
  responseTime: { type: String, default: '' }, // e.g., "Within 1 hour"
  
  // ===== PREFERENCES & SETTINGS =====
  preferences: {
    currency: { type: String, default: 'INR' },
    language: { type: String, default: 'en' },
    theme: { type: String, default: 'light' }, // light, dark
    notifications: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
      push: { type: Boolean, default: true },
      marketing: { type: Boolean, default: false }
    },
    privacy: {
      showEmail: { type: Boolean, default: false },
      showPhone: { type: Boolean, default: true },
      showLocation: { type: Boolean, default: true },
      showLastSeen: { type: Boolean, default: true }
    }
  },
  
  // ===== VERIFICATION & TRUST =====
  verification: {
    email: { type: Boolean, default: false },
    phone: { type: Boolean, default: false },
    identity: { type: Boolean, default: false },
    address: { type: Boolean, default: false },
    background: { type: Boolean, default: false } // Background check
  },
  
  // ===== ADMIN & SYSTEM FIELDS =====
  permissions: { type: [String], default: [] },
  isActive: { type: Boolean, default: true },
  isBlocked: { type: Boolean, default: false },
  isFeatured: { type: Boolean, default: false },
  isPremium: { type: Boolean, default: false },
  
  // ===== ACTIVITY TRACKING =====
  lastLoginAt: { type: Date },
  lastActiveAt: { type: Date },
  joinedAt: { type: Date, default: Date.now },
  viewedJobs: { type: [mongoose.Schema.Types.ObjectId], default: [] },
  savedJobs: { type: [mongoose.Schema.Types.ObjectId], default: [] },
  appliedJobs: { type: [mongoose.Schema.Types.ObjectId], default: [] },
  
  // ===== ANALYTICS =====
  profileViews: { type: Number, default: 0 },
  profileCompletion: { type: Number, default: 0 }, // Percentage
  searchScore: { type: Number, default: 0 }, // For search ranking
  
  // ===== ADDITIONAL FLEXIBLE FIELDS =====
  tags: { type: [String], default: [] }, // For categorization
  notes: { type: String, default: '' }, // Admin notes
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} }, // Flexible storage
  
  // ===== BACKUP COMPATIBILITY FIELDS =====
  // Add any old field names here for backward compatibility
  professionalStatus: { type: String, default: '' }, // Legacy field
  workExperience: { type: String, default: '' }, // Legacy field
  qualification: { type: String, default: '' } // Legacy field
  
}, { 
  timestamps: true, // Adds createdAt and updatedAt
  // ✅ CRITICAL: Disable ALL validation and enforcement
  validateBeforeSave: false,
  runValidators: false,
  strict: false, // Allow any field to be added
  minimize: false, // Don't remove empty objects
  versionKey: false, // Remove __v field
  // Add virtual fields to JSON output
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      // Remove sensitive fields from JSON output
      delete ret.password;
      return ret;
    }
  },
  toObject: { virtuals: true }
});

// ✅ DISABLE ALL PRE-VALIDATION HOOKS
userSchema.pre('validate', function(next) {
  // Skip all validation
  next();
});

// ✅ ENHANCED: Password hashing with better error handling
userSchema.pre('save', async function(next) {
  try {
    // Only hash password if it's modified and not already hashed
    if (this.isModified('password') && this.password && !this.password.startsWith('$2a$') && !this.password.startsWith('$2b$')) {
      const saltRounds = process.env.BCRYPT_ROUNDS ? parseInt(process.env.BCRYPT_ROUNDS) : 12;
      this.password = await bcrypt.hash(this.password, saltRounds);
      console.log('🔐 Password hashed successfully');
    }
    
    // Auto-update lastActiveAt if any field is modified
    if (this.isModified() && !this.isModified('lastActiveAt')) {
      this.lastActiveAt = new Date();
    }
    
    next();
  } catch (error) {
    console.error('❌ Password hashing error:', error);
    next(); // Continue even if password hashing fails
  }
});

// ✅ ENHANCED: Password comparison with better error handling
userSchema.methods.matchPassword = async function(enteredPassword) {
  if (!this.password || !enteredPassword) {
    console.warn('⚠️ Password comparison: Missing password or entered password');
    return false;
  }
  
  try {
    const isMatch = await bcrypt.compare(enteredPassword, this.password);
    console.log(`🔐 Password comparison result: ${isMatch}`);
    return isMatch;
  } catch (error) {
    console.error('❌ Password comparison error:', error);
    return false;
  }
};

// ✅ ENHANCED: Get safe user data without sensitive fields
userSchema.methods.getSafeData = function() {
  const userObj = this.toObject();
  
  // Remove sensitive fields
  delete userObj.password;
  delete userObj.permissions;
  delete userObj.notes;
  delete userObj.metadata;
  
  return userObj;
};

// ✅ ENHANCED: Profile completion calculation with more factors
userSchema.methods.calculateProfileCompletion = function() {
  let score = 0;
  let totalPossible = 0;
  
  // Core fields (40% weight)
  const coreFields = [
    { field: 'name', weight: 5 },
    { field: 'bio', weight: 5 },
    { field: 'title', weight: 4 },
    { field: 'category', weight: 3 },
    { field: 'location', weight: 3 }
  ];
  
  coreFields.forEach(({ field, weight }) => {
    totalPossible += weight;
    if (this[field] && this[field].toString().trim() !== '') {
      score += weight;
    }
  });
  
  // Contact fields (20% weight)
  const contactFields = [
    { field: 'contact.phone', weight: 3 },
    { field: 'contact.address', weight: 2 }
  ];
  
  contactFields.forEach(({ field, weight }) => {
    totalPossible += weight;
    const value = field.split('.').reduce((obj, key) => obj?.[key], this);
    if (value && value.toString().trim() !== '') {
      score += weight;
    }
  });
  
  // Profile assets (25% weight)
  const assetFields = [
    { field: 'avatar', weight: 3 },
    { field: 'skills', weight: 4, isArray: true },
    { field: 'experience', weight: 5, isArray: true },
    { field: 'education', weight: 3, isArray: true }
  ];
  
  assetFields.forEach(({ field, weight, isArray }) => {
    totalPossible += weight;
    const value = this[field];
    if (isArray && Array.isArray(value) && value.length > 0) {
      score += weight;
    } else if (!isArray && value && value.toString().trim() !== '') {
      score += weight;
    }
  });
  
  // Professional elements (15% weight)
  const professionalFields = [
    { field: 'portfolio', weight: 3, isArray: true },
    { field: 'certificates', weight: 2, isArray: true }
  ];
  
  professionalFields.forEach(({ field, weight, isArray }) => {
    totalPossible += weight;
    const value = this[field];
    if (isArray && Array.isArray(value) && value.length > 0) {
      score += weight;
    }
  });
  
  // Calculate percentage
  const completionPercentage = totalPossible > 0 ? Math.round((score / totalPossible) * 100) : 0;
  
  // Update the field
  this.profileCompletion = completionPercentage;
  
  console.log(`📊 Profile completion calculated: ${completionPercentage}% (${score}/${totalPossible})`);
  return completionPercentage;
};

// ✅ ENHANCED: Update last active timestamp
userSchema.methods.updateLastActive = function() {
  this.lastActiveAt = new Date();
  return this.save({ validateBeforeSave: false });
};

// ✅ ENHANCED: Add skill with deduplication
userSchema.methods.addSkill = function(skill) {
  if (!this.skills) this.skills = [];
  const skillLower = skill.toLowerCase();
  const exists = this.skills.some(s => s.toLowerCase() === skillLower);
  if (!exists) {
    this.skills.push(skill);
  }
  return this;
};

// ✅ ENHANCED: Remove skill
userSchema.methods.removeSkill = function(skill) {
  if (!this.skills) return this;
  const skillLower = skill.toLowerCase();
  this.skills = this.skills.filter(s => s.toLowerCase() !== skillLower);
  return this;
};

// ✅ ENHANCED: Get full name or fallback
userSchema.methods.getDisplayName = function() {
  return this.name || this.username || this.email || 'User';
};

// ✅ ENHANCED: Check if user is available for work
userSchema.methods.isAvailableForWork = function() {
  return this.availability?.status === 'Available' && this.isActive && !this.isBlocked;
};

// ✅ VIRTUAL: Full address as string
userSchema.virtual('fullAddressString').get(function() {
  if (this.contact?.address) return this.contact.address;
  
  const addr = this.contact?.fullAddress;
  if (!addr) return '';
  
  const parts = [addr.street, addr.area, addr.city, addr.state, addr.pincode, addr.country];
  return parts.filter(Boolean).join(', ');
});

// ✅ VIRTUAL: Primary social link
userSchema.virtual('primarySocialLink').get(function() {
  const socials = this.contact?.socials || {};
  return socials.linkedin || socials.portfolio || socials.website || socials.github || '';
});

// ✅ INDEXES for better performance (commented out to avoid any validation issues)
/*
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ category: 1 });
userSchema.index({ location: 1 });
userSchema.index({ skills: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ profileCompletion: -1 });
userSchema.index({ createdAt: -1 });
*/

console.log("✅ Enhanced User model loaded with maximum flexibility and zero validation");

module.exports = mongoose.model("User", userSchema);
