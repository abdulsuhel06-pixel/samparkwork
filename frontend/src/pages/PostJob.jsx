import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiHelpers, authHelpers, handleApiError } from '../services/api';
import {
  ArrowLeft, Save, Eye, Calendar, MapPin, IndianRupee,
  Briefcase, Users, Clock, Tag, FileText, AlertCircle, Building
} from 'lucide-react';
import './PostJob.css';

const PostJob = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [categoryLoading, setCategoryLoading] = useState(true);
  const [errors, setErrors] = useState({});
  const [preview, setPreview] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    subCategory: '',
    location: 'Remote',
    businessAddress: {
      businessName: '',
      streetAddress: '',
      addressLine2: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'India',
      landmark: '',
      locationInstructions: ''
    },
    budgetMin: '',
    budgetMax: '',
    budgetType: 'Fixed',
    experienceLevel: 'Intermediate',
    skills: [],
    deadline: '',
    urgent: false,
    featured: false
  });

  // Check if user is client
  useEffect(() => {
    if (!authHelpers.isAuthenticated()) {
      navigate('/login');
      return;
    }
    
    if (!authHelpers.isClient() && !authHelpers.isAdmin()) {
      navigate('/dashboard');
      return;
    }
    
    fetchCategories();
  }, [navigate]);

  // ✅ CRITICAL FIX: Use the correct API endpoint for categories
  const fetchCategories = async () => {
    try {
      console.log('📋 [PostJob] Fetching categories...');
      setCategoryLoading(true);
      
      // ✅ FIXED: Use getFeaturedCategories (PUBLIC) instead of getJobCategories
      const response = await apiHelpers.getFeaturedCategories();
      
      console.log('📋 [PostJob] API Response:', response);
      
      if (response.success && response.categories) {
        console.log('✅ [PostJob] Categories received:', response.categories);
        
        // ✅ ENHANCED: Process categories to extract names
        const processedCategories = response.categories.map(category => {
          if (typeof category === 'string') {
            return category;
          } else if (typeof category === 'object' && category.name) {
            return category.name; // Extract name from category object
          } else if (typeof category === 'object' && category._id) {
            return category._id;
          } else {
            console.warn('⚠️ [PostJob] Unknown category format:', category);
            return String(category);
          }
        });
        
        console.log('✅ [PostJob] Processed categories:', processedCategories);
        setCategories(processedCategories);
      } else {
        console.error('❌ [PostJob] Invalid response format:', response);
        setCategories([]);
      }
    } catch (error) {
      console.error('❌ [PostJob] Failed to fetch categories:', error);
      const errorInfo = handleApiError(error);
      
      // ✅ ENHANCED: Provide fallback categories if API fails
      const fallbackCategories = [
        'CAD Design',
        'Micro Setting', 
        'Casting',
        'Polish Work',
        'Filing',
        'Rhodium Plating',
        'Pulling',
        'Stone Setting',
        '3D Modeling',
        'Jewelry Repair'
      ];
      
      console.log('🆘 [PostJob] Using fallback categories due to API error');
      setCategories(fallbackCategories);
      
      // Don't show error to user, just use fallback
    } finally {
      setCategoryLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleAddressChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      businessAddress: {
        ...prev.businessAddress,
        [name]: value
      }
    }));
    
    if (errors[`businessAddress.${name}`]) {
      setErrors(prev => ({
        ...prev,
        [`businessAddress.${name}`]: ''
      }));
    }
  };

  const handleSkillsChange = (e) => {
    const skills = e.target.value.split(',').map(skill => skill.trim()).filter(skill => skill);
    setFormData(prev => ({
      ...prev,
      skills
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Job title is required';
    } else if (formData.title.length < 3) {
      newErrors.title = 'Title must be at least 3 characters';
    } else if (formData.title.length > 100) {
      newErrors.title = 'Title cannot exceed 100 characters';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Job description is required';
    } else if (formData.description.length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    } else if (formData.description.length > 5000) {
      newErrors.description = 'Description cannot exceed 5000 characters';
    }

    if (!formData.category) {
      newErrors.category = 'Category is required';
    }

    if (!formData.budgetMin || formData.budgetMin <= 0) {
      newErrors.budgetMin = 'Valid minimum budget is required';
    }

    if (!formData.budgetMax || formData.budgetMax <= 0) {
      newErrors.budgetMax = 'Valid maximum budget is required';
    }

    if (parseFloat(formData.budgetMax) < parseFloat(formData.budgetMin)) {
      newErrors.budgetMax = 'Maximum budget must be greater than minimum budget';
    }

    if (formData.deadline && new Date(formData.deadline) <= new Date()) {
      newErrors.deadline = 'Deadline must be a future date';
    }

    if (formData.location === 'On-site') {
      const addr = formData.businessAddress;
      
      if (!addr.businessName.trim()) {
        newErrors['businessAddress.businessName'] = 'Business name is required for on-site jobs';
      }
      if (!addr.streetAddress.trim()) {
        newErrors['businessAddress.streetAddress'] = 'Street address is required for on-site jobs';
      }
      if (!addr.city.trim()) {
        newErrors['businessAddress.city'] = 'City is required for on-site jobs';
      }
      if (!addr.state.trim()) {
        newErrors['businessAddress.state'] = 'State is required for on-site jobs';
      }
      if (!addr.postalCode.trim()) {
        newErrors['businessAddress.postalCode'] = 'Postal code is required for on-site jobs';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      const firstError = Object.keys(errors)[0];
      document.getElementsByName(firstError)[0]?.focus();
      return;
    }

    setLoading(true);
    try {
      console.log('📤 [PostJob] Submitting job data:', formData);
      const response = await apiHelpers.createJob(formData);
      if (response.success) {
        alert('Job posted successfully!');
        navigate('/jobs');
      }
    } catch (error) {
      console.error('❌ [PostJob] Error posting job:', error);
      const errorInfo = handleApiError(error);
      
      if (error.response?.data?.errors) {
        const apiErrors = {};
        error.response.data.errors.forEach(err => {
          apiErrors[err.field] = err.message;
        });
        setErrors(apiErrors);
      } else {
        alert(errorInfo.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const formatBudgetPreview = () => {
    if (!formData.budgetMin || !formData.budgetMax) return 'Budget not specified';
    const formatter = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    });
    return `${formatter.format(formData.budgetMin)} - ${formatter.format(formData.budgetMax)} ${formData.budgetType}`;
  };

  const formatAddressPreview = () => {
    if (formData.location === 'Remote' || formData.location === 'Hybrid') {
      return formData.location;
    }

    const addr = formData.businessAddress;
    
    if (addr.city && addr.state && addr.postalCode) {
      const parts = [];
      if (addr.city) parts.push(addr.city);
      if (addr.state) parts.push(addr.state);
      if (addr.postalCode) parts.push(addr.postalCode);
      return parts.join(', ');
    }
    
    const incompleteParts = [];
    if (addr.city) incompleteParts.push(addr.city);
    if (addr.state) incompleteParts.push(addr.state);
    if (addr.postalCode) incompleteParts.push(addr.postalCode);
    
    return incompleteParts.length > 0 ? incompleteParts.join(', ') : 'On-site (Complete address required)';
  };

  const getLocationOptions = () => {
    const options = [
      { value: 'Remote', label: 'Remote' },
      { value: 'Hybrid', label: 'Hybrid' }
    ];

    if (formData.location === 'On-site') {
      const addr = formData.businessAddress;
      if (addr.city && addr.state && addr.postalCode) {
        const formattedAddress = [addr.city, addr.state, addr.postalCode].join(', ');
        options.push({ value: 'On-site', label: formattedAddress });
      } else {
        options.push({ value: 'On-site', label: 'On-site (Complete address required)' });
      }
    } else {
      options.push({ value: 'On-site', label: 'On-site' });
    }

    return options;
  };

  if (preview) {
    return (
      <div className="post-job-page">
        <div className="container">
          <div className="preview-header">
            <button onClick={() => setPreview(false)} className="back-btn">
              <ArrowLeft size={20} />
              Back to Edit
            </button>
            <h1>Job Preview</h1>
            <div className="preview-actions">
              <button onClick={handleSubmit} disabled={loading} className="publish-btn">
                {loading ? 'Publishing...' : 'Publish Job'}
              </button>
            </div>
          </div>

          <div className="job-preview-card">
            <div className="job-header">
              <div className="job-title-section">
                <h2>{formData.title}</h2>
                <p className="company-name">{authHelpers.getCurrentUser()?.companyName || authHelpers.getCurrentUser()?.name}</p>
                <div className="job-badges">
                  <span className="category-badge">{formData.category}</span>
                  {formData.urgent && <span className="urgent-badge">Urgent</span>}
                  {formData.featured && <span className="featured-badge">Featured</span>}
                </div>
              </div>
            </div>

            <div className="job-meta-grid">
              <div className="meta-item">
                <MapPin size={18} />
                <div>
                  <span className="meta-label">Location</span>
                  <span className="meta-value">{formatAddressPreview()}</span>
                </div>
              </div>
              <div className="meta-item">
                <IndianRupee size={18} />
                <span>{formatBudgetPreview()}</span>
              </div>
              <div className="meta-item">
                <Users size={18} />
                <span>{formData.experienceLevel}</span>
              </div>
              {formData.deadline && (
                <div className="meta-item">
                  <Calendar size={18} />
                  <span>Deadline: {new Date(formData.deadline).toLocaleDateString()}</span>
                </div>
              )}
            </div>

            {formData.location === 'On-site' && formData.businessAddress.businessName && (
              <div className="job-address-details">
                <h3>Workplace Information</h3>
                <div className="address-info">
                  <div className="address-item">
                    <Building size={16} />
                    <div>
                      <strong>{formData.businessAddress.businessName}</strong>
                      <p>{formatAddressPreview()}</p>
                      {formData.businessAddress.landmark && (
                        <p className="landmark">📍 Landmark: {formData.businessAddress.landmark}</p>
                      )}
                      {formData.businessAddress.locationInstructions && (
                        <p className="instructions">💡 {formData.businessAddress.locationInstructions}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="job-description">
              <h3>Job Description</h3>
              <div className="description-content">
                {formData.description.split('\n').map((line, index) => (
                  <p key={index}>{line}</p>
                ))}
              </div>
            </div>

            {formData.skills.length > 0 && (
              <div className="job-skills">
                <h3>Required Skills</h3>
                <div className="skills-list">
                  {formData.skills.map((skill, index) => (
                    <span key={index} className="skill-tag">{skill}</span>
                  ))}
                </div>
              </div>
            )}

            {formData.subCategory && (
              <div className="job-subcategory">
                <h3>Sub-Category</h3>
                <p>{formData.subCategory}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="post-job-page">
      <div className="container">
        <div className="page-header">
          <button onClick={() => navigate('/dashboard')} className="back-btn">
            <ArrowLeft size={20} />
            Back to Dashboard
          </button>
          <h1>Post a New Job</h1>
          <div className="header-actions">
            <button 
              type="button"
              onClick={() => setPreview(true)}
              className="preview-btn"
              disabled={!formData.title || !formData.description}
            >
              <Eye size={18} />
              Preview
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="job-form">
          <div className="form-grid">
            {/* Job Title */}
            <div className="form-group full-width">
              <label htmlFor="title" className="form-label">
                Job Title *
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="e.g. Senior CAD Designer for Custom Jewelry"
                className={`form-input ${errors.title ? 'error' : ''}`}
                maxLength={100}
              />
              {errors.title && <span className="error-message">{errors.title}</span>}
              <span className="char-count">{formData.title.length}/100</span>
            </div>

            {/* ✅ FIXED: Category Dropdown with loading state */}
            <div className="form-group">
              <label htmlFor="category" className="form-label">
                Category *
              </label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className={`form-select ${errors.category ? 'error' : ''}`}
                disabled={categoryLoading}
              >
                <option value="">
                  {categoryLoading ? 'Loading categories...' : 'Select Category'}
                </option>
                {categories.map((category, index) => (
                  <option key={`category-${index}-${category}`} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              {errors.category && <span className="error-message">{errors.category}</span>}
              {categoryLoading && (
                <div className="loading-indicator">
                  <span>Loading categories...</span>
                </div>
              )}
              {!categoryLoading && categories.length === 0 && (
                <div className="no-categories-warning">
                  <AlertCircle size={16} />
                  <span>No categories available. Contact admin to add categories.</span>
                </div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="subCategory" className="form-label">
                Sub-Category
              </label>
              <input
                type="text"
                id="subCategory"
                name="subCategory"
                value={formData.subCategory}
                onChange={handleInputChange}
                placeholder="e.g. Ring Design, Pendant Making"
                className="form-input"
                maxLength={100}
              />
            </div>

            {/* Smart Location Dropdown */}
            <div className="form-group">
              <label htmlFor="location" className="form-label">
                Work Location *
              </label>
              <select
                id="location"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                className="form-select"
              >
                {getLocationOptions().map((option, index) => (
                  <option key={`location-${index}-${option.value}`} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <div className="location-preview">
                <MapPin size={14} />
                <span>Professionals will see: <strong>{formatAddressPreview()}</strong></span>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="experienceLevel" className="form-label">
                Experience Level Required
              </label>
              <select
                id="experienceLevel"
                name="experienceLevel"
                value={formData.experienceLevel}
                onChange={handleInputChange}
                className="form-select"
              >
                <option value="Entry">Entry Level</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Expert">Expert</option>
              </select>
            </div>

            {/* Business Address Fields */}
            {formData.location === 'On-site' && (
              <>
                <div className="form-section-header full-width">
                  <h3>
                    <Building size={20} />
                    Business Address Information
                  </h3>
                  <p>Complete the address to show professionals the exact location instead of generic "On-site"</p>
                  {formData.businessAddress.city && formData.businessAddress.state && formData.businessAddress.postalCode && (
                    <div className="address-success-notice">
                      ✅ Your job will show: <strong>{formatAddressPreview()}</strong>
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="businessName" className="form-label">
                    Business/Company Name *
                  </label>
                  <input
                    type="text"
                    id="businessName"
                    name="businessName"
                    value={formData.businessAddress.businessName}
                    onChange={handleAddressChange}
                    placeholder="e.g. Tanvi Jewellers Pvt Ltd"
                    className={`form-input ${errors['businessAddress.businessName'] ? 'error' : ''}`}
                    maxLength={200}
                  />
                  {errors['businessAddress.businessName'] && (
                    <span className="error-message">{errors['businessAddress.businessName']}</span>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="streetAddress" className="form-label">
                    Street Address *
                  </label>
                  <input
                    type="text"
                    id="streetAddress"
                    name="streetAddress"
                    value={formData.businessAddress.streetAddress}
                    onChange={handleAddressChange}
                    placeholder="e.g. 123 Commercial Street, Ground Floor"
                    className={`form-input ${errors['businessAddress.streetAddress'] ? 'error' : ''}`}
                    maxLength={300}
                  />
                  {errors['businessAddress.streetAddress'] && (
                    <span className="error-message">{errors['businessAddress.streetAddress']}</span>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="addressLine2" className="form-label">
                    Address Line 2 (Optional)
                  </label>
                  <input
                    type="text"
                    id="addressLine2"
                    name="addressLine2"
                    value={formData.businessAddress.addressLine2}
                    onChange={handleAddressChange}
                    placeholder="e.g. Near City Mall, Opposite Bank"
                    className="form-input"
                    maxLength={300}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="city" className="form-label">
                    City *
                  </label>
                  <input
                    type="text"
                    id="city"
                    name="city"
                    value={formData.businessAddress.city}
                    onChange={handleAddressChange}
                    placeholder="e.g. Kolkata"
                    className={`form-input ${errors['businessAddress.city'] ? 'error' : ''}`}
                    maxLength={100}
                  />
                  {errors['businessAddress.city'] && (
                    <span className="error-message">{errors['businessAddress.city']}</span>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="state" className="form-label">
                    State *
                  </label>
                  <input
                    type="text"
                    id="state"
                    name="state"
                    value={formData.businessAddress.state}
                    onChange={handleAddressChange}
                    placeholder="e.g. West Bengal"
                    className={`form-input ${errors['businessAddress.state'] ? 'error' : ''}`}
                    maxLength={100}
                  />
                  {errors['businessAddress.state'] && (
                    <span className="error-message">{errors['businessAddress.state']}</span>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="postalCode" className="form-label">
                    Postal/ZIP Code *
                  </label>
                  <input
                    type="text"
                    id="postalCode"
                    name="postalCode"
                    value={formData.businessAddress.postalCode}
                    onChange={handleAddressChange}
                    placeholder="e.g. 700001"
                    className={`form-input ${errors['businessAddress.postalCode'] ? 'error' : ''}`}
                    maxLength={20}
                  />
                  {errors['businessAddress.postalCode'] && (
                    <span className="error-message">{errors['businessAddress.postalCode']}</span>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="country" className="form-label">
                    Country
                  </label>
                  <input
                    type="text"
                    id="country"
                    name="country"
                    value={formData.businessAddress.country}
                    onChange={handleAddressChange}
                    className="form-input"
                    maxLength={100}
                  />
                </div>

                <div className="form-group full-width">
                  <label htmlFor="landmark" className="form-label">
                    Nearby Landmark (Optional)
                  </label>
                  <input
                    type="text"
                    id="landmark"
                    name="landmark"
                    value={formData.businessAddress.landmark}
                    onChange={handleAddressChange}
                    placeholder="e.g. Next to Metro Station, Behind Shopping Mall"
                    className="form-input"
                    maxLength={500}
                  />
                  <span className="help-text">Help professionals find your location easily</span>
                </div>

                <div className="form-group full-width">
                  <label htmlFor="locationInstructions" className="form-label">
                    Additional Location Instructions (Optional)
                  </label>
                  <textarea
                    id="locationInstructions"
                    name="locationInstructions"
                    value={formData.businessAddress.locationInstructions}
                    onChange={handleAddressChange}
                    rows={3}
                    placeholder="e.g. Use the main entrance, parking available on the left side, call when you arrive"
                    className="form-textarea"
                    maxLength={1000}
                  />
                  <span className="char-count">{formData.businessAddress.locationInstructions.length}/1000</span>
                  <span className="help-text">Provide specific instructions for visiting professionals</span>
                </div>
              </>
            )}

            {/* Budget */}
            <div className="form-group">
              <label htmlFor="budgetMin" className="form-label">
                Minimum Budget (INR) *
              </label>
              <input
                type="number"
                id="budgetMin"
                name="budgetMin"
                value={formData.budgetMin}
                onChange={handleInputChange}
                placeholder="25000"
                min="0"
                className={`form-input ${errors.budgetMin ? 'error' : ''}`}
              />
              {errors.budgetMin && <span className="error-message">{errors.budgetMin}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="budgetMax" className="form-label">
                Maximum Budget (INR) *
              </label>
              <input
                type="number"
                id="budgetMax"
                name="budgetMax"
                value={formData.budgetMax}
                onChange={handleInputChange}
                placeholder="50000"
                min="0"
                className={`form-input ${errors.budgetMax ? 'error' : ''}`}
              />
              {errors.budgetMax && <span className="error-message">{errors.budgetMax}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="budgetType" className="form-label">
                Budget Type
              </label>
              <select
                id="budgetType"
                name="budgetType"
                value={formData.budgetType}
                onChange={handleInputChange}
                className="form-select"
              >
                <option value="Fixed">Fixed Price</option>
                <option value="Hourly">Hourly Rate</option>
              </select>
            </div>

            {/* Deadline */}
            <div className="form-group">
              <label htmlFor="deadline" className="form-label">
                Application Deadline
              </label>
              <input
                type="date"
                id="deadline"
                name="deadline"
                value={formData.deadline}
                onChange={handleInputChange}
                min={new Date().toISOString().split('T')[0]}
                className={`form-input ${errors.deadline ? 'error' : ''}`}
              />
              {errors.deadline && <span className="error-message">{errors.deadline}</span>}
            </div>

            {/* Job Description */}
            <div className="form-group full-width">
              <label htmlFor="description" className="form-label">
                Job Description *
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={8}
                placeholder="Describe the job requirements, responsibilities, and qualifications in detail...&#10;&#10;• What will the professional do?&#10;• What skills are required?&#10;• Any specific tools or software needed?&#10;• Quality standards or specifications?"
                className={`form-textarea ${errors.description ? 'error' : ''}`}
                maxLength={5000}
              />
              {errors.description && <span className="error-message">{errors.description}</span>}
              <span className="char-count">{formData.description.length}/5000</span>
            </div>

            {/* Skills */}
            <div className="form-group full-width">
              <label htmlFor="skills" className="form-label">
                Required Skills
              </label>
              <input
                type="text"
                id="skills"
                name="skills"
                value={formData.skills.join(', ')}
                onChange={handleSkillsChange}
                placeholder="e.g. CAD Design, 3D Modeling, AutoCAD, Jewelry Rendering (separate with commas)"
                className="form-input"
              />
              <span className="help-text">Separate multiple skills with commas</span>
              {formData.skills.length > 0 && (
                <div className="skills-preview">
                  {formData.skills.map((skill, index) => (
                    <span key={index} className="skill-tag">{skill}</span>
                  ))}
                </div>
              )}
            </div>

            {/* Job Options */}
            <div className="form-group full-width">
              <label className="form-label">Job Options</label>
              <div className="checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="urgent"
                    checked={formData.urgent}
                    onChange={handleInputChange}
                  />
                  <span className="checkbox-text">
                    Mark as Urgent
                    <small>Highlight this job to attract more attention</small>
                  </span>
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="featured"
                    checked={formData.featured}
                    onChange={handleInputChange}
                  />
                  <span className="checkbox-text">
                    Featured Job
                    <small>Promote this job for better visibility</small>
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="form-actions">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => setPreview(true)}
              className="btn-outline"
              disabled={!formData.title || !formData.description}
            >
              <Eye size={18} />
              Preview
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
            >
              {loading ? (
                <>
                  <div className="spinner-small"></div>
                  Posting Job...
                </>
              ) : (
                <>
                  <Save size={18} />
                  Post Job
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
 {/* Export the page to the main route*/}
export default PostJob;
