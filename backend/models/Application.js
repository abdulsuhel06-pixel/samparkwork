const mongoose = require("mongoose");

const applicationSchema = new mongoose.Schema(
  {
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: [true, "Job reference is required"]
    },
    professional: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Professional reference is required"]
    },
    coverLetter: {
      type: String,
      required: [true, "Cover letter is required"],
      trim: true,
      maxlength: [2000, "Cover letter cannot exceed 2000 characters"],
      minlength: [50, "Cover letter must be at least 50 characters"]
    },
    proposedBudget: {
      type: Number,
      min: [0, "Proposed budget cannot be negative"]
    },
    estimatedTimeline: {
      type: String,
      trim: true,
      maxlength: [200, "Estimated timeline cannot exceed 200 characters"]
    },
    status: {
      type: String,
      enum: {
        values: ["pending", "accepted", "rejected", "withdrawn"],
        message: 'Status must be pending, accepted, rejected, or withdrawn'
      },
      default: "pending"
    },
    appliedAt: {
      type: Date,
      default: Date.now
    },
    reviewedAt: {
      type: Date
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, "Notes cannot exceed 1000 characters"]
    }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Compound index to prevent duplicate applications
applicationSchema.index({ job: 1, professional: 1 }, { unique: true });

// Index for better query performance
applicationSchema.index({ professional: 1, status: 1, createdAt: -1 });
applicationSchema.index({ job: 1, status: 1, createdAt: -1 });

// Virtual for time since applied
applicationSchema.virtual('appliedTimeAgo').get(function() {
  const now = new Date();
  const diff = now - this.appliedAt;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days === 0) return 'Today';
  if (days === 1) return '1 day ago';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return `${Math.floor(days / 30)} months ago`;
});

module.exports = mongoose.model("Application", applicationSchema);
