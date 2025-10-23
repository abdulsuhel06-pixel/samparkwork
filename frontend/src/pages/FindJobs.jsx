import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { apiHelpers } from "../services/api";
import {
  Search, MapPin, Users, IndianRupee, 
  ChevronLeft, ChevronRight, Briefcase, Clock, X, Filter, 
  AlertCircle, Calendar, Building, Star, Eye, Send, User, ChevronDown, Trash2,
  Tag, ArrowLeft
} from "lucide-react";
import "./FindJobs.css";

const LIMIT = 12;

// ✅ CRITICAL FIX: Add debounce utility function at the top
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export default function FindJobs() {
  const navigate = useNavigate();
  const { user, canApplyToJobs } = useAuth();
  
  // ✅ NEW: URL parameters support for category filtering
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [jobs, setJobs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(new Set());
  const [searchText, setSearchText] = useState("");
  const [categories, setCategories] = useState([]);
  const [filters, setFilters] = useState({
    category: "", 
    minBudget: "", 
    maxBudget: "", 
    experienceLevel: "", 
    location: "",
    sortBy: "newest"
  });
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const sheetRef = useRef(null);

  // ✅ NEW: Category filtering state
  const [activeCategory, setActiveCategory] = useState(null);
  const [categoryInfo, setCategoryInfo] = useState(null);
  const [error, setError] = useState(null); // ✅ Add error state

  // ✅ NEW: Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, job: null, loading: false });

  // ✅ NEW: Smart category matching function
  const findMatchingCategory = (searchCategory, availableCategories) => {
    if (!searchCategory || !availableCategories.length) return null;
    
    const search = searchCategory.toLowerCase().trim();
    
    // 1. Exact match
    let match = availableCategories.find(cat => 
      (cat.name || cat).toLowerCase() === search
    );
    if (match) {
      console.log('✅ [FindJobs] Exact category match:', match.name || match);
      return match.name || match;
    }
    
    // 2. Contains match
    match = availableCategories.find(cat => 
      (cat.name || cat).toLowerCase().includes(search) || 
      search.includes((cat.name || cat).toLowerCase())
    );
    if (match) {
      console.log('✅ [FindJobs] Partial category match:', match.name || match);
      return match.name || match;
    }
    
    // 3. Similar terms mapping
    const categoryMappings = {
      'setting': ['casting', 'stone setting', 'diamond setting'],
      'casting': ['setting', 'stone setting'],
      'polishing': ['finishing', 'buffing', 'surface treatment'],
      'finishing': ['polishing', 'buffing'],
      'repair': ['restoration', 'fixing'],
      'design': ['cad', 'modeling', '3d design'],
      'cad': ['design', 'modeling', '3d modeling'],
      'rhodium': ['plating', 'coating', 'finishing'],
      'plating': ['rhodium', 'coating', 'surface treatment']
    };
    
    const mappedTerms = categoryMappings[search] || [];
    match = availableCategories.find(cat => 
      mappedTerms.some(term => (cat.name || cat).toLowerCase().includes(term.toLowerCase()))
    );
    
    if (match) {
      console.log('✅ [FindJobs] Mapped category match:', match.name || match, 'from search:', searchCategory);
      return match.name || match;
    }
    
    console.log('⚠️ [FindJobs] No category match found for:', searchCategory);
    return null;
  };

  // ✅ ENHANCED: Initialize filters from URL parameters with smart matching
  useEffect(() => {
    const urlCategory = searchParams.get('category');
    const urlIndustry = searchParams.get('industry');
    const urlCategoryName = searchParams.get('categoryName');
    const urlCategoryId = searchParams.get('categoryId');
    const urlCategorySlug = searchParams.get('categorySlug');

    console.log('🔗 [FindJobs] URL parameters detected:', {
      category: urlCategory,
      industry: urlIndustry,
      categoryName: urlCategoryName,
      categoryId: urlCategoryId,
      categorySlug: urlCategorySlug
    });

    if (urlCategory && categories.length > 0) {
      console.log('🎯 [FindJobs] Applying category filter from URL:', urlCategory);
      console.log('🔍 [FindJobs] Available categories:', categories.map(c => c.name || c));
      
      // ✅ NEW: Smart category matching
      const matchedCategory = findMatchingCategory(urlCategory, categories);
      const finalCategory = matchedCategory || urlCategory;
      
      // Set the category filter
      setFilters(prev => ({
        ...prev,
        category: finalCategory
      }));

      // Store category information for UI display
      setCategoryInfo({
        name: urlCategoryName || urlCategory,
        slug: urlCategorySlug,
        id: urlCategoryId,
        industry: urlIndustry,
        matchedCategory: matchedCategory
      });

      setActiveCategory(finalCategory);

      // Update page title
      document.title = urlCategoryName 
        ? `${urlCategoryName} Jobs - Find Professional Opportunities`
        : `${urlCategory} Jobs - Find Professional Opportunities`;
    } else if (urlCategory && categories.length === 0) {
      // Categories not loaded yet, set basic info
      setCategoryInfo({
        name: urlCategoryName || urlCategory,
        slug: urlCategorySlug,
        id: urlCategoryId,
        industry: urlIndustry
      });
    } else {
      // Reset category info if no URL parameters
      setCategoryInfo(null);
      setActiveCategory(null);
      document.title = "Find Jobs - Professional Opportunities";
    }
  }, [searchParams, categories]);

  // ✅ CRITICAL FIX: Debounced search to prevent excessive API calls
  const debouncedSearch = useCallback(
    debounce((searchValue) => {
      console.log('🔍 [FindJobs] Debounced search triggered:', searchValue);
      setPage(1);
      fetchJobsWithSearch(searchValue);
    }, 500),
    [filters]
  );

  useEffect(loadSaved, []);
  useEffect(() => {
    fetchCategories();
  }, []);
  
  useEffect(() => {
    if (searchText.trim()) {
      debouncedSearch(searchText);
    } else {
      fetchJobs();
    }
  }, [page, filters]);

  // ✅ NEW: Handle search input changes with debouncing
  useEffect(() => {
    if (searchText.trim()) {
      debouncedSearch(searchText);
    } else if (searchText === '') {
      // Clear search - fetch jobs immediately
      setPage(1);
      fetchJobs();
    }
  }, [searchText, debouncedSearch]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (sheetRef.current && !sheetRef.current.contains(event.target)) {
        setShowMobileFilters(false);
      }
    }
    
    if (showMobileFilters) {
      document.addEventListener("mousedown", handleClickOutside);
      document.body.style.overflow = 'hidden';
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        document.body.style.overflow = 'unset';
      };
    }
  }, [showMobileFilters]);

  // ✅ CRITICAL FIX: Enhanced error handling for categories
  async function fetchCategories() {
    try {
      console.log('📂 [FindJobs] Fetching categories...');
      const response = await apiHelpers.getJobCategories();
      console.log('📂 [FindJobs] Categories response:', response);
      
      if (response.success) {
        setCategories(response.categories || []);
        console.log('📂 [FindJobs] Categories loaded:', response.categories?.map(c => c.name || c));
      } else {
        console.warn('⚠️ [FindJobs] Categories fetch unsuccessful:', response.message);
        setCategories([]);
      }
    } catch (err) {
      console.error('❌ [FindJobs] Failed to fetch categories:', err);
      setCategories([]);
      setError('Failed to load categories. Please refresh the page.');
    }
  }

  // ✅ CRITICAL FIX: Enhanced job fetching with better error handling
  async function fetchJobs() {
    setBusy(true);
    setError(null);
    let cancelled = false;

    try {
      const params = {
        page: String(page),
        limit: String(LIMIT),
        search: searchText.trim(),
        ...filters
      };

      console.log('📋 [FindJobs] Fetching jobs with params:', params);
      
      // ✅ CRITICAL FIX: Use standard getJobs API call
      const response = await apiHelpers.getJobs(params);
      if (cancelled) return;

      console.log('📋 [FindJobs] Jobs API response:', response);

      if (response.success) {
        console.log('✅ [FindJobs] Jobs fetched successfully:', response.jobs?.length);
        setJobs(response.jobs || []);
        setTotal(response.totalJobs || 0);
        
        // ✅ NEW: Log actual job categories for debugging
        if (response.jobs && response.jobs.length > 0) {
          console.log('📊 [FindJobs] Job categories found:', [...new Set(response.jobs.map(j => j.category))]);
        }
      } else {
        console.warn('⚠️ [FindJobs] API returned unsuccessful response:', response);
        setJobs([]);
        setTotal(0);
        setError(response.message || 'Failed to fetch jobs');
      }
    } catch (err) {
      if (!cancelled) {
        console.error('❌ [FindJobs] Failed to fetch jobs:', err);
        setJobs([]);
        setTotal(0);
        setError('Network error. Please check your connection and try again.');
      }
    } finally {
      !cancelled && setBusy(false);
    }

    return () => { cancelled = true; };
  }

  // ✅ CRITICAL FIX: Separate function for search-triggered fetches
  async function fetchJobsWithSearch(searchValue) {
    setBusy(true);
    setError(null);
    let cancelled = false;

    try {
      const params = {
        page: "1", // Always start from page 1 for new searches
        limit: String(LIMIT),
        search: searchValue.trim(),
        ...filters
      };

      console.log('🔍 [FindJobs] Fetching jobs with search:', params);
      const response = await apiHelpers.getJobs(params);
      if (cancelled) return;

      console.log('🔍 [FindJobs] Search response:', response);

      if (response.success) {
        console.log('✅ [FindJobs] Search results fetched:', response.jobs?.length);
        setJobs(response.jobs || []);
        setTotal(response.totalJobs || 0);
        setPage(1); // Reset to page 1 for search results
      } else {
        setJobs([]);
        setTotal(0);
        setError(response.message || 'Search failed');
      }
    } catch (err) {
      if (!cancelled) {
        console.error('❌ [FindJobs] Search failed:', err);
        setJobs([]);
        setTotal(0);
        setError('Search error. Please try again.');
      }
    } finally {
      !cancelled && setBusy(false);
    }

    return () => { cancelled = true; };
  }

  function loadSaved() {
    const raw = localStorage.getItem("savedJobs");
    setSaved(new Set(raw ? JSON.parse(raw) : []));
  }
  
  function toggleSave(id) {
    const next = new Set(saved);
    next.has(id) ? next.delete(id) : next.add(id);
    setSaved(next);
    localStorage.setItem("savedJobs", JSON.stringify([...next]));
  }

  const onSubmitSearch = e => {
    e.preventDefault();
    setPage(1);
    if (searchText.trim()) {
      fetchJobsWithSearch(searchText);
    } else {
      fetchJobs();
    }
  };

  const onFilter = (key, val) => {
    console.log('🔧 [FindJobs] Filter changed:', key, val);
    setFilters(prev => ({ ...prev, [key]: val }));
    setPage(1);

    // ✅ NEW: Update URL parameters when filter changes
    if (key === 'category' && val !== filters.category) {
      updateUrlForCategory(val);
    }
  };

  // ✅ NEW: Update URL parameters for category filtering
  const updateUrlForCategory = (categoryName) => {
    if (categoryName) {
      const params = new URLSearchParams(searchParams);
      params.set('category', categoryName);
      params.set('categoryName', categoryName);
      setSearchParams(params);
    } else {
      const params = new URLSearchParams(searchParams);
      params.delete('category');
      params.delete('categoryName');
      params.delete('industry');
      params.delete('categoryId');
      params.delete('categorySlug');
      setSearchParams(params);
      setCategoryInfo(null);
      setActiveCategory(null);
      document.title = "Find Jobs - Professional Opportunities";
    }
  };

  const clearAll = () => {
    console.log('🧹 [FindJobs] Clearing all filters and search');
    setSearchText("");
    setFilters({ 
      category: "", 
      minBudget: "", 
      maxBudget: "", 
      experienceLevel: "", 
      location: "",
      sortBy: "newest"
    });
    setPage(1);

    // ✅ NEW: Clear URL parameters
    setSearchParams({});
    setCategoryInfo(null);
    setActiveCategory(null);
    document.title = "Find Jobs - Professional Opportunities";
  };

  // ✅ NEW: Clear only category filter
  const clearCategoryFilter = () => {
    console.log('🏷️ [FindJobs] Clearing category filter');
    onFilter('category', '');
    updateUrlForCategory('');
  };

  const handleJobClick = (job) => {
    console.log('🔗 [FindJobs] Job clicked:', job.title);
    if (job.slug) {
      navigate(`/job/${job.slug}`);
    } else {
      navigate(`/jobs/${job._id}`);
    }
  };

  const handleQuickApply = (e, job) => {
    e.stopPropagation();
    console.log('📝 [FindJobs] Quick apply clicked:', job.title);
    if (!user) {
      navigate('/login');
      return;
    }
    if (!canApplyToJobs()) {
      alert('Only professionals can apply for jobs');
      return;
    }
    handleJobClick(job);
  };

  const handleClientProfile = (e, job) => {
    e.stopPropagation();
    console.log('👤 [FindJobs] Client profile clicked:', job.createdBy?.name);
    if (job.createdBy?._id) {
      navigate(`/profile/${job.createdBy._id}`);
    }
  };

  // ✅ NEW: Handle delete job functionality
  const handleDeleteJob = (e, job) => {
    e.stopPropagation();
    console.log('🗑️ [FindJobs] Delete job clicked:', job.title);
    
    // Show confirmation dialog
    setDeleteConfirm({
      show: true,
      job: job,
      loading: false
    });
  };

  // ✅ NEW: Confirm delete job
  const confirmDeleteJob = async () => {
    if (!deleteConfirm.job) return;

    setDeleteConfirm(prev => ({ ...prev, loading: true }));

    try {
      console.log('🗑️ [FindJobs] Deleting job:', deleteConfirm.job._id);
      
      const response = await apiHelpers.deleteJob(deleteConfirm.job._id);
      
      if (response.success) {
        console.log('✅ [FindJobs] Job deleted successfully');
        
        // Remove job from current jobs list
        setJobs(prevJobs => prevJobs.filter(job => job._id !== deleteConfirm.job._id));
        setTotal(prev => Math.max(0, prev - 1));
        
        // Close dialog
        setDeleteConfirm({ show: false, job: null, loading: false });
        
        // Show success message
        alert('Job deleted successfully!');
        
      } else {
        console.error('❌ [FindJobs] Delete failed:', response.message);
        alert(response.message || 'Failed to delete job');
        setDeleteConfirm(prev => ({ ...prev, loading: false }));
      }
    } catch (error) {
      console.error('❌ [FindJobs] Delete error:', error);
      alert('Error deleting job. Please try again.');
      setDeleteConfirm(prev => ({ ...prev, loading: false }));
    }
  };

  // ✅ NEW: Cancel delete job
  const cancelDeleteJob = () => {
    setDeleteConfirm({ show: false, job: null, loading: false });
  };

  const handleSearchChange = (value) => {
    setSearchText(value);
  };

  const handleFilterChange = (key, value) => {
    onFilter(key, value);
  };

  const pages = Math.max(1, Math.ceil(total / LIMIT));
  const nums = Array.from({ length: Math.min(pages, 7) }, (_, i) => {
    const start = Math.max(1, page - 3);
    return start + i;
  }).filter(n => n <= pages);
  
  const hasF = searchText || Object.values(filters).some(val => val && val !== "newest");
  const activeFiltersCount = Object.values(filters).filter(val => val && val !== "newest").length + (searchText ? 1 : 0);

  // ✅ ENHANCED: Better budget formatting
  const formatBudget = (job) => {
    // ✅ CRITICAL FIX: Handle both budget structures
    let budgetMin, budgetMax;
    
    if (job.budget && (job.budget.min || job.budget.max)) {
      budgetMin = job.budget.min || 0;
      budgetMax = job.budget.max || 0;
    } else {
      budgetMin = job.budgetMin || 0;
      budgetMax = job.budgetMax || 0;
    }
    
    const formatter = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    });
    
    if (budgetMin === budgetMax && budgetMin > 0) {
      return formatter.format(budgetMin);
    }
    
    return `${formatter.format(budgetMin)} - ${formatter.format(budgetMax)}`;
  };

  // ✅ COMPLETELY REPLACED: Show exact dates instead of relative time
  const formatExactDate = (date) => {
    if (!date) return 'Date not available';
    
    const jobDate = new Date(date);
    
    // Format as "Posted on Sep 19, 2025"
    return `Posted on ${jobDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })}`;
  };

  // ✅ NEW: Smart location formatting for job cards
  const formatJobLocation = (job) => {
    // If location field contains address info (city, state, etc), it's already formatted
    if (job.location && !['Remote', 'On-site', 'Hybrid'].includes(job.location)) {
      return job.location;
    }
    
    // Try to format from businessAddress if available
    if (job.location === 'On-site' && job.businessAddress) {
      const addr = job.businessAddress;
      if (addr.city || addr.state) {
        const parts = [];
        if (addr.city) parts.push(addr.city);
        if (addr.state) parts.push(addr.state);
        if (addr.postalCode) parts.push(addr.postalCode);
        return parts.length > 0 ? parts.join(', ') : 'On-site';
      }
    }
    
    // Try to format from formattedAddress virtual field
    if (job.formattedAddress && job.formattedAddress !== job.location) {
      return job.formattedAddress;
    }
    
    // Try to format from shortAddress virtual field
    if (job.shortAddress && job.shortAddress !== job.location) {
      return job.shortAddress;
    }
    
    // Fallback to original location
    return job.location || 'Remote';
  };

  // ✅ NEW: Check if current user owns the job
  const isJobOwner = (job) => {
    return user && job.createdBy && job.createdBy._id === user.id;
  };

  // ✅ CRITICAL FIX: Better loading state handling
  if (busy && jobs.length === 0) {
    return (
      <div className="find-jobs-loading">
        <div className="loading-spinner"></div>
        <div className="loading-content">
          <h3>Finding Perfect Jobs...</h3>
          <p>Discovering opportunities that match your skills</p>
        </div>
      </div>
    );
  }

  // ✅ CRITICAL FIX: Error state handling
  if (error && jobs.length === 0 && !busy) {
    return (
      <div className="find-jobs-error">
        <div className="error-icon">
          <AlertCircle size={64} color="#e74c3c" />
        </div>
        <div className="error-content">
          <h3>Oops! Something went wrong</h3>
          <p>{error}</p>
          <button 
            onClick={() => {
              setError(null);
              fetchJobs();
            }}
            className="retry-button"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="find-jobs-container">
      {/* ✅ ENHANCED HERO SECTION WITH CATEGORY SUPPORT */}
      <div className="hero-section">
        <div className="hero-content">
          <div className="hero-text">
            {/* ✅ NEW: Dynamic title based on category */}
            <h1 className="hero-title">
              {categoryInfo ? `${categoryInfo.name} Jobs` : 'Find Your Next Opportunity'}
            </h1>
            <p className="hero-subtitle">
              {categoryInfo 
                ? `Discover ${categoryInfo.name.toLowerCase()} opportunities that match your skills`
                : 'Discover jewelry and crafts jobs that match your skills'
              }
            </p>
            {/* ✅ NEW: Show category matching info */}
            {categoryInfo?.matchedCategory && categoryInfo.matchedCategory !== categoryInfo.name && (
              <p className="hero-category-info">
                Also showing related jobs from "{categoryInfo.matchedCategory}"
              </p>
            )}
          </div>
          
          <div className="hero-stats">
            <div className="stat-badge">
              <span className="stat-number">{total}</span>
              <span className="stat-label">
                {categoryInfo ? `${categoryInfo.name} Jobs` : 'Jobs'}
              </span>
            </div>
          </div>
        </div>

        {/* ✅ NEW: Category breadcrumb and filter info */}
        {categoryInfo && (
          <div className="category-breadcrumb">
            <button 
              className="breadcrumb-back"
              onClick={() => navigate('/')}
            >
              <ArrowLeft size={16} />
              Back to Categories
            </button>
            <div className="breadcrumb-path">
              <span>Categories</span>
              <span className="breadcrumb-separator">→</span>
              <span className="breadcrumb-current">
                {categoryInfo.industry && (
                  <span className="category-industry">{categoryInfo.industry}</span>
                )}
                {categoryInfo.name}
                {categoryInfo.matchedCategory && categoryInfo.matchedCategory !== categoryInfo.name && (
                  <span className="category-matched"> (showing {categoryInfo.matchedCategory})</span>
                )}
              </span>
            </div>
            <button 
              className="clear-category-filter"
              onClick={clearCategoryFilter}
              title="View all jobs"
            >
              <X size={14} />
              Clear Filter
            </button>
          </div>
        )}

        {/* ✅ PROFESSIONAL INTEGRATED FILTERS BAR */}
        <div className="filters-bar">
          <div className="filters-container">
            {/* Search */}
            <div className="search-group">
              <div className="search-wrapper">
                <Search className="search-icon" size={20} />
                <input
                  type="text"
                  className="search-input"
                  placeholder={categoryInfo 
                    ? `Search in ${categoryInfo.name.toLowerCase()} jobs...`
                    : "Search jewelry, crafts, or skills..."
                  }
                  value={searchText}
                  onChange={(e) => handleSearchChange(e.target.value)}
                />
                {searchText && (
                  <button 
                    className="clear-search"
                    onClick={() => handleSearchChange("")}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>

            {/* Desktop Filters - Horizontal Grid */}
            <div className="desktop-filters">
              <div className="filter-group">
                <label>Category</label>
                <select
                  className="filter-select"
                  value={filters.category}
                  onChange={(e) => handleFilterChange("category", e.target.value)}
                >
                  <option value="">All Categories</option>
                  {categories.map(category => (
                    <option key={category.name || category} value={category.name || category}>
                      {category.name || category}
                      {category.count !== undefined && ` (${category.count})`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label>Experience</label>
                <select
                  className="filter-select"
                  value={filters.experienceLevel}
                  onChange={(e) => handleFilterChange("experienceLevel", e.target.value)}
                >
                  <option value="">All Levels</option>
                  <option value="Entry">Entry Level</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Expert">Expert</option>
                </select>
              </div>

              <div className="filter-group">
                <label>Location</label>
                <input
                  type="text"
                  className="filter-input"
                  placeholder="City, state, or area..."
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
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                  <option value="highestBudget">Highest Budget</option>
                  <option value="lowestBudget">Lowest Budget</option>
                  <option value="relevance">Most Relevant</option>
                  <option value="deadline">Deadline Soon</option>
                </select>
              </div>

              {hasF && (
                <button onClick={clearAll} className="clear-filters">
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
              {activeFiltersCount > 0 && <span className="filter-count">{activeFiltersCount}</span>}
              <ChevronDown size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Filters Panel */}
      {showMobileFilters && (
        <div className="mobile-filters-overlay">
          <div className="mobile-filters" ref={sheetRef}>
            <div className="mobile-filters-header">
              <h3>Filter Jobs</h3>
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
                  {categories.map(category => (
                    <option key={category.name || category} value={category.name || category}>
                      {category.name || category}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="mobile-filter-group">
                <label>Location</label>
                <input
                  type="text"
                  placeholder="City, state, or area..."
                  value={filters.location}
                  onChange={(e) => handleFilterChange("location", e.target.value)}
                />
              </div>
              
              <div className="mobile-filter-group">
                <label>Budget Range</label>
                <div className="budget-inputs">
                  <input
                    type="number"
                    placeholder="Min ₹"
                    value={filters.minBudget}
                    onChange={e => handleFilterChange("minBudget", e.target.value)}
                  />
                  <input
                    type="number"
                    placeholder="Max ₹"
                    value={filters.maxBudget}
                    onChange={e => handleFilterChange("maxBudget", e.target.value)}
                  />
                </div>
              </div>
              
              <div className="mobile-filter-group">
                <label>Experience</label>
                <select
                  value={filters.experienceLevel}
                  onChange={(e) => handleFilterChange("experienceLevel", e.target.value)}
                >
                  <option value="">All Levels</option>
                  <option value="Entry">Entry Level</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Expert">Expert</option>
                </select>
              </div>
            </div>
            
            <div className="mobile-filters-actions">
              <button onClick={clearAll} className="clear-mobile">Clear All</button>
              <button onClick={() => setShowMobileFilters(false)} className="apply-mobile">Show Results</button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ ENHANCED RESULTS SECTION WITH CATEGORY SUPPORT */}
      <div className="results-section">
        {jobs.length === 0 && !busy ? (
          <EnhancedEmptyState 
            hasFilters={hasF} 
            searchText={searchText} 
            clearAll={clearAll} 
            categoryInfo={categoryInfo}
          />
        ) : (
          <>
            <div className="results-header">
              <span className="results-count">
                {total.toLocaleString()} {categoryInfo ? categoryInfo.name.toLowerCase() : ''} job{total !== 1 ? 's' : ''} found
                {categoryInfo?.matchedCategory && categoryInfo.matchedCategory !== categoryInfo.name && (
                  <span className="matched-category-note"> (including {categoryInfo.matchedCategory})</span>
                )}
              </span>
              <span className="results-sort">
                Sorted by: {filters.sortBy === "newest" ? "Newest" : 
                         filters.sortBy === "highestBudget" ? "Highest Budget" : 
                         filters.sortBy === "lowestBudget" ? "Lowest Budget" : 
                         filters.sortBy === "relevance" ? "Most Relevant" : 
                         filters.sortBy === "deadline" ? "Deadline Soon" : "Oldest"}
              </span>
            </div>

            {/* ✅ NEW: Active category filter display */}
            {categoryInfo && (
              <div className="active-category-filter">
                <div className="category-filter-badge">
                  <Tag size={14} />
                  <span>Filtering by: {categoryInfo.name}</span>
                  {categoryInfo.matchedCategory && categoryInfo.matchedCategory !== categoryInfo.name && (
                    <span className="matched-indicator"> → {categoryInfo.matchedCategory}</span>
                  )}
                  <button 
                    onClick={clearCategoryFilter}
                    className="remove-category-filter"
                    title="Remove category filter"
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>
            )}

            <div className="jobs-grid">
              {jobs.map(job => (
                <EnhancedJobCard 
                  key={job._id} 
                  job={job} 
                  onClick={() => handleJobClick(job)}
                  onQuickApply={(e) => handleQuickApply(e, job)}
                  onClientProfile={(e) => handleClientProfile(e, job)}
                  onDeleteJob={(e) => handleDeleteJob(e, job)}
                  formatBudget={formatBudget}
                  formatExactDate={formatExactDate}
                  formatJobLocation={formatJobLocation}
                  showApplyButton={canApplyToJobs()}
                  isAuthenticated={!!user}
                  isJobOwner={isJobOwner(job)}
                />
              ))}
            </div>

            {/* ✅ PAGINATION */}
            {pages > 1 && (
              <nav className="pagination compact">
                <button 
                  disabled={page === 1} 
                  onClick={() => setPage(p => p - 1)} 
                  className="page-btn prev"
                >
                  <ChevronLeft size={16} />
                  Previous
                </button>
                
                <div className="page-numbers">
                  {nums.map(n => (
                    <button 
                      key={n} 
                      onClick={() => setPage(n)} 
                      className={n === page ? "page-btn active" : "page-btn"}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                
                <button 
                  disabled={page === pages} 
                  onClick={() => setPage(p => p + 1)} 
                  className="page-btn next"
                >
                  Next
                  <ChevronRight size={16} />
                </button>
              </nav>
            )}
          </>
        )}
      </div>

      {/* ✅ NEW: Delete Confirmation Dialog */}
      {deleteConfirm.show && (
        <div className="delete-confirmation-overlay">
          <div className="delete-confirmation-dialog">
            <div className="delete-confirmation-header">
              <h3>Delete Job</h3>
              <X 
                className="close-icon" 
                onClick={cancelDeleteJob}
                size={20}
              />
            </div>
            
            <div className="delete-confirmation-content">
              <div className="warning-icon">
                <AlertCircle size={48} color="#e74c3c" />
              </div>
              
              <h4>Are you sure you want to delete this job?</h4>
              <p className="job-title">"{deleteConfirm.job?.title}"</p>
              
              <div className="warning-message">
                <p><strong>This action cannot be undone!</strong></p>
                <p>The job will be permanently removed from the database and all associated applications will be affected.</p>
              </div>
            </div>
            
            <div className="delete-confirmation-actions">
              <button 
                className="cancel-delete-btn"
                onClick={cancelDeleteJob}
                disabled={deleteConfirm.loading}
              >
                Cancel
              </button>
              <button 
                className="confirm-delete-btn"
                onClick={confirmDeleteJob}
                disabled={deleteConfirm.loading}
              >
                {deleteConfirm.loading ? (
                  <>
                    <div className="loading-spinner-small"></div>
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    Delete Job
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ✅ ENHANCED JOB CARD COMPONENT WITH DELETE BUTTON
const EnhancedJobCard = ({ 
  job, onClick, onQuickApply, onClientProfile, onDeleteJob,
  formatBudget, formatExactDate, formatJobLocation, 
  showApplyButton, isAuthenticated, isJobOwner
}) => (
  <div className="enhanced-job-card" onClick={onClick}>
    {/* ✅ NEW: Delete button for job owners only */}
    {isJobOwner && (
      <button 
        className="delete-job-btn"
        onClick={onDeleteJob}
        title="Delete this job"
      >
        <Trash2 size={16} />
      </button>
    )}

    {/* ✅ EXACT Posted Date */}
    <div className="card-posted-time">
      {formatExactDate(job.createdAt)}
    </div>

    {/* Job Title - Main Focus */}
    <h3 className="enhanced-job-title">
      {job.title}
    </h3>

    {/* Budget and Experience in One Line */}
    <div className="job-meta-line">
      <span className="budget-text">
        {job.formattedBudget || formatBudget(job)}
      </span>
      <span className="experience-level">{job.experienceLevel || 'Any Level'}</span>
    </div>

    {/* ✅ FIXED: Deadline Only */}
    <div className="job-meta-secondary">
      {job.deadline && (
        <span className={`deadline-text ${job.isUrgent ? 'urgent' : ''}`}>
          <Calendar size={12} />
          Deadline: {job.daysUntilDeadline !== undefined && job.daysUntilDeadline > 0 
            ? `${job.daysUntilDeadline} days left`
            : job.formattedDeadline || new Date(job.deadline).toLocaleDateString()
          }
        </span>
      )}
    </div>

    {/* Job Description */}
    <p className="enhanced-description">
      {job.description?.length > 140 
        ? `${job.description.substring(0, 140)}...` 
        : job.description || "No description provided"
      }
    </p>

    {/* Skills Tags */}
    {job.skills && job.skills.length > 0 && (
      <div className="enhanced-skills">
        {job.skills.slice(0, 4).map((skill, index) => (
          <span key={index} className="enhanced-skill-tag">{skill}</span>
        ))}
        {job.skills.length > 4 && (
          <span className="skill-count">+{job.skills.length - 4}</span>
        )}
      </div>
    )}

    {/* Categories */}
    <div className="enhanced-categories">
      <span className="enhanced-category">{job.category}</span>
      {job.subCategory && <span className="enhanced-subcategory">{job.subCategory}</span>}
    </div>

    {/* Company Info with Smart Location Display */}
    <div className="enhanced-company">
      <Building size={14} />
      <span>{job.createdBy?.companyName || job.createdBy?.name || "Company"}</span>
      <span className="location-type">
        <MapPin size={12} />
        {formatJobLocation(job)}
      </span>
      {job.views > 0 && (
        <span className="view-count">
          <Eye size={12} />
          {job.views} views
        </span>
      )}
    </div>

    {/* Action Buttons */}
    <div className="enhanced-actions">
      <button 
        className="enhanced-view-btn"
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
      >
        View Details
      </button>
      {!isJobOwner && (
        <>
          {isAuthenticated && showApplyButton && (
            <button 
              className="enhanced-apply-btn"
              onClick={onQuickApply}
            >
              Apply Now
            </button>
          )}
          {!isAuthenticated && (
            <button 
              className="enhanced-login-btn"
              onClick={(e) => {
                e.stopPropagation();
                window.location.href = '/login';
              }}
            >
              Login to Apply
            </button>
          )}
        </>
      )}
    </div>
  </div>
);

// ✅ ENHANCED Empty State Component with category support
const EnhancedEmptyState = ({ hasFilters, searchText, clearAll, categoryInfo }) => (
  <div className="empty-state">
    <div className="empty-icon">
      <Search size={64} />
    </div>
    <h3>
      {searchText 
        ? `No jobs found for "${searchText}"` 
        : categoryInfo
        ? `No ${categoryInfo.name.toLowerCase()} jobs available`
        : hasFilters 
        ? "No jobs match your criteria" 
        : "No jobs available"
      }
    </h3>
    <p>
      {searchText 
        ? "Try different keywords or remove some filters." 
        : categoryInfo
        ? `No ${categoryInfo.name.toLowerCase()} jobs are currently posted. ${categoryInfo.matchedCategory ? `We also searched in related categories like "${categoryInfo.matchedCategory}".` : ''} Try browsing other categories or check back later.`
        : hasFilters 
        ? "Try different filters or broaden your search." 
        : "Check back later for new opportunities."
      }
    </p>
    {(hasFilters || searchText || categoryInfo) && (
      <div className="empty-actions">
        <button 
          onClick={clearAll} 
          className="clear-empty"
        >
          {categoryInfo ? 'View All Jobs' : 'Clear All Filters'}
        </button>
        {categoryInfo && (
          <button 
            onClick={() => window.history.back()}
            className="back-empty"
          >
            Back to Categories
          </button>
        )}
      </div>
    )}
  </div>
);
