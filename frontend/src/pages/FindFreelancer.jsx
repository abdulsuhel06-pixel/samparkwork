import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api, { getImageUrl } from "../services/api";
import { 
  Search, 
  Filter, 
  MapPin, 
  Eye, 
  User,
  ChevronDown,
  X,
  Star,
  Award,
  Calendar
} from "lucide-react";
import "./FindFreelancer.css";

export default function FindFreelancer() {
  const navigate = useNavigate();
  const [professionals, setProfessionals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    category: "",
    experience: "",
    location: "",
    sortBy: "newest"
  });
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const categories = [
    "CAD Design", "Casting", "Filling", "Polish", "Setting", "Rhodium",
    "Helper", "Watch Setting", "Fabric Technician", "Pattern Master",
    "Cutting Master", "Sewing Operator", "Quality Checker",
    "Packing Supervisor", "Industrial Engineer"
  ];

  const experienceLevels = [
    { value: "", label: "Any Experience" },
    { value: "0", label: "0-1 years" },
    { value: "1", label: "1-3 years" },
    { value: "3", label: "3-5 years" },
    { value: "5", label: "5+ years" },
    { value: "10", label: "10+ years" }
  ];

  const sortOptions = [
    { value: "newest", label: "Newest First" },
    { value: "experience", label: "Most Experienced" },
    { value: "name", label: "A-Z" },
    { value: "rating", label: "Highest Rated" }
  ];

  // Debounced search function
  const debouncedFetchProfessionals = useCallback(
    debounce(() => {
      fetchProfessionals();
    }, 1000),
    [filters, searchTerm]
  );

  useEffect(() => {
    debouncedFetchProfessionals();
    return () => {
      debouncedFetchProfessionals.cancel && debouncedFetchProfessionals.cancel();
    };
  }, [debouncedFetchProfessionals]);

  function debounce(func, wait) {
    let timeout;
    const debounced = (...args) => {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
    debounced.cancel = () => clearTimeout(timeout);
    return debounced;
  }

  const fetchProfessionals = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (searchTerm.trim()) params.append('search', searchTerm.trim());
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value && key !== 'sortBy') params.append(key, value);
      });
      
      const { data } = await api.get(`/api/users/professionals?${params}`);
      let professionalsData = data.professionals || data || [];
      
      professionalsData = sortProfessionals(professionalsData, filters.sortBy);
      setProfessionals(professionalsData);
    } catch (error) {
      console.error("Error fetching professionals:", error);
      setProfessionals([]);
    } finally {
      setLoading(false);
    }
  };

  const sortProfessionals = (pros, sortBy) => {
    const sorted = [...pros];
    switch (sortBy) {
      case 'experience':
        return sorted.sort((a, b) => (b.experience || 0) - (a.experience || 0));
      case 'name':
        return sorted.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      case 'rating':
        return sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      default:
        return sorted.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleSearchChange = (value) => {
    setSearchTerm(value);
  };

  const clearFilters = () => {
    setFilters({ category: "", experience: "", location: "", sortBy: "newest" });
    setSearchTerm("");
  };

  const hasActiveFilters = filters.category || searchTerm || filters.experience || filters.location || filters.sortBy !== 'newest';

  const handleViewProfile = (professionalId) => {
    navigate(`/profile/${professionalId}`);
  };

  // ✅ ENHANCED: Better experience text formatting with multiple data sources
  const getExperienceText = (professional) => {
    // Priority 1: experienceLevel field (pre-formatted text)
    if (professional.experienceLevel && professional.experienceLevel.trim() !== '') {
      return professional.experienceLevel;
    }
    
    // Priority 2: experience field (numeric)
    const experience = professional.experience;
    if (experience !== undefined && experience !== null && experience !== '') {
      const expNum = parseInt(experience);
      if (!isNaN(expNum)) {
        if (expNum === 0) return "Entry Level";
        if (expNum === 1) return "1 year experience";
        if (expNum < 5) return `${expNum} years experience`;
        return `${expNum}+ years experience`;
      }
      
      // Handle string experience values
      const expStr = String(experience).toLowerCase();
      if (expStr.includes('year') || expStr.includes('exp')) {
        return professional.experience; // Return as-is if already formatted
      }
    }
    
    // Priority 3: workExperience field (if exists)
    if (professional.workExperience && professional.workExperience.trim() !== '') {
      return professional.workExperience;
    }
    
    // Priority 4: yearsOfExperience field (if exists) 
    if (professional.yearsOfExperience !== undefined && professional.yearsOfExperience !== null) {
      const years = parseInt(professional.yearsOfExperience);
      if (!isNaN(years)) {
        if (years === 0) return "Entry Level";
        if (years === 1) return "1 year experience";
        return `${years} years experience`;
      }
    }
    
    // No experience data available
    return "";
  };

  // ✅ ENHANCED: Smarter address display with better space utilization
  const getAddress = (professional) => {
    const parts = [];
    
    // Priority 1: contact.fullAddress (detailed address object)
    const fullAddr = professional.contact?.fullAddress;
    if (fullAddr) {
      // Build address from most specific to least specific
      const addressParts = [];
      
      if (fullAddr.street && fullAddr.street.trim() !== '') addressParts.push(fullAddr.street.trim());
      if (fullAddr.area && fullAddr.area.trim() !== '' && fullAddr.area !== fullAddr.street) {
        addressParts.push(fullAddr.area.trim());
      }
      if (fullAddr.city && fullAddr.city.trim() !== '' && !addressParts.includes(fullAddr.city.trim())) {
        addressParts.push(fullAddr.city.trim());
      }
      if (fullAddr.state && fullAddr.state.trim() !== '' && !addressParts.includes(fullAddr.state.trim())) {
        addressParts.push(fullAddr.state.trim());
      }
      
      if (addressParts.length > 0) {
        const address = addressParts.join(', ');
        // ✅ INCREASED: Allow longer addresses (60 chars instead of 35)
        return address.length > 60 ? address.substring(0, 60) + '...' : address;
      }
    }
    
    // Priority 2: contact.address (simple address string)
    if (professional.contact?.address && professional.contact.address.trim() !== '') {
      const addr = professional.contact.address.trim();
      
      // Skip generic "India" addresses
      if (addr.toLowerCase() === 'india') {
        // Continue to next priority
      } else {
        // ✅ INCREASED: Allow longer addresses (60 chars instead of 35)
        return addr.length > 60 ? addr.substring(0, 60) + '...' : addr;
      }
    }
    
    // Priority 3: location field (primary location)
    if (professional.location && professional.location.trim() !== '') {
      const loc = professional.location.trim();
      if (loc.toLowerCase() !== 'india') {
        // ✅ INCREASED: Allow longer addresses (60 chars instead of 35)
        return loc.length > 60 ? loc.substring(0, 60) + '...' : loc;
      }
    }
    
    // Priority 4: Try individual address fields if available
    const individualParts = [];
    if (professional.city && professional.city.trim() !== '') individualParts.push(professional.city.trim());
    if (professional.state && professional.state.trim() !== '' && professional.state !== professional.city) {
      individualParts.push(professional.state.trim());
    }
    if (professional.district && professional.district.trim() !== '' && !individualParts.includes(professional.district.trim())) {
      individualParts.push(professional.district.trim());
    }
    
    if (individualParts.length > 0) {
      const address = individualParts.join(', ');
      return address.length > 60 ? address.substring(0, 60) + '...' : address;
    }
    
    // Final fallback: India (but this should rarely happen now)
    return 'India';
  };

  // Get avatar URL with proper fallback
  const getAvatarUrl = (professional) => {
    if (professional.avatarUrl) return professional.avatarUrl;
    if (professional.avatar) return getImageUrl(professional.avatar, 'avatars');
    return null;
  };

  // Generate star rating display
  const renderRating = (rating) => {
    if (!rating || rating === 0) return null;
    
    return (
      <div className="pro-rating">
        <Star size={14} fill="currentColor" />
        <span>{rating.toFixed(1)}</span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="find-freelancer-loading">
        <div className="loading-spinner"></div>
        <div className="loading-content">
          <h3>Finding Amazing Professionals...</h3>
          <p>Discovering top talent for your projects</p>
        </div>
      </div>
    );
  }

  return (
    <div className="find-freelancer-container">
      {/* Integrated Hero Section with Filters */}
      <div className="hero-section">
        <div className="hero-content">
          <div className="hero-text">
            <h1 className="hero-title">Find Skilled Professionals</h1>
            <p className="hero-subtitle">Connect with expert jewelry and textile professionals ready to bring your vision to life</p>
          </div>
          
          <div className="hero-stats">
            <div className="stat-badge">
              <span className="stat-number">{professionals.length}</span>
              <span className="stat-label">Professionals</span>
            </div>
          </div>
        </div>

        {/* Integrated Filters Bar */}
        <div className="filters-bar">
          <div className="filters-container">
            {/* Search */}
            <div className="search-group">
              <div className="search-wrapper">
                <Search className="search-icon" size={20} />
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search by name, skills, or category..."
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                />
                {searchTerm && (
                  <button 
                    className="clear-search"
                    onClick={() => handleSearchChange("")}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>

            {/* Desktop Filters - Horizontal Row */}
            <div className="desktop-filters text-black">
              <div className="filter-group">
                <label>Category</label>
                <select
                  className="filter-select"
                  value={filters.category}
                  onChange={(e) => handleFilterChange("category", e.target.value)}
                >
                  <option value="">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label>Experience</label>
                <select
                  className="filter-select"
                  value={filters.experience}
                  onChange={(e) => handleFilterChange("experience", e.target.value)}
                >
                  {experienceLevels.map(level => (
                    <option key={level.value} value={level.value}>
                      {level.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label>Location</label>
                <input
                  type="text"
                  className="filter-input"
                  placeholder="Enter location..."
                  value={filters.location}
                  onChange={(e) => handleFilterChange("location", e.target.value)}
                />
              </div>

              <div className="filter-group">
                <label>Sort By</label>
                <select
                  className="filter-select"
                  value={filters.sortBy}
                  onChange={(e) => handleFilterChange("sortBy", e.target.value)}
                >
                  {sortOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {hasActiveFilters && (
                <button onClick={clearFilters} className="clear-filters">
                  Clear All
                </button>
              )}
            </div>

            {/* Mobile Filter Toggle */}
            <button 
              className="mobile-filter-toggle"
              onClick={() => setShowMobileFilters(!showMobileFilters)}
            >
              <Filter size={18} />
              <span>Filters</span>
              <ChevronDown size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Filters Panel */}
      {showMobileFilters && (
        <div className="mobile-filters-overlay">
          <div className="mobile-filters">
            <div className="mobile-filters-header">
              <h3>Filters</h3>
              <button onClick={() => setShowMobileFilters(false)}>
                <X size={20} />
              </button>
            </div>
            
            <div className="mobile-filters-content">
              <div className="mobile-filter-group">
                <label>Category</label>
                <select
                  value={filters.category}
                  onChange={(e) => handleFilterChange("category", e.target.value)}
                >
                  <option value="">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="mobile-filter-group">
                <label>Experience</label>
                <select
                  value={filters.experience}
                  onChange={(e) => handleFilterChange("experience", e.target.value)}
                >
                  {experienceLevels.map(level => (
                    <option key={level.value} value={level.value}>
                      {level.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mobile-filter-group">
                <label>Location</label>
                <input
                  type="text"
                  placeholder="Enter location..."
                  value={filters.location}
                  onChange={(e) => handleFilterChange("location", e.target.value)}
                />
              </div>

              <div className="mobile-filter-group">
                <label>Sort By</label>
                <select
                  value={filters.sortBy}
                  onChange={(e) => handleFilterChange("sortBy", e.target.value)}
                >
                  {sortOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mobile-filters-actions">
              <button onClick={clearFilters} className="clear-mobile">
                Clear All
              </button>
              <button onClick={() => setShowMobileFilters(false)} className="apply-mobile">
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Results Section */}
      <div className="results-section">
        {professionals.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <Search size={64} />
            </div>
            <h3>No professionals found</h3>
            <p>Try adjusting your search criteria or clear filters to see more results</p>
            {hasActiveFilters && (
              <button className="clear-empty" onClick={clearFilters}>
                Clear All Filters
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="results-header">
              <span className="results-count">
                {professionals.length} professional{professionals.length !== 1 ? 's' : ''} found
              </span>
              <span className="results-sort">
                Sorted by: {sortOptions.find(opt => opt.value === filters.sortBy)?.label}
              </span>
            </div>

            <div className="professionals-grid">
              {professionals.map((pro) => {
                const avatarUrl = getAvatarUrl(pro);
                const experienceText = getExperienceText(pro);
                const address = getAddress(pro);
                
                return (
                  <div key={pro._id} className="pro-card">
                    {/* Card Header with Status and Rating */}
                    <div className="card-top">
                      <div className="available-badge">
                        <div className="status-dot"></div>
                        Available now
                      </div>
                      {renderRating(pro.rating)}
                    </div>

                    {/* Professional Info */}
                    <div className="pro-info">
                      <div className="pro-avatar">
                        {avatarUrl ? (
                          <img 
                            src={avatarUrl} 
                            alt={pro.name || 'Professional'}
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.parentNode.querySelector('.avatar-fallback').style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div 
                          className="avatar-fallback" 
                          style={{ display: avatarUrl ? 'none' : 'flex' }}
                        >
                          {!avatarUrl && pro.name && (
                            <span className="avatar-initial">
                              {pro.name.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="pro-details">
                        <h3 className="pro-name">{pro.name || 'Professional'}</h3>
                        <p className="pro-title">
                          {pro.title || pro.category || 'Skilled Professional'}
                        </p>
                        
                        {/* ✅ ENHANCED: Experience Display with Better Formatting */}
                        {experienceText && (
                          <div className="pro-experience">
                            <Award size={14} />
                            <span>{experienceText}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bio */}
                    {pro.bio && (
                      <div className="pro-bio">
                        <p>{pro.bio.length > 100 ? `${pro.bio.slice(0, 100)}...` : pro.bio}</p>
                      </div>
                    )}

                    {/* ✅ ENHANCED: Address Display with Better Space Utilization */}
                    <div className="pro-location">
                      <MapPin size={14} />
                      <span>{address}</span>
                    </div>

                    {/* Skills */}
                    {pro.skills && pro.skills.length > 0 && (
                      <div className="pro-skills">
                        <div className="skills-list">
                          {pro.skills.slice(0, 3).map((skill, index) => (
                            <span key={index} className="skill-tag">{skill}</span>
                          ))}
                          {pro.skills.length > 3 && (
                            <span className="skills-more">+{pro.skills.length - 3} more</span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Member Since */}
                    {pro.createdAt && (
                      <div className="pro-member-since">
                        <Calendar size={14} />
                        <span>Member since {new Date(pro.createdAt).getFullYear()}</span>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="pro-actions">
                      <button 
                        className="view-btn"
                        onClick={() => handleViewProfile(pro._id)}
                      >
                        <Eye size={14} />
                        View Profile
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
