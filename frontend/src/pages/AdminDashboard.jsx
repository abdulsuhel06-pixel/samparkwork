import React, { useState, useEffect } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { Navigate } from "react-router-dom";
import {
  BarChart3, Users, Briefcase, Tag, Megaphone, Plus, Search, Edit, Trash2,
  Eye, EyeOff, Download, Menu, X, Save, Star, Image, Video, Play,
  AlertCircle, CheckCircle, AlertTriangle, RefreshCw, MapPin, Calendar,
  Filter, DollarSign, User, Home, LogOut, Settings
} from "lucide-react";
import "./AdminDashboard.css";

const AdminDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState({
    stats: false, categories: false, users: false, jobs: false, ads: false
  });
  
  const [stats, setStats] = useState({});
  const [categories, setCategories] = useState([]);
  const [users, setUsers] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [ads, setAds] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [alert, setAlert] = useState({ show: false, type: '', message: '' });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // ✅ MOBILE MENU STATE
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Modal states
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showJobModal, setShowJobModal] = useState(false);
  const [showAdModal, setShowAdModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingJob, setEditingJob] = useState(null);
  const [editingAd, setEditingAd] = useState(null);

  // Form states
  const [categoryForm, setCategoryForm] = useState({
    name: '', industry: 'Jewellery', parentCategory: '', description: '', image: null, isFeatured: false
  });

  const [jobForm, setJobForm] = useState({
    title: '', category: '', budgetMin: '', budgetMax: '', budgetType: 'Fixed',
    description: '', status: 'active', location: '', requirements: ''
  });

  const [adForm, setAdForm] = useState({
    title: '', content: '', media: null, mediaType: '', placement: 'homepage',
    link: '', isActive: true, featured: false
  });

  const token = localStorage.getItem("wn_token");

  // ✅ FIXED: Constants with dependent dropdown support
  const industries = ['Jewellery', 'Textile']; // Removed 'All'
  
  // ✅ NEW: Industry-specific parent categories
  const parentCategoriesByIndustry = {
    'Jewellery': ['CAD', 'Filling', 'Casting', 'Setting', 'Polish', 'Watch Setting', 'Rhodium', 'Helper', 'other'],
    'Textile': ['Production Section', 'Cutting Section', 'Stitching Section', 'Finishing or packing', 'Support Staff']
  };
  
  const jobStatuses = ['active', 'closed', 'draft'];
  const placements = ['homepage', 'sidebar', 'banner'];
  const budgetTypes = ['Fixed', 'Hourly'];

  // ✅ HELPER: Get parent categories for selected industry
  const getParentCategories = (industry) => {
    return parentCategoriesByIndustry[industry] || [];
  };

  // ✅ ENHANCED MOBILE MENU HANDLERS
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
    if (!isMobileMenuOpen) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
    document.body.classList.remove('modal-open');
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    closeMobileMenu();
  };

  // ✅ ENHANCED MODAL HANDLERS WITH BODY SCROLL LOCK
  const openModal = (modalType) => {
    document.body.classList.add('modal-open');
    if (modalType === 'category') setShowCategoryModal(true);
    if (modalType === 'job') setShowJobModal(true);
    if (modalType === 'ad') setShowAdModal(true);
  };

  const closeModal = (modalType) => {
    document.body.classList.remove('modal-open');
    closeModalAndResetForm(modalType);
  };

  // ✅ CLOSE MOBILE MENU ON OUTSIDE CLICK
  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (isMobileMenuOpen && !event.target.closest('.beautiful-sidebar') && !event.target.closest('.mobile-menu-toggle')) {
        closeMobileMenu();
      }
    };

    if (isMobileMenuOpen) {
      document.addEventListener('click', handleOutsideClick);
    }

    return () => {
      document.removeEventListener('click', handleOutsideClick);
    };
  }, [isMobileMenuOpen]);

  // ✅ CLEANUP ON UNMOUNT
  useEffect(() => {
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, []);

  // ✅ PRODUCTION-READY: Get media URL for advertisements with complete debugging
  const getImageUrl = (ad) => {
    console.log('🎬 [getImageUrl] Processing advertisement:', {
      id: ad._id,
      title: ad.title,
      mediaUrl: ad.mediaUrl,
      mediaType: ad.mediaType
    });
    
    if (!ad.mediaUrl) {
      console.warn('🎬 [getImageUrl] No mediaUrl found for advertisement');
      return null;
    }
    
    // If already a full URL, return as is
    if (ad.mediaUrl.startsWith('http://') || ad.mediaUrl.startsWith('https://')) {
      console.log('🎬 [getImageUrl] Using existing full URL:', ad.mediaUrl);
      return ad.mediaUrl;
    }
    
    // ✅ CRITICAL FIX: Environment-aware base URL selection
    const isProduction = process.env.NODE_ENV === 'production' || 
                        window.location.hostname !== 'localhost' ||
                        window.location.hostname === 'samparkworkwebsite.vercel.app' ||
                        window.location.hostname === 'samparkwork.vercel.app';
    
    const baseUrl = isProduction 
      ? 'https://samparkwork-backend.onrender.com' 
      : 'http://localhost:5000';
    
    // ✅ CRITICAL: Ensure proper path construction
    // Database stores: advertisements/videos/filename
    // We need: /uploads/advertisements/videos/filename
    let finalPath = ad.mediaUrl;
    
    // Add /uploads/ prefix if not present
    if (!finalPath.startsWith('/uploads/')) {
      finalPath = `/uploads/${finalPath}`;
    }
    
    const finalUrl = `${baseUrl}${finalPath}`;
    
    console.log('🎬 [getImageUrl] Generated URL:', {
      environment: isProduction ? 'PRODUCTION' : 'DEVELOPMENT',
      hostname: window.location.hostname,
      baseUrl,
      originalPath: ad.mediaUrl,
      finalPath,
      finalUrl
    });
    
    return finalUrl;
  };

  // ✅ ENHANCED: FALLBACK IMAGE COMPONENT WITH DEBUG INFO
  const FallbackImage = ({ src, alt, className, onError, ...props }) => {
    const [imageFailed, setImageFailed] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);

    const handleImageError = (e) => {
      console.error('🚫 Image failed to load:', src);
      setImageFailed(true);
      if (onError) onError(e);
    };

    const handleImageLoad = () => {
      console.log('✅ Image loaded successfully:', src);
      setImageLoaded(true);
    };

    if (!src || imageFailed) {
      return (
        <div 
          className={`${className} fallback-image-container`} 
          style={{
            width: '100%',
            height: '100%',
            backgroundColor: '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            color: '#64748b',
            fontSize: '14px',
            fontWeight: '500',
            border: '2px dashed #e2e8f0',
            borderRadius: '8px'
          }}
          {...props}
        >
          <Image size={32} style={{ marginBottom: '8px' }} />
          <span>No Image</span>
          {src && <small style={{ marginTop: '4px', fontSize: '10px', textAlign: 'center' }}>
            Failed: {src.substring(0, 50)}...
          </small>}
        </div>
      );
    }

    return (
      <img 
        src={src}
        alt={alt}
        className={className}
        onError={handleImageError}
        onLoad={handleImageLoad}
        style={{
          opacity: imageLoaded ? 1 : 0.7,
          transition: 'opacity 0.3s ease'
        }}
        {...props}
      />
    );
  };

  // Budget formatting utility functions
  const formatBudget = (budget) => {
    if (!budget || typeof budget !== 'object') return '₹0';
    
    const formatter = new Intl.NumberFormat('en-IN', {
      style: 'currency', currency: budget.currency || 'INR',
      minimumFractionDigits: 0, maximumFractionDigits: 0
    });
    
    if (budget.min === budget.max) {
      return `${formatter.format(budget.min)} ${budget.type || 'Fixed'}`;
    }
    
    return `${formatter.format(budget.min)} - ${formatter.format(budget.max)} ${budget.type || 'Fixed'}`;
  };

  const getBudgetDisplay = (budget) => {
    if (!budget) return '₹0';
    if (typeof budget === 'string' || typeof budget === 'number') return `₹${budget}`;
    return formatBudget(budget);
  };

  useEffect(() => {
    if (token) {
      fetchStats();
      if (activeTab === 'categories') fetchCategories();
      if (activeTab === 'users') fetchUsers();
      if (activeTab === 'jobs') fetchJobs();
      if (activeTab === 'ads') fetchAds();
    }
  }, [token, activeTab]);

  const setLoadingState = (key, value) => {
    setDataLoading(prev => ({ ...prev, [key]: value }));
  };

  const fetchStats = async () => {
    try {
      setLoadingState('stats', true);
      const { data } = await api.get("/api/admin/dashboard-stats");
      if (data) setStats(data);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      setStats({});
    } finally {
      setLoadingState('stats', false);
    }
  };

  const fetchCategories = async () => {
    try {
      setLoadingState('categories', true);
      const { data } = await api.get("/api/admin/categories");
      console.log('📦 Categories fetched:', data);
      setCategories(Array.isArray(data) ? data : (data.categories || []));
    } catch (error) {
      console.error("Error fetching categories:", error);
      setCategories([]);
    } finally {
      setLoadingState('categories', false);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoadingState('users', true);
      const { data } = await api.get("/api/admin/users");
      setUsers(Array.isArray(data) ? data : (data.users || []));
    } catch (error) {
      console.error("Error fetching users:", error);
      setUsers([]);
    } finally {
      setLoadingState('users', false);
    }
  };

  const fetchJobs = async () => {
    try {
      setLoadingState('jobs', true);
      const { data } = await api.get("/api/admin/jobs");
      setJobs(Array.isArray(data) ? data : (data.jobs || []));
    } catch (error) {
      console.error("Error fetching jobs:", error);
      setJobs([]);
    } finally {
      setLoadingState('jobs', false);
    }
  };

  // 🚨 FIXED: Advertisement fetching function
  const fetchAds = async () => {
    try {
      setLoadingState('ads', true);
      console.log('📺 Fetching advertisements from admin API...');
      
      const { data } = await api.get("/api/admin/advertisements");
      console.log('📺 Raw response:', data);
      
      // ✅ CRITICAL FIX: Use data.advertisements instead of data directly
      if (data && data.success && Array.isArray(data.advertisements)) {
        console.log(`✅ Found ${data.advertisements.length} advertisements`);
        setAds(data.advertisements);
      } else if (Array.isArray(data)) {
        // Fallback: in case backend returns array directly  
        console.log(`✅ Fallback: Found ${data.length} advertisements`);
        setAds(data);
      } else {
        console.warn('⚠️ Unexpected response format:', data);
        setAds([]);
      }
    } catch (error) {
      console.error("❌ Error fetching advertisements:", error);
      console.error("❌ Error details:", error.response?.data);
      setAds([]);
    } finally {
      setLoadingState('ads', false);
    }
  };

  const showAlert = (type, message) => {
    setAlert({ show: true, type, message });
    setTimeout(() => setAlert({ show: false, type: '', message: '' }), 4000);
  };

  const handleRefresh = async () => {
    await fetchStats();
    if (activeTab === 'categories') fetchCategories();
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'jobs') fetchJobs();
    if (activeTab === 'ads') fetchAds();
    showAlert('success', 'Data refreshed successfully!');
  };

  // ✅ ENHANCED: Category form change handler with dependent dropdown logic
  const handleCategoryChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    
    if (type === 'file') {
      const file = files[0];
      if (file) {
        // ✅ CRITICAL: Validate file type and size
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!validTypes.includes(file.type)) {
          showAlert('error', 'Please select a valid image file (JPEG, PNG, GIF, WebP)');
          e.target.value = ''; // Clear the input
          return;
        }
        
        if (file.size > 5 * 1024 * 1024) { // 5MB limit
          showAlert('error', 'Image file size must be less than 5MB');
          e.target.value = ''; // Clear the input
          return;
        }
        
        console.log('📷 [handleCategoryChange] Selected file:', {
          name: file.name,
          type: file.type,
          size: file.size
        });
      }
      
      setCategoryForm(prev => ({
        ...prev,
        [name]: file
      }));
    } else if (name === 'industry') {
      // ✅ CRITICAL: Reset parent category when industry changes
      console.log('🏭 Industry changed to:', value);
      setCategoryForm(prev => ({
        ...prev,
        industry: value,
        parentCategory: '' // Reset parent category selection
      }));
    } else {
      setCategoryForm(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  const handleJobChange = (e) => {
    const { name, value } = e.target;
    setJobForm(prev => ({ ...prev, [name]: value }));
  };

  const handleAdChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    if (type === 'file' && files[0]) {
      const file = files[0];
      const mediaType = file.type.startsWith('video/') ? 'video' : 'image';
      setAdForm(prev => ({ ...prev, [name]: file, mediaType: mediaType }));
    } else {
      setAdForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    }
  };

  // ✅ ENHANCED: Better validation for category submission
  const submitCategory = async () => {
    // Enhanced validation
    if (!categoryForm.name.trim()) {
      showAlert('error', 'Category name is required');
      return;
    }

    if (!categoryForm.industry) {
      showAlert('error', 'Industry is required');
      return;
    }

    if (!categoryForm.parentCategory) {
      showAlert('error', 'Parent category is required');
      return;
    }

    // ✅ CRITICAL: Require image for new categories
    if (!editingCategory && !categoryForm.image) {
      showAlert('error', 'Category image is required');
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      
      // ✅ CRITICAL: Only append non-null values and ensure file is appended correctly
      Object.keys(categoryForm).forEach(key => {
        const value = categoryForm[key];
        if (value !== null && value !== undefined && value !== '') {
          formData.append(key, value);
          console.log(`📝 [submitCategory] FormData appending: ${key}`, value);
        }
      });

      // ✅ Debug FormData contents
      console.log('📝 [submitCategory] FormData contents:');
      for (let [key, value] of formData.entries()) {
        console.log(`  ${key}:`, value);
      }

      if (editingCategory) {
        await api.put(`/api/admin/categories/${editingCategory._id}`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
        showAlert('success', 'Category updated successfully!');
      } else {
        await api.post('/api/admin/categories', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
        showAlert('success', 'Category added successfully!');
      }

      await fetchCategories();
      await fetchStats();
      closeModal('category');
    } catch (error) {
      console.error('❌ [submitCategory] Error:', error);
      const errorMessage = error.response?.data?.message || 'Failed to save category';
      showAlert('error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const submitJob = async () => {
    if (!jobForm.title.trim() || !jobForm.category || !jobForm.budgetMin || !jobForm.budgetMax) {
      showAlert('error', 'Please fill all required fields');
      return;
    }

    if (Number(jobForm.budgetMax) < Number(jobForm.budgetMin)) {
      showAlert('error', 'Maximum budget cannot be less than minimum budget');
      return;
    }

    try {
      setLoading(true);
      
      const jobData = {
        title: jobForm.title, category: jobForm.category,
        budgetMin: Number(jobForm.budgetMin), budgetMax: Number(jobForm.budgetMax),
        budgetType: jobForm.budgetType, description: jobForm.description,
        status: jobForm.status, location: jobForm.location, requirements: jobForm.requirements
      };

      if (editingJob) {
        await api.put(`/api/admin/jobs/${editingJob._id}`, jobData);
        showAlert('success', 'Job updated successfully!');
      } else {
        await api.post('/api/admin/jobs', jobData);
        showAlert('success', 'Job added successfully!');
      }

      await fetchJobs();
      await fetchStats();
      closeModal('job');
    } catch (error) {
      console.error('Job submission error:', error);
      showAlert('error', 'Failed to save job');
    } finally {
      setLoading(false);
    }
  };

  const submitAd = async () => {
    if (!adForm.title.trim() || !adForm.content.trim()) {
      showAlert('error', 'Please fill all required fields');
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      Object.keys(adForm).forEach(key => {
        if (adForm[key] !== null && adForm[key] !== undefined) {
          formData.append(key, adForm[key]);
        }
      });

      if (editingAd) {
        await api.put(`/api/admin/advertisements/${editingAd._id}`, formData);
        showAlert('success', 'Advertisement updated successfully!');
      } else {
        await api.post('/api/admin/advertisements', formData);
        showAlert('success', 'Advertisement created successfully!');
      }

      await fetchAds();
      await fetchStats();
      closeModal('ad');
    } catch (error) {
      console.error('Advertisement submission error:', error);
      showAlert('error', 'Failed to save advertisement');
    } finally {
      setLoading(false);
    }
  };

  const closeModalAndResetForm = (type) => {
    if (type === 'category') {
      setShowCategoryModal(false);
      setCategoryForm({ name: '', industry: 'Jewellery', parentCategory: '', description: '', image: null, isFeatured: false });
      setEditingCategory(null);
    } else if (type === 'job') {
      setShowJobModal(false);
      setJobForm({ title: '', category: '', budgetMin: '', budgetMax: '', budgetType: 'Fixed', description: '', status: 'active', location: '', requirements: '' });
      setEditingJob(null);
    } else if (type === 'ad') {
      setShowAdModal(false);
      setAdForm({ title: '', content: '', media: null, mediaType: '', placement: 'homepage', link: '', isActive: true, featured: false });
      setEditingAd(null);
    }
  };

  const openEditCategory = (category) => {
    setEditingCategory(category);
    setCategoryForm({
      name: category.name, industry: category.industry, parentCategory: category.parentCategory,
      description: category.description || '', image: null, isFeatured: category.isFeatured || false
    });
    openModal('category');
  };

  const openEditJob = (job) => {
    setEditingJob(job);
    setJobForm({
      title: job.title, category: job.category, budgetMin: job.budget?.min || '',
      budgetMax: job.budget?.max || '', budgetType: job.budget?.type || 'Fixed',
      description: job.description || '', status: job.status, location: job.location || '', requirements: job.requirements || ''
    });
    openModal('job');
  };

  const openEditAd = (ad) => {
    setEditingAd(ad);
    setAdForm({
      title: ad.title, content: ad.content, media: null, mediaType: ad.mediaType,
      placement: ad.placement, link: ad.link || '', isActive: ad.isActive, featured: ad.featured || false
    });
    openModal('ad');
  };

  const handleDelete = async (type, id, name) => {
    const itemName = name || 'item';
    if (window.confirm(`⚠️ Are you sure you want to delete "${itemName}"?\n\nThis action cannot be undone.`)) {
      try {
        await api.delete(`/api/admin/${type}/${id}`);
        
        if (type === 'categories') {
          setCategories(categories.filter(item => item._id !== id));
        } else if (type === 'users') {
          setUsers(users.filter(item => item._id !== id));
        } else if (type === 'jobs') {
          setJobs(jobs.filter(item => item._id !== id));
        } else if (type === 'advertisements') {
          setAds(ads.filter(item => item._id !== id));
        }
        
        await fetchStats();
        showAlert('success', `${itemName} deleted successfully`);
      } catch (error) {
        console.error(`Error deleting ${type}:`, error);
        showAlert('error', `Error deleting ${itemName}`);
      }
    }
  };

  const toggleFeatured = async (categoryId, currentStatus) => {
    try {
      await api.patch(`/api/admin/categories/${categoryId}/featured`, { isFeatured: !currentStatus });
      setCategories(categories.map(cat => 
        cat._id === categoryId ? { ...cat, isFeatured: !currentStatus } : cat
      ));
      showAlert('success', `Category ${!currentStatus ? 'featured' : 'unfeatured'} successfully!`);
    } catch (error) {
      showAlert('error', "Error updating category.");
    }
  };

  const exportUsers = async () => {
    try {
      const csvContent = [
        ['Name', 'Email', 'Role', 'Joined Date'],
        ...users.map(user => [
          user.name || 'Unknown', user.email || '', user.role || 'user',
          user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'
        ])
      ].map(row => row.map(field => `"${field}"`).join(',')).join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `users_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      showAlert('success', 'Users exported successfully!');
    } catch (error) {
      showAlert('error', 'Failed to export users');
    }
  };

  if (!user || user.role !== "admin") return <Navigate to="/" />;

  const LoadingSpinner = () => (
    <div className="beautiful-loading">
      <div className="beautiful-spinner">
        <div className="spinner-circle"></div>
        <div className="spinner-circle"></div>
        <div className="spinner-circle"></div>
      </div>
      <span>Loading...</span>
    </div>
  );

  const renderDashboard = () => (
    <div className="beautiful-dashboard-content">
      <div className="beautiful-page-header">
        <div className="page-header-content">
          <div className="page-title-section">
            <h1>Dashboard Overview</h1>
            <p>Monitor your platform's key metrics and performance</p>
          </div>
          <button className="beautiful-refresh-btn" onClick={handleRefresh} disabled={dataLoading.stats}>
            <RefreshCw size={18} className={dataLoading.stats ? 'spinning' : ''} />
            Refresh
          </button>
        </div>
      </div>

      <div className="beautiful-stats-grid">
        <div className="beautiful-stat-card users-card">
          <div className="stat-icon"><Users size={24} /></div>
          <div className="stat-content">
            <div className="stat-number">{dataLoading.stats ? '...' : (stats.users || 0)}</div>
            <div className="stat-label">Total Users</div>
            <div className="stat-change positive">+12% from last month</div>
          </div>
        </div>

        <div className="beautiful-stat-card jobs-card">
          <div className="stat-icon"><Briefcase size={24} /></div>
          <div className="stat-content">
            <div className="stat-number">{dataLoading.stats ? '...' : (stats.jobs || 0)}</div>
            <div className="stat-label">Active Jobs</div>
            <div className="stat-change positive">+8% from last week</div>
          </div>
        </div>

        <div className="beautiful-stat-card categories-card">
          <div className="stat-icon"><Tag size={24} /></div>
          <div className="stat-content">
            <div className="stat-number">{dataLoading.stats ? '...' : (stats.categories || 0)}</div>
            <div className="stat-label">Categories</div>
            <div className="stat-change neutral">No change</div>
          </div>
        </div>

        <div className="beautiful-stat-card ads-card">
          <div className="stat-icon"><Megaphone size={24} /></div>
          <div className="stat-content">
            <div className="stat-number">{dataLoading.stats ? '...' : (stats.advertisements || 0)}</div>
            <div className="stat-label">Advertisements</div>
            <div className="stat-change positive">+25% this month</div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderCategories = () => (
    <div className="beautiful-section-content">
      <div className="beautiful-page-header">
        <div className="page-header-content">
          <div className="page-title-section">
            <h1>Categories Management</h1>
            <p>Manage job categories and featured items</p>
          </div>
          <div className="page-header-actions">
            <button className="beautiful-filter-btn"><Filter size={18} />Filter</button>
            <button className="beautiful-primary-btn" onClick={() => openModal('category')}>
              <Plus size={18} />Add Category
            </button>
          </div>
        </div>
      </div>

      {dataLoading.categories ? <LoadingSpinner /> : categories.length === 0 ? (
        <div className="beautiful-empty-state">
          <div className="empty-icon"><Tag size={64} /></div>
          <h3>No categories found</h3>
          <p>Start by creating your first category to organize jobs effectively.</p>
          <button className="beautiful-primary-btn" onClick={() => openModal('category')}>
            <Plus size={18} />Create First Category
          </button>
        </div>
      ) : (
        <div className="beautiful-categories-grid">
          {categories.map(category => (
            <div key={category._id} className="beautiful-category-card">
              <div className="category-image">
                <FallbackImage 
                  src={getImageUrl(category)}
                  alt={category.name}
                  className="category-img"
                />
                {category.isFeatured && (
                  <div className="featured-badge"><Star size={14} />Featured</div>
                )}
              </div>
              <div className="category-content">
                <h3>{category.name}</h3>
                <div className="category-badges">
                  <span className="industry-badge">{category.industry}</span>
                  <span className="parent-badge">{category.parentCategory}</span>
                </div>
                <p className="category-description">{category.description || 'No description available'}</p>
                <div className="category-stats">
                  <Briefcase size={16} />
                  <span>{category.jobsCount || 0} jobs</span>
                </div>
              </div>
              <div className="category-actions">
                <button className={`beautiful-action-btn ${category.isFeatured ? 'featured' : ''}`}
                  onClick={() => toggleFeatured(category._id, category.isFeatured)}>
                  {category.isFeatured ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>
                <button className="beautiful-action-btn edit" onClick={() => openEditCategory(category)}>
                  <Edit size={16} />
                </button>
                <button className="beautiful-action-btn delete" 
                  onClick={() => handleDelete('categories', category._id, category.name)}>
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderUsers = () => (
    <div className="beautiful-section-content">
      <div className="beautiful-page-header">
        <div className="page-header-content">
          <div className="page-title-section">
            <h1>Users Management</h1>
            <p>Manage registered users and their permissions</p>
          </div>
          <div className="page-header-actions">
            <div className="beautiful-search-container">
              <Search size={18} />
              <input type="text" placeholder="Search users..." value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <button className="beautiful-secondary-btn" onClick={exportUsers}>
              <Download size={18} />Export
            </button>
          </div>
        </div>
      </div>

      {dataLoading.users ? <LoadingSpinner /> : users.length === 0 ? (
        <div className="beautiful-empty-state">
          <div className="empty-icon"><Users size={64} /></div>
          <h3>No users found</h3>
          <p>No registered users in the system yet.</p>
        </div>
      ) : (
        <div className="beautiful-users-table">
          <div className="table-container">
            <table>
              <thead>
                <tr><th>User</th><th>Email</th><th>Role</th><th>Joined</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {users.filter(user => 
                  user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  user.email?.toLowerCase().includes(searchTerm.toLowerCase())
                ).map(user => (
                  <tr key={user._id}>
                    <td>
                      <div className="user-info">
                        <div className="user-avatar">
                          {user.avatar ? (
                            <img src={user.avatar} alt={user.name} />
                          ) : (
                            <div className="avatar-placeholder"><User size={20} /></div>
                          )}
                        </div>
                        <div className="user-details">
                          <div className="user-name">{user.name || 'Unknown User'}</div>
                          <div className="user-id">ID: {user._id.slice(-6)}</div>
                        </div>
                      </div>
                    </td>
                    <td>{user.email || 'No email'}</td>
                    <td>
                      <span className={`role-badge ${user.role || 'user'}`}>
                        {(user.role || 'user').toUpperCase()}
                      </span>
                    </td>
                    <td>{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}</td>
                    <td>
                      <button className="beautiful-action-btn delete" 
                        onClick={() => handleDelete('users', user._id, user.name)}>
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );

  const renderJobs = () => (
    <div className="beautiful-section-content">
      <div className="beautiful-page-header">
        <div className="page-header-content">
          <div className="page-title-section">
            <h1>Jobs Management</h1>
            <p>Monitor and manage all job postings</p>
          </div>
          <div className="page-header-actions">
            <button className="beautiful-filter-btn"><Filter size={18} />Filter</button>
            <button className="beautiful-primary-btn" onClick={() => openModal('job')}>
              <Plus size={18} />Add Job
            </button>
          </div>
        </div>
      </div>

      {dataLoading.jobs ? <LoadingSpinner /> : jobs.length === 0 ? (
        <div className="beautiful-empty-state">
          <div className="empty-icon"><Briefcase size={64} /></div>
          <h3>No jobs found</h3>
          <p>Start by creating your first job posting to attract talent.</p>
          <button className="beautiful-primary-btn" onClick={() => openModal('job')}>
            <Plus size={18} />Create First Job
          </button>
        </div>
      ) : (
        <div className="beautiful-jobs-grid">
          {jobs.map(job => (
            <div key={job._id} className="beautiful-job-card">
              <div className="job-header">
                <h3>{job.title || 'Untitled Job'}</h3>
                <span className={`status-badge ${job.status || 'draft'}`}>
                  {(job.status || 'draft').toUpperCase()}
                </span>
              </div>
              <div className="job-meta">
                <div className="meta-item"><Tag size={16} /><span>{job.category || 'Uncategorized'}</span></div>
                <div className="meta-item"><DollarSign size={16} /><span>{getBudgetDisplay(job.budget)}</span></div>
                {job.location && (
                  <div className="meta-item"><MapPin size={16} /><span>{job.location}</span></div>
                )}
                <div className="meta-item">
                  <Calendar size={16} />
                  <span>{job.createdAt ? new Date(job.createdAt).toLocaleDateString() : 'Unknown'}</span>
                </div>
              </div>
              <p className="job-description">{job.description || 'No description available'}</p>
              <div className="job-actions">
                <button className="beautiful-action-btn view"><Eye size={16} /></button>
                <button className="beautiful-action-btn edit" onClick={() => openEditJob(job)}>
                  <Edit size={16} />
                </button>
                <button className="beautiful-action-btn delete" 
                  onClick={() => handleDelete('jobs', job._id, job.title)}>
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ✅ ENHANCED: Advertisement rendering with production-ready video support
  const renderAds = () => {
    // ✅ TEMPORARY DEBUG: Log environment and URL generation
    console.log('🐛 [renderAds] Debug Info:', {
      hostname: window.location.hostname,
      nodeEnv: process.env.NODE_ENV,
      adsCount: ads.length,
      firstAdMediaUrl: ads.length > 0 ? ads[0].mediaUrl : 'No ads',
      generatedUrl: ads.length > 0 ? getImageUrl(ads[0]) : 'No ads'
    });

    return (
      <div className="beautiful-section-content">
        <div className="beautiful-page-header">
          <div className="page-header-content">
            <div className="page-title-section">
              <h1>Advertisements</h1>
              <p>Manage advertising campaigns and promotions</p>
            </div>
            <div className="page-header-actions">
              <button className="beautiful-filter-btn"><Filter size={18} />Filter</button>
              <button className="beautiful-primary-btn" onClick={() => openModal('ad')}>
                <Plus size={18} />Create Ad
              </button>
            </div>
          </div>
        </div>

        {dataLoading.ads ? <LoadingSpinner /> : ads.length === 0 ? (
          <div className="beautiful-empty-state">
            <div className="empty-icon"><Megaphone size={64} /></div>
            <h3>No advertisements found</h3>
            <p>Create your first advertising campaign to boost visibility.</p>
            <button className="beautiful-primary-btn" onClick={() => openModal('ad')}>
              <Plus size={18} />Create First Ad
            </button>
          </div>
        ) : (
          <div className="beautiful-ads-grid">
            {ads.map(ad => (
              <div key={ad._id} className="beautiful-ad-card">
                <div className="ad-media">
                  {ad.mediaType === 'video' ? (
                    <div className="video-container" style={{ position: 'relative', width: '100%', height: '200px', backgroundColor: '#000' }}>
                      <video 
                        src={getImageUrl(ad)}
                        controls
                        preload="metadata"
                        crossOrigin="anonymous"
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          objectPosition: 'center'
                        }}
                        onLoadStart={() => console.log('🎥 Video loading started:', getImageUrl(ad))}
                        onLoadedMetadata={() => console.log('🎥 Video metadata loaded')}
                        onLoadedData={() => console.log('🎥 Video data loaded')}
                        onError={(e) => {
                          console.error('🎥 Video error:', {
                            error: e.target.error,
                            src: e.target.src,
                            networkState: e.target.networkState,
                            readyState: e.target.readyState
                          });
                          // Show fallback
                          if (e.target.nextSibling) {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }
                        }}
                      />
                      {/* Fallback placeholder */}
                      <div 
                        className="video-placeholder" 
                        style={{ 
                          display: 'none',
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          flexDirection: 'column', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          backgroundColor: '#f8f9fa', 
                          color: '#6c757d'
                        }}
                      >
                        <Play size={48} style={{ marginBottom: '10px' }} />
                        <span style={{ fontSize: '14px', fontWeight: '500' }}>Video Unavailable</span>
                        <small style={{ marginTop: '5px', textAlign: 'center', maxWidth: '80%' }}>
                          {getImageUrl(ad)}
                        </small>
                      </div>
                      
                      {/* Loading overlay */}
                      <div 
                        className="video-loading"
                        style={{
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)',
                          backgroundColor: 'rgba(0,0,0,0.7)',
                          color: 'white',
                          padding: '10px 15px',
                          borderRadius: '5px',
                          fontSize: '12px',
                          pointerEvents: 'none',
                          display: 'none'
                        }}
                      >
                        Loading video...
                      </div>
                    </div>
                  ) : (
                    <FallbackImage 
                      src={getImageUrl(ad)}
                      alt={ad.title}
                      className="ad-media-img"
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        objectPosition: 'center'
                      }}
                    />
                  )}
                  
                  {ad.featured && (
                    <div className="featured-badge"><Star size={14} />Featured</div>
                  )}

                  <div className="ad-quick-actions">
                    <button 
                      className="quick-edit-btn"
                      onClick={() => openEditAd(ad)}
                      title="Edit Advertisement"
                    >
                      <Edit size={18} />
                    </button>
                    <button 
                      className="quick-delete-btn"
                      onClick={() => handleDelete('advertisements', ad._id, ad.title)}
                      title="Delete Advertisement"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
                
                <div className="ad-content">
                  <h3>{ad.title || 'Untitled Ad'}</h3>
                  <p>{ad.content || 'No content'}</p>
                  
                  <div className="ad-meta">
                    <span className={`media-badge ${ad.mediaType || 'image'}`}>
                      {ad.mediaType === 'video' ? (
                        <><Video size={12} />Video</>
                      ) : (
                        <><Image size={12} />Image</>
                      )}
                    </span>
                    <span className={`status-badge ${ad.isActive ? 'active' : 'inactive'}`}>
                      {ad.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  
                  <div className="ad-footer">
                    <span className="ad-date">
                      <Calendar size={14} />
                      {ad.createdAt ? new Date(ad.createdAt).toLocaleDateString() : 'Unknown'}
                    </span>
                    
                    <div className="ad-actions">
                      <button 
                        className="beautiful-action-btn edit" 
                        onClick={() => openEditAd(ad)}
                        title="Edit Advertisement"
                      >
                        <Edit size={16} />
                      </button>
                      <button 
                        className="beautiful-action-btn delete" 
                        onClick={() => handleDelete('advertisements', ad._id, ad.title)}
                        title="Delete Advertisement"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="beautiful-admin-dashboard">
      {/* Alert System */}
      {alert.show && (
        <div className={`beautiful-alert ${alert.type}`}>
          <div className="alert-content">
            {alert.type === 'success' && <CheckCircle size={20} />}
            {alert.type === 'error' && <AlertCircle size={20} />}
            {alert.type === 'warning' && <AlertTriangle size={20} />}
            <span>{alert.message}</span>
          </div>
          <button className="alert-close" onClick={() => setAlert({ show: false, type: '', message: '' })}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* ✅ MOBILE MENU TOGGLE */}
      <button 
        className="mobile-menu-toggle"
        onClick={toggleMobileMenu}
        aria-label="Toggle mobile menu"
      >
        <Menu size={24} />
      </button>

      {/* Dashboard Layout */}
      <div className="beautiful-dashboard-layout">
        {/* ✅ ENHANCED SIDEBAR */}
        <aside className={`beautiful-sidebar ${sidebarCollapsed ? 'collapsed' : ''} ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
          <div className="sidebar-header">
            <div className="brand">
              <div className="brand-icon"><Settings size={28} /></div>
              {!sidebarCollapsed && (
                <div className="brand-text">
                  <h2>Admin Panel</h2>
                  <p>Sampark Connect</p>
                </div>
              )}
            </div>
            <button className="sidebar-toggle" onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
              <Menu size={20} />
            </button>
          </div>
          
          <nav className="sidebar-nav">
            {[
              { key: 'dashboard', label: 'Dashboard', icon: BarChart3 },
              { key: 'categories', label: 'Categories', icon: Tag },
              { key: 'users', label: 'Users', icon: Users },
              { key: 'jobs', label: 'Jobs', icon: Briefcase },
              { key: 'ads', label: 'Advertisements', icon: Megaphone }
            ].map(({ key, label, icon: Icon }) => (
              <button key={key} className={`nav-item ${activeTab === key ? 'active' : ''}`}
                onClick={() => handleTabChange(key)} title={sidebarCollapsed ? label : ''}>
                <Icon size={20} />
                {!sidebarCollapsed && <span>{label}</span>}
              </button>
            ))}
          </nav>
          
          <div className="sidebar-footer">
            <div className="admin-profile">
              <div className="profile-avatar"><User size={20} /></div>
              {!sidebarCollapsed && (
                <div className="profile-info">
                  <div className="profile-name">Admin</div>
                  <div className="profile-role">Administrator</div>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* ✅ MOBILE OVERLAY */}
        {isMobileMenuOpen && (
          <div 
            className={`mobile-menu-overlay ${isMobileMenuOpen ? 'show' : ''}`} 
            onClick={closeMobileMenu}
          ></div>
        )}

        {/* Main Content */}
        <main className={`beautiful-main-content ${sidebarCollapsed ? 'expanded' : ''}`}>
          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'categories' && renderCategories()}
          {activeTab === 'users' && renderUsers()}
          {activeTab === 'jobs' && renderJobs()}
          {activeTab === 'ads' && renderAds()}
        </main>
      </div>

      {/* ===== ALL MODALS ===== */}
      
      {/* ✅ ENHANCED: Category Modal with Dependent Dropdown */}
      {showCategoryModal && (
        <div className="beautiful-modal-overlay">
          <div className="beautiful-modal">
            <div className="modal-header">
              <h3>{editingCategory ? 'Edit Category' : 'Add New Category'}</h3>
              <button className="modal-close" onClick={() => closeModal('category')}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Category Name *</label>
                <input type="text" name="name" value={categoryForm.name} onChange={handleCategoryChange}
                  placeholder="Enter category name" required />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Industry *</label>
                  <select name="industry" value={categoryForm.industry} onChange={handleCategoryChange} required>
                    {industries.map(industry => (
                      <option key={industry} value={industry}>{industry}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Parent Category *</label>
                  <select 
                    name="parentCategory" 
                    value={categoryForm.parentCategory} 
                    onChange={handleCategoryChange} 
                    required
                    disabled={!categoryForm.industry}
                  >
                    <option value="">
                      {!categoryForm.industry 
                        ? 'Select Industry First' 
                        : 'Select Parent Category'
                      }
                    </option>
                    {/* ✅ CRITICAL: Dynamic parent categories based on selected industry */}
                    {getParentCategories(categoryForm.industry).map(parent => (
                      <option key={parent} value={parent}>{parent}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Category Image {!editingCategory && '*'}</label>
                <input type="file" name="image" accept="image/*" onChange={handleCategoryChange} 
                  required={!editingCategory} />
                <small>Supported formats: JPEG, PNG, GIF, WebP (Max 5MB)</small>
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea name="description" value={categoryForm.description} onChange={handleCategoryChange}
                  rows="3" placeholder="Enter category description" />
              </div>
              <div className="form-checkbox">
                <input type="checkbox" name="isFeatured" id="isFeatured" checked={categoryForm.isFeatured}
                  onChange={handleCategoryChange} />
                <label htmlFor="isFeatured">Featured Category</label>
              </div>
            </div>
            <div className="modal-footer">
              <button className="beautiful-secondary-btn" onClick={() => closeModal('category')} disabled={loading}>
                Cancel
              </button>
              <button className="beautiful-primary-btn" onClick={submitCategory} disabled={loading}>
                {loading ? (
                  <>
                    <div className="spinner"></div>
                    {editingCategory ? 'Updating...' : 'Adding...'}
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    {editingCategory ? 'Update Category' : 'Add Category'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Job Modal */}
      {showJobModal && (
        <div className="beautiful-modal-overlay">
          <div className="beautiful-modal">
            <div className="modal-header">
              <h3>{editingJob ? 'Edit Job' : 'Add New Job'}</h3>
              <button className="modal-close" onClick={() => closeModal('job')}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Job Title *</label>
                <input type="text" name="title" value={jobForm.title} onChange={handleJobChange}
                  placeholder="Enter job title" required />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Category *</label>
                  <select name="category" value={jobForm.category} onChange={handleJobChange} required>
                    <option value="">Select Category</option>
                    {categories.map(cat => (
                      <option key={cat._id} value={cat.name}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Budget Type *</label>
                  <select name="budgetType" value={jobForm.budgetType} onChange={handleJobChange} required>
                    {budgetTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Minimum Budget (₹) *</label>
                  <input type="number" name="budgetMin" value={jobForm.budgetMin} onChange={handleJobChange}
                    placeholder="Enter minimum budget" min="0" required />
                </div>
                <div className="form-group">
                  <label>Maximum Budget (₹) *</label>
                  <input type="number" name="budgetMax" value={jobForm.budgetMax} onChange={handleJobChange}
                    placeholder="Enter maximum budget" min="0" required />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Status</label>
                  <select name="status" value={jobForm.status} onChange={handleJobChange}>
                    {jobStatuses.map(status => (
                      <option key={status} value={status}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Location</label>
                  <input type="text" name="location" value={jobForm.location} onChange={handleJobChange}
                    placeholder="Enter job location" />
                </div>
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea name="description" value={jobForm.description} onChange={handleJobChange}
                  rows="4" placeholder="Enter job description" />
              </div>
              <div className="form-group">
                <label>Requirements</label>
                <textarea name="requirements" value={jobForm.requirements} onChange={handleJobChange}
                  rows="3" placeholder="Enter job requirements" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="beautiful-secondary-btn" onClick={() => closeModal('job')} disabled={loading}>
                Cancel
              </button>
              <button className="beautiful-primary-btn" onClick={submitJob} disabled={loading}>
                {loading ? (
                  <>
                    <div className="spinner"></div>
                    {editingJob ? 'Updating...' : 'Adding...'}
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    {editingJob ? 'Update Job' : 'Add Job'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Advertisement Modal */}
      {showAdModal && (
        <div className="beautiful-modal-overlay">
          <div className="beautiful-modal large">
            <div className="modal-header">
              <h3>{editingAd ? 'Edit Advertisement' : 'Create New Advertisement'}</h3>
              <button className="modal-close" onClick={() => closeModal('ad')}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Advertisement Title *</label>
                <input type="text" name="title" value={adForm.title} onChange={handleAdChange}
                  placeholder="Enter advertisement title" required />
              </div>
              <div className="form-group">
                <label>Content *</label>
                <textarea name="content" value={adForm.content} onChange={handleAdChange}
                  rows="4" placeholder="Enter advertisement content" required />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Placement</label>
                  <select name="placement" value={adForm.placement} onChange={handleAdChange}>
                    {placements.map(placement => (
                      <option key={placement} value={placement}>
                        {placement.charAt(0).toUpperCase() + placement.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Advertisement Media {!editingAd && '*'}</label>
                <input type="file" name="media" accept="image/*,video/*" onChange={handleAdChange} />
                <small>
                  Supported formats: Images (JPEG, PNG, GIF, WebP) | Videos (MP4, AVI, MKV, MOV, WMV, FLV, WebM)
                </small>
                {adForm.mediaType && (
                  <div className="media-type-indicator">
                    {adForm.mediaType === 'video' ? (
                      <><Video size={12} /> Video Selected</>
                    ) : (
                      <><Image size={12} /> Image Selected</>
                    )}
                  </div>
                )}
              </div>
              <div className="form-group">
                <label>Link (Optional)</label>
                <input type="url" name="link" value={adForm.link} onChange={handleAdChange}
                  placeholder="https://example.com" />
              </div>
              <div className="form-checkboxes">
                <div className="form-checkbox">
                  <input type="checkbox" name="isActive" id="isActive" checked={adForm.isActive}
                    onChange={handleAdChange} />
                  <label htmlFor="isActive">Activate advertisement immediately</label>
                </div>
                <div className="form-checkbox">
                  <input type="checkbox" name="featured" id="featured" checked={adForm.featured}
                    onChange={handleAdChange} />
                  <label htmlFor="featured">
                    <Star size={14} />
                    Mark as Featured
                  </label>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="beautiful-secondary-btn" onClick={() => closeModal('ad')} disabled={loading}>
                Cancel
              </button>
              <button className="beautiful-primary-btn" onClick={submitAd} disabled={loading}>
                {loading ? (
                  <>
                    <div className="spinner"></div>
                    {editingAd ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    {editingAd ? 'Update Advertisement' : 'Create Advertisement'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
