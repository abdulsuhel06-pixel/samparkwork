const mongoose = require("mongoose");

const jobViewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job", 
      required: true
    },
    userEmail: {
      type: String,
      required: true,
      trim: true
    },
    viewedAt: {
      type: Date,
      default: Date.now
    }
  },
  { 
    timestamps: true 
  }
);

// ✅ CRITICAL: Compound unique index to prevent duplicate views per user per job
jobViewSchema.index({ user: 1, job: 1 }, { unique: true });
jobViewSchema.index({ userEmail: 1, job: 1 }, { unique: true });
jobViewSchema.index({ job: 1 }); // For efficient job-based queries
jobViewSchema.index({ viewedAt: -1 }); // For time-based queries

module.exports = mongoose.model("JobView", jobViewSchema);
