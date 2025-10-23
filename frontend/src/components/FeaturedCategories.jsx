import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api, { getImageUrl, getNetworkInfo } from "../services/api";
import { useAuth } from "../context/AuthContext";
import "./FeaturedCategories.css";

const FeaturedCategories = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // ✅ CHANGED: Default to 'Textile' instead of 'Jewellery' for attractive first impression
  const [selectedIndustry, setSelectedIndustry] = useState('Textile');
  const [filterLoading, setFilterLoading] = useState(false);

  // ✅ REORDERED: Textile first, then Jewellery
  const industries = ['Textile', 'Jewellery'];

  useEffect(() => {
    fetchCategories();
  }, []);

  // ✅ FIXED: Separate effect for industry filter changes
  useEffect(() => {
    if (selectedIndustry) {
      fetchCategories();
    }
  }, [selectedIndustry]);

  const fetchCategories = async () => {
    try {
      // ✅ FIXED: Updated loading state logic (no 'All' reference)
      if (!categories.length) {
        setLoading(true);
      } else {
        setFilterLoading(true);
      }
      setError(null);
      
      console.log("🔍 Fetching popular categories for industry:", selectedIndustry);
      console.log("🌐 Network info:", getNetworkInfo());
      
      // ✅ FIXED: Always use industry parameter (no 'All' condition)
      const url = `/api/categories/featured?industry=${selectedIndustry}`;
      
      const response = await api.get(url);
      
      console.log("✅ Full Categories response:", response.data);
      console.log("🏭 Applied industry filter:", selectedIndustry);
      
      // Handle the response format from your backend
      let categoriesData = [];
      if (response.data.success && response.data.categories) {
        categoriesData = response.data.categories;
      } else if (Array.isArray(response.data)) {
        categoriesData = response.data;
      } else {
        categoriesData = response.data.data || [];
      }
      
      // ✅ MOBILE COMPATIBLE: Process image URLs for mobile compatibility
      categoriesData = categoriesData.map(category => {
        const processedCategory = {
          ...category,
          // ✅ FIXED: Use getImageUrl helper for mobile compatibility
          imageUrl: getImageUrl(category.imageUrl || category.image)
        };
        
        console.log(`📱 Category "${category.name}":`, {
          originalImageUrl: category.imageUrl || category.image,
          processedImageUrl: processedCategory.imageUrl,
          industry: category.industry,
          isMobile: getNetworkInfo().isMobile
        });
        
        return processedCategory;
      });
      
      // Debug the actual data structure
      if (categoriesData.length > 0) {
        console.log("🔍 First category data:", categoriesData[0]);
        console.log("🔍 Available fields:", Object.keys(categoriesData[0]));
        console.log("🏭 Categories by industry:", categoriesData.map(c => ({ 
          name: c.name, 
          industry: c.industry,
          imageUrl: c.imageUrl 
        })));
      }
      
      setCategories(categoriesData);
      console.log(`✅ Loaded ${categoriesData.length} popular categories for industry: ${selectedIndustry} (${getNetworkInfo().isMobile ? 'Mobile' : 'Desktop'})`);
      
    } catch (err) {
      console.error("❌ Error fetching categories:", err);
      console.error("🌐 Network info:", getNetworkInfo());
      
      let errorMessage = "Failed to load popular categories.";
      
      if (err.response?.status === 404) {
        errorMessage = `No ${selectedIndustry} categories found. Please add some ${selectedIndustry} categories first.`;
      } else if (err.response?.status >= 500) {
        errorMessage = "Server error. Please try again later.";
      } else if (err.code === 'NETWORK_ERROR' || !err.response) {
        errorMessage = "Network error. Please check your internet connection.";
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
      setFilterLoading(false);
    }
  };

  // ✅ FIXED: Handle industry filter change
  const handleIndustryChange = (industry) => {
    console.log("🏭 Industry filter changed to:", industry);
    setSelectedIndustry(industry);
  };

  // ✅ ENHANCED: Handle card click - Navigate to FindJobs with category filter
  const handleCardClick = (category) => {
    console.log("🎯 [FeaturedCategories] Card clicked for category:", category.name);
    
    // Create URL parameters for category filtering
    const params = new URLSearchParams({
      category: category.name,
      industry: selectedIndustry,
      categoryName: category.name
    });
    
    // Add category slug if available for better SEO
    if (category.slug) {
      params.append('categorySlug', category.slug);
    }
    
    // Add category ID for exact matching
    if (category._id) {
      params.append('categoryId', category._id);
    }
    
    const targetUrl = `/find-jobs?${params.toString()}`;
    console.log("🔗 [FeaturedCategories] Navigating to:", targetUrl);
    
    // Navigate to FindJobs with category pre-filtered
    navigate(targetUrl);
  };

  if (loading) {
    return (
      <section className="featured-categories-section">
        <div className="featured-container">
          <div className="featured-simple-header">
            <h2 className="featured-section-title">Popular Categories</h2>
            
            {/* ✅ FIXED: Industry Filter Buttons - Show even during loading */}
            <div className="featured-industry-filter">
              {industries.map((industry) => (
                <button
                  key={industry}
                  className={`featured-industry-btn ${selectedIndustry === industry ? 'active' : ''}`}
                  onClick={() => handleIndustryChange(industry)}
                  disabled={loading}
                >
                  {industry}
                </button>
              ))}
            </div>
          </div>
          <div className="featured-loading-container">
            <div className="featured-loading-spinner"></div>
            <p className="featured-loading-text">Loading {selectedIndustry} Categories...</p>
            <small className="network-info">
              {getNetworkInfo().isMobile ? '📱 Mobile Network' : '💻 Desktop'}
            </small>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="featured-categories-section">
        <div className="featured-container">
          <div className="featured-simple-header">
            <h2 className="featured-section-title">Popular Categories</h2>
            
            {/* ✅ FIXED: Industry Filter Buttons - Show even during error */}
            <div className="featured-industry-filter">
              {industries.map((industry) => (
                <button
                  key={industry}
                  className={`featured-industry-btn ${selectedIndustry === industry ? 'active' : ''}`}
                  onClick={() => handleIndustryChange(industry)}
                >
                  {industry}
                </button>
              ))}
            </div>
          </div>
          <div className="featured-error-container">
            <div className="featured-error-icon">⚠️</div>
            <h3>Unable to Load Categories</h3>
            <p>{error}</p>
            <small className="network-info">
              Network: {getNetworkInfo().isMobile ? '📱 Mobile' : '💻 Desktop'} | 
              IP: {getNetworkInfo().hostname}
            </small>
            <button 
              className="featured-retry-button"
              onClick={fetchCategories}
            >
              Try Again
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (categories.length === 0) {
    return (
      <section className="featured-categories-section">
        <div className="featured-container">
          <div className="featured-simple-header">
            <h2 className="featured-section-title">Popular Categories</h2>
            
            {/* ✅ FIXED: Industry Filter Buttons */}
            <div className="featured-industry-filter">
              {industries.map((industry) => (
                <button
                  key={industry}
                  className={`featured-industry-btn ${selectedIndustry === industry ? 'active' : ''}`}
                  onClick={() => handleIndustryChange(industry)}
                >
                  {industry}
                </button>
              ))}
            </div>
          </div>
          <div className="featured-empty-container">
            <div className="featured-empty-icon">📂</div>
            <h3>No {selectedIndustry} Categories Yet</h3>
            <p>
              No featured {selectedIndustry} categories found. Try selecting a different industry or add some {selectedIndustry} categories.
            </p>
            {user?.role === 'admin' && (
              <button 
                className="featured-admin-button"
                onClick={() => navigate('/admin/categories')}
              >
                Manage Categories
              </button>
            )}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="featured-categories-section">
      <div className="featured-container">
        {/* ✅ CLEAN: Simple Header with Industry Filter */}
        <div className="featured-simple-header">
          <h2 className="featured-section-title">Popular Categories</h2>
          
          {/* ✅ UPDATED: Textile first in filter buttons */}
          <div className="featured-industry-filter">
            {industries.map((industry) => (
              <button
                key={industry}
                className={`featured-industry-btn ${selectedIndustry === industry ? 'active' : ''} ${filterLoading ? 'loading' : ''}`}
                onClick={() => handleIndustryChange(industry)}
                disabled={filterLoading}
              >
                {filterLoading && selectedIndustry === industry ? (
                  <>
                    <div className="featured-btn-spinner"></div>
                    {industry}
                  </>
                ) : (
                  industry
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ✅ CLEAN: No Hover Effects Categories Grid */}
        <div className={`featured-categories-grid no-hover ${filterLoading ? 'filtering' : ''}`}>
          {categories.map((category, index) => {
            const categoryId = category._id || category.id || index;
            const categorySlug = category.slug || 
                               category.name?.toLowerCase().replace(/\s+/g, '-') || 
                               categoryId;
            
            // ✅ MOBILE COMPATIBLE: Use processed imageUrl
            const fullImageUrl = category.imageUrl;
            
            console.log(`🖼️ Rendering category "${category.name}" with image:`, {
              imageUrl: fullImageUrl,
              isMobile: getNetworkInfo().isMobile,
              hasImage: !!fullImageUrl
            });
            
            return (
              <div 
                key={categoryId} 
                className="featured-category-card no-hover-card"
                style={{
                  backgroundImage: fullImageUrl ? 
                    `linear-gradient(135deg, rgba(0, 0, 0, 0.3) 0%, rgba(0, 0, 0, 0.6) 100%), url(${fullImageUrl})` : 
                    'linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%)',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat'
                }}
                onClick={() => handleCardClick(category)}
                role="button"
                tabIndex={0}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleCardClick(category);
                  }
                }}
                aria-label={`View jobs in ${category.name} category`}
              >
                {/* Fallback for No Image */}
                {!fullImageUrl && (
                  <div className="featured-category-no-image">
                    <div className="featured-no-image-icon">🖼️</div>
                    <span>No Image</span>
                    <small>{getNetworkInfo().isMobile ? 'Mobile' : 'Desktop'}</small>
                  </div>
                )}

                {/* ✅ CLEAN: Simple Content Overlay - No Hover Effects */}
                <div className="featured-category-content-overlay clean-no-hover">
                  {/* Category Title */}
                  <h3 className="featured-category-title simple-title">
                    {category.name || 'Unnamed Category'}
                  </h3>
                  
                  {/* Category Description */}
                  <p className="featured-category-description simple-description">
                    {category.description || "Discover top professionals in this category"}
                  </p>

                  {/* ✅ CLEAN: Simple touch indicator */}
                  <div className="touch-indicator simple-touch">
                    <span className="tap-text">Tap to explore</span>
                    <div className="tap-arrow">→</div>
                  </div>
                </div>

                {/* ✅ REMOVED: No hover overlay at all */}
              </div>
            );
          })}
        </div>

        {/* View All Section */}
        <div className="featured-view-all-section">
          <button 
            className="featured-view-all-button simple-button"
            onClick={() => navigate('/find-jobs')}
          >
            View All Jobs
          </button>
        </div>
      </div>
    </section>
  );
};

export default FeaturedCategories;
