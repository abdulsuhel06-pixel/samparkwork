// models/Ad.js
const mongoose = require("mongoose");

const adSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: [true, "Ad title is required"],
    trim: true
  },
  content: { 
    type: String, 
    required: [true, "Ad content is required"],
    trim: true
  },
  image: { 
    type: String 
  },
  mediaType: { 
    type: String, 
    enum: ["image", "video"], 
    default: "image" 
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  position: { 
    type: String, 
    enum: ["hero", "after-hero", "sidebar"], 
    default: "after-hero" 
  },
  url: {
    type: String,
    trim: true
  },
  clicks: { 
    type: Number, 
    default: 0 
  },
  impressions: { 
    type: Number, 
    default: 0 
  }
}, { timestamps: true });

module.exports = mongoose.model("Ad", adSchema);