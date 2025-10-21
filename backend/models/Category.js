const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Category name is required"],
      trim: true,
      unique: true,
      maxlength: [100, "Category name cannot exceed 100 characters"]
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"]
    },
    image: {
      type: String, // Store file path
    },
    industry: {
      type: String,
      trim: true,
      maxlength: [100, "Industry cannot exceed 100 characters"]
    },
    parentCategory: {
      type: String,
      trim: true,
      maxlength: [100, "Parent category cannot exceed 100 characters"]
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Add indexes for better performance
categorySchema.index({ isFeatured: 1, active: 1 });
categorySchema.index({ name: 1 });
categorySchema.index({ industry: 1 });

module.exports = mongoose.model("Category", categorySchema);
