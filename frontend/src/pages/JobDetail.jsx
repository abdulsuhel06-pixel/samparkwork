import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiHelpers, handleApiError, getImageUrl } from '../services/api';
import {
  ArrowLeft, MapPin, IndianRupee, Calendar, Clock, Users, Eye, Star,
  Briefcase, Send, BookmarkCheck, Bookmark, AlertCircle, CheckCircle,
  User, Building, Mail, Phone, ExternalLink, Globe, FileText, MessageSquare,
  Navigation, Info
} from 'lucide-react';
import './JobDetail.css';

const JobDetail = () => {
  const { slug, id } = useParams();
  const navigate = useNavigate();
  const { user, canApplyToJobs } = useAuth();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [showClientProfile, setShowClientProfile] = useState(false);
  const [contactingClient, setContactingClient] = useState(false);
  const [applicationData, setApplicationData] = useState({
    coverLetter: '',
    proposedBudget: '',
    estimatedTimeline: ''
  });
  const [errors, setErrors] = useState({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchJobDetail();
    checkIfSaved();
  }, [slug, id]);

  // ✅ ENHANCED: Professional view tracking with better error handling
  useEffect(() => {
    const trackJobView = async () => {
      if (!user?.email || !job?._id) return;

      try {
        console.log(`📊 [VIEW TRACKING] Tracking view for user: ${user.email}, job: ${job._id}`);
        
        const response = await apiHelpers.incrementJobView(job._id);
        
        if (response.success) {
          if (response.newView) {
            console.log(`✅ [VIEW TRACKING] New view recorded, count: ${response.views}`);
            setJob(prevJob => ({
              ...prevJob,
              views: response.views
            }));
          } else {
            console.log(`🔄 [VIEW TRACKING] View already counted for this user`);
          }
        }
      } catch (error) {
        console.error('❌ [VIEW TRACKING] Failed to track view:', error);
      }
    };

    if (job && user) {
      const timer = setTimeout(trackJobView, 500);
      return () => clearTimeout(timer);
    }
  }, [job?._id, user?.email]);

  const fetchJobDetail = async () => {
    setLoading(true);
    try {
      let response;
      
      if (slug) {
        response = await apiHelpers.getJobBySlug(slug);
      } else if (id) {
        response = await apiHelpers.getJobById(id);
      } else {
        throw new Error('No job identifier provided');
      }

      if (response.success) {
        console.log('✅ [JobDetail] Job loaded:', response.job.title);
        console.log('✅ [JobDetail] Client info:', response.job.createdBy);
        setJob(response.job);
      } else {
        throw new Error('Job not found');
      }
    } catch (error) {
      console.error('❌ [JobDetail] Failed to fetch job:', error);
      navigate('/find-jobs');
    } finally {
      setLoading(false);
    }
  };

  const checkIfSaved = () => {
    try {
      const jobId = slug || id;
      const savedJobs = JSON.parse(localStorage.getItem('savedJobs') || '[]');
      setSaved(savedJobs.includes(jobId));
    } catch {
      setSaved(false);
    }
  };

  const toggleSave = () => {
    try {
      const jobId = slug || id;
      const savedJobs = JSON.parse(localStorage.getItem('savedJobs') || '[]');
      let updatedSaved;
      
      if (saved) {
        updatedSaved = savedJobs.filter(savedJobId => savedJobId !== jobId);
      } else {
        updatedSaved = [...savedJobs, jobId];
      }
      
      localStorage.setItem('savedJobs', JSON.stringify(updatedSaved));
      setSaved(!saved);
    } catch (error) {
      console.error('❌ [JobDetail] Failed to toggle save:', error);
    }
  };

  // ✅ ENHANCED: Contact Client with Complete Integration
  const handleContactClient = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (!canApplyToJobs()) {
      alert('Only professionals can contact clients');
      return;
    }

    setContactingClient(true);
    try {
      console.log('💬 [ContactClient] Starting conversation with client:', job.createdBy._id);
      console.log('💬 [ContactClient] Job context:', { jobId: job._id, jobTitle: job.title });
      
      // Use the new enhanced API endpoint
      const conversationResponse = await apiHelpers.startConversationWithJob(
        job._id, 
        job.createdBy._id
      );

      if (conversationResponse.success) {
        console.log('✅ [ContactClient] Conversation created/found:', conversationResponse.conversation._id);
        
        // Show success message
        const clientName = job.createdBy?.companyName || job.createdBy?.name || 'the client';
        alert(`✅ Conversation started with ${clientName}! Redirecting to messages...`);
        
        // Navigate to messages with the specific conversation
        navigate(`/messages?conversation=${conversationResponse.conversation._id}&job=${job._id}`);
      } else {
        throw new Error(conversationResponse.message || 'Failed to start conversation');
      }
    } catch (error) {
      console.error('❌ [ContactClient] Error:', error);
      const errorInfo = handleApiError(error);
      alert(`❌ Failed to contact client: ${errorInfo.message || 'Please try again later'}`);
    } finally {
      setContactingClient(false);
    }
  };

  // ✅ ENHANCED: Client Profile Photo with Multiple Fallbacks
  const getClientProfilePhoto = () => {
    const client = job?.createdBy;
    if (!client) {
      console.log('❌ [ProfilePhoto] No client data available');
      return null;
    }

    console.log('🖼️ [ProfilePhoto] Client data:', {
      avatarUrl: client.avatarUrl,
      avatar: client.avatar,
      name: client.name
    });

    // Try avatarUrl first (processed by backend)
    if (client.avatarUrl) {
      console.log('✅ [ProfilePhoto] Using avatarUrl:', client.avatarUrl);
      return client.avatarUrl;
    }

    // Try avatar field with getImageUrl helper
    if (client.avatar) {
      const processedUrl = getImageUrl(client.avatar, 'avatars');
      console.log('✅ [ProfilePhoto] Using processed avatar:', processedUrl);
      return processedUrl;
    }

    console.log('ℹ️ [ProfilePhoto] No avatar available, using default');
    return null;
  };

  const handleApplicationChange = (e) => {
    const { name, value } = e.target;
    setApplicationData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateApplication = () => {
    const newErrors = {};

    if (!applicationData.coverLetter.trim()) {
      newErrors.coverLetter = 'Cover letter is required';
    } else if (applicationData.coverLetter.length < 50) {
      newErrors.coverLetter = 'Cover letter must be at least 50 characters';
    } else if (applicationData.coverLetter.length > 2000) {
      newErrors.coverLetter = 'Cover letter cannot exceed 2000 characters';
    }

    if (applicationData.proposedBudget && isNaN(applicationData.proposedBudget)) {
      newErrors.proposedBudget = 'Proposed budget must be a valid number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleApply = async (e) => {
    e.preventDefault();
    
    if (!validateApplication()) {
      return;
    }

    setApplying(true);
    try {
      console.log('📨 [Application] Submitting application for job:', job._id);
      const response = await apiHelpers.applyToJob(job._id, applicationData);
      if (response.success) {
        console.log('✅ [Application] Application submitted successfully');
        setShowApplicationForm(false);
        setApplicationData({ coverLetter: '', proposedBudget: '', estimatedTimeline: '' });
        alert('✅ Application submitted successfully!');
        fetchJobDetail(); // Refresh job data
      }
    } catch (error) {
      console.error('❌ [Application] Submission failed:', error);
      const errorInfo = handleApiError(error);
      alert(`❌ Application failed: ${errorInfo.message}`);
    } finally {
      setApplying(false);
    }
  };

  const formatBudget = (budget) => {
    if (!budget) return 'Budget not specified';
    const formatter = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: budget.currency || 'INR',
      maximumFractionDigits: 0
    });
    
    if (budget.min === budget.max) {
      return `${formatter.format(budget.min)} ${budget.type}`;
    }
    return `${formatter.format(budget.min)} - ${formatter.format(budget.max)} ${budget.type}`;
  };

  // ✅ NEW: Format complete address for display
  const formatJobLocation = () => {
    if (job.location !== 'On-site') {
      return job.location || 'Remote';
    }

    // Check if we have address data
    const addr = job.businessAddress;
    if (!addr?.businessName && !addr?.streetAddress) {
      return 'On-site'; // Fallback for old jobs
    }

    const parts = [];
    if (addr.businessName) parts.push(addr.businessName);
    if (addr.city) parts.push(addr.city);
    if (addr.state && addr.city !== addr.state) parts.push(addr.state);
    
    return parts.length > 0 ? parts.join(', ') : 'On-site';
  };

  // ✅ NEW: Get complete formatted address
  const getCompleteAddress = () => {
    if (job.location !== 'On-site' || !job.businessAddress) {
      return null;
    }

    const addr = job.businessAddress;
    const addressParts = [];
    
    if (addr.streetAddress) addressParts.push(addr.streetAddress);
    if (addr.addressLine2) addressParts.push(addr.addressLine2);
    if (addr.city) addressParts.push(addr.city);
    if (addr.state) addressParts.push(addr.state);
    if (addr.postalCode) addressParts.push(addr.postalCode);
    if (addr.country && addr.country !== 'India') addressParts.push(addr.country);

    return {
      businessName: addr.businessName,
      fullAddress: addressParts.join(', '),
      landmark: addr.landmark,
      instructions: addr.locationInstructions
    };
  };

  const formatTimeAgo = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffTime = Math.abs(now - date);
    const diffMinutes = Math.floor(diffTime / (1000 * 60));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffMinutes < 60) {
      return `Posted ${diffMinutes} ${diffMinutes === 1 ? 'minute' : 'minutes'} ago`;
    } else if (diffHours < 24) {
      return `Posted ${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
    } else if (diffDays < 7) {
      return `Posted ${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
    } else {
      const diffWeeks = Math.floor(diffDays / 7);
      return `Posted ${diffWeeks} ${diffWeeks === 1 ? 'week' : 'weeks'} ago`;
    }
  };

  if (loading) {
    return (
      <div className="upwork-job-detail-page">
        <div className="upwork-container">
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading job details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="upwork-job-detail-page">
        <div className="upwork-container">
          <div className="error-state">
            <AlertCircle size={48} />
            <h3>Job not found</h3>
            <p>The job you're looking for doesn't exist or has been removed.</p>
            <button onClick={() => navigate('/find-jobs')} className="btn-primary">
              Browse All Jobs
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ✅ NEW: Get complete address info
  const addressInfo = getCompleteAddress();

  return (
    <div className="upwork-job-detail-page">
      <div className="upwork-container">
        {/* Header with Back Button */}
        <div className="upwork-page-header">
          <button onClick={() => navigate('/find-jobs')} className="upwork-back-btn">
            <ArrowLeft size={20} />
            Back to Jobs
          </button>
        </div>

        {/* Main Job Detail Card */}
        <div className="upwork-job-detail-card">
          {/* Category Badge */}
          <div className="upwork-job-category">
            <span className="upwork-category-badge">{job.category}</span>
            {job.urgent && <span className="upwork-urgent-badge">Urgent</span>}
            {job.featured && <span className="upwork-featured-badge"><Star size={12} />Featured</span>}
          </div>

          {/* Job Title and Company */}
          <div className="upwork-job-header">
            <h1 className="upwork-job-title">{job.title}</h1>
            <div className="upwork-company-info">
              <Building size={16} />
              <span className="upwork-company-name">{job.createdBy?.companyName || job.createdBy?.name}</span>
              <span className="upwork-posted-time">{formatTimeAgo(job.createdAt)}</span>
            </div>
          </div>

          {/* Save Button */}
          <div className="upwork-job-actions">
            <button
              onClick={toggleSave}
              className={`upwork-save-btn ${saved ? 'saved' : ''}`}
            >
              {saved ? <BookmarkCheck size={20} /> : <Bookmark size={20} />}
              {saved ? 'Saved' : 'Save'}
            </button>
          </div>

          {/* ✅ ENHANCED: Job Meta Information with Address */}
          <div className="upwork-job-meta-grid">
            <div className="upwork-meta-item">
              <MapPin size={16} />
              <div>
                <span className="upwork-meta-label">Location</span>
                <span className="upwork-meta-value">{formatJobLocation()}</span>
              </div>
            </div>
            <div className="upwork-meta-item">
              <IndianRupee size={16} />
              <div>
                <span className="upwork-meta-label">Budget</span>
                <span className="upwork-meta-value">{formatBudget(job.budget)}</span>
              </div>
            </div>
            <div className="upwork-meta-item">
              <Users size={16} />
              <div>
                <span className="upwork-meta-label">Experience</span>
                <span className="upwork-meta-value">{job.experienceLevel || 'Any Level'}</span>
              </div>
            </div>
            <div className="upwork-meta-item">
              <Eye size={16} />
              <div>
                <span className="upwork-meta-label">Views</span>
                <span className="upwork-meta-value">{job.views || 0}</span>
              </div>
            </div>
            <div className="upwork-meta-item">
              <Briefcase size={16} />
              <div>
                <span className="upwork-meta-label">Applications</span>
                <span className="upwork-meta-value">{job.applicationCount || 0}</span>
              </div>
            </div>
          </div>

          {/* ✅ NEW: Complete Address Information for On-site Jobs */}
          {addressInfo && (
            <div className="upwork-address-section">
              <h2>
                <Building size={18} />
                Workplace Information
              </h2>
              <div className="upwork-address-card">
                <div className="upwork-business-info">
                  <h3 className="upwork-business-name">{addressInfo.businessName}</h3>
                  <p className="upwork-full-address">
                    <Navigation size={14} />
                    {addressInfo.fullAddress}
                  </p>
                  
                  {addressInfo.landmark && (
                    <p className="upwork-landmark">
                      <MapPin size={14} />
                      <strong>Landmark:</strong> {addressInfo.landmark}
                    </p>
                  )}
                  
                  {addressInfo.instructions && (
                    <div className="upwork-instructions">
                      <Info size={14} />
                      <div>
                        <strong>Location Instructions:</strong>
                        <p>{addressInfo.instructions}</p>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="upwork-address-actions">
                  <button 
                    className="upwork-map-btn"
                    onClick={() => {
                      const searchQuery = encodeURIComponent(addressInfo.fullAddress);
                      window.open(`https://maps.google.com/maps?q=${searchQuery}`, '_blank');
                    }}
                    title="Open in Google Maps"
                  >
                    <ExternalLink size={14} />
                    View on Map
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ✅ FIXED: Deadline Notice */}
          {job.deadline && (
            <div className="upwork-deadline-notice">
              <Calendar size={16} />
              <span>Deadline: {new Date(job.deadline).toLocaleDateString()}</span>
            </div>
          )}

          {/* Job Description */}
          <div className="upwork-job-description">
            <h2>Job Description</h2>
            <div className="upwork-description-content">
              {job.description?.split('\n').map((paragraph, index) => (
                paragraph.trim() && <p key={index}>{paragraph.trim()}</p>
              )) || <p>No description available.</p>}
            </div>
          </div>

          {/* Required Skills */}
          {job.skills && job.skills.length > 0 && (
            <div className="upwork-job-skills">
              <h2>Required Skills</h2>
              <div className="upwork-skills-list">
                {job.skills.map((skill, index) => (
                  <span key={index} className="upwork-skill-tag">{skill}</span>
                ))}
              </div>
            </div>
          )}

          {/* Sub-Category */}
          {job.subCategory && (
            <div className="upwork-job-subcategory">
              <h2>Sub-Category</h2>
              <p className="upwork-subcategory-text">{job.subCategory}</p>
            </div>
          )}

          {/* ✅ FULLY ENHANCED: About the Client */}
          <div className="upwork-client-section">
            <div className="upwork-client-header">
              <h2>About the Client</h2>
            </div>
            
            <div className="upwork-client-card">
              <div className="upwork-client-avatar">
                {getClientProfilePhoto() ? (
                  <img 
                    src={getClientProfilePhoto()} 
                    alt={job.createdBy?.name || 'Client'}
                    onLoad={() => console.log('✅ [ProfilePhoto] Image loaded successfully')}
                    onError={(e) => {
                      console.warn('❌ [ProfilePhoto] Failed to load:', getClientProfilePhoto());
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div 
                  className="upwork-default-avatar" 
                  style={{ display: getClientProfilePhoto() ? 'none' : 'flex' }}
                >
                  {(job.createdBy?.name || job.createdBy?.companyName || 'C').charAt(0).toUpperCase()}
                </div>
              </div>
              
              <div className="upwork-client-details">
                <h3 className="upwork-client-name">{job.createdBy?.companyName || job.createdBy?.name}</h3>
                
                <div className="upwork-client-meta">
                  <span className="upwork-member-since">
                    <Calendar size={12} />
                    Member since {new Date(job.createdBy?.createdAt || Date.now()).getFullYear()}
                  </span>
                  <span className="upwork-jobs-posted">
                    <Briefcase size={12} />
                    Jobs posted: {job.createdBy?.jobsPosted || 1}
                  </span>
                </div>

                {/* Enhanced Contact Information Display */}
                <div className="upwork-client-contact-info">
                  {job.createdBy?.email && (
                    <div className="upwork-contact-item">
                      <Mail size={14} />
                      <span className="upwork-contact-text">{job.createdBy.email}</span>
                    </div>
                  )}
                  {(job.createdBy?.contact?.phone || job.createdBy?.phone) && (
                    <div className="upwork-contact-item">
                      <Phone size={14} />
                      <span className="upwork-contact-text">{job.createdBy.contact?.phone || job.createdBy.phone}</span>
                    </div>
                  )}
                  {job.createdBy?.companyAddress && (
                    <div className="upwork-contact-item">
                      <Building size={14} />
                      <span className="upwork-contact-text">{job.createdBy.companyAddress}</span>
                    </div>
                  )}
                </div>
                
                <div className="upwork-client-actions">
                  {/* ✅ COMPLETELY FIXED: Working Contact Client Button */}
                  <button 
                    className="upwork-contact-client-btn"
                    onClick={handleContactClient}
                    disabled={contactingClient || !user || !canApplyToJobs()}
                    title={
                      !user ? "Please login to contact clients" :
                      !canApplyToJobs() ? "Only professionals can contact clients" :
                      "Start a conversation with this client"
                    }
                  >
                    {contactingClient ? (
                      <>
                        <div className="spinner-small"></div>
                        Connecting...
                      </>
                    ) : (
                      <>
                        <MessageSquare size={14} />
                        Contact Client
                      </>
                    )}
                  </button>
                  <button 
                    className="upwork-view-more-jobs-btn"
                    onClick={() => navigate(`/jobs?client=${job.createdBy?._id}`)}
                  >
                    <ExternalLink size={12} />
                    View More Jobs
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Apply Section */}
          <div className="upwork-apply-section">
            {user && canApplyToJobs() && job.status === 'open' ? (
              <button
                onClick={() => setShowApplicationForm(true)}
                className="upwork-apply-btn-main"
              >
                <Send size={16} />
                Apply Now
              </button>
            ) : !user ? (
              <div className="upwork-auth-notice">
                <AlertCircle size={18} />
                <span>Please <a href="/login">login</a> to apply for jobs</span>
              </div>
            ) : (
              <div className="upwork-role-notice">
                <AlertCircle size={18} />
                <span>Only professionals can apply for jobs</span>
              </div>
            )}
          </div>
        </div>

        {/* Application Form Modal - Enhanced */}
        {showApplicationForm && user && canApplyToJobs() && (
          <div className="professional-modal-overlay">
            <div className="professional-modal-content">
              <div className="professional-modal-header">
                <div className="professional-header-content">
                  <FileText size={24} className="professional-header-icon" />
                  <div>
                    <h3>Submit Your Proposal</h3>
                    <p>Application for: {job.title}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowApplicationForm(false)}
                  className="professional-close-btn"
                >
                  ×
                </button>
              </div>
              
              <form onSubmit={handleApply} className="professional-application-form">
                <div className="professional-form-section">
                  <div className="professional-form-group">
                    <label htmlFor="coverLetter" className="professional-form-label">
                      <FileText size={16} />
                      Cover Letter *
                    </label>
                    <div className="professional-textarea-wrapper">
                      <textarea
                        id="coverLetter"
                        name="coverLetter"
                        value={applicationData.coverLetter}
                        onChange={handleApplicationChange}
                        rows={6}
                        placeholder="Dear Hiring Manager,

I am excited to submit my proposal for this project. With my expertise in [relevant skills], I am confident I can deliver exceptional results.

Here's what I bring to your project:
• [Your key strength 1]
• [Your key strength 2]  
• [Your key strength 3]

I would love to discuss your project requirements in detail. Thank you for considering my application.

Best regards,
[Your Name]"
                        className={`professional-form-textarea ${errors.coverLetter ? 'error' : ''}`}
                        maxLength={2000}
                      />
                      <div className="professional-textarea-footer">
                        <span className={`professional-char-count ${applicationData.coverLetter.length > 1800 ? 'warning' : ''}`}>
                          {applicationData.coverLetter.length}/2000
                        </span>
                      </div>
                    </div>
                    {errors.coverLetter && (
                      <span className="professional-error-message">
                        <AlertCircle size={14} />
                        {errors.coverLetter}
                      </span>
                    )}
                  </div>

                  <div className="professional-form-row">
                    <div className="professional-form-group">
                      <label htmlFor="proposedBudget" className="professional-form-label">
                        <IndianRupee size={16} />
                        Your Proposed Budget (INR)
                      </label>
                      <input
                        type="number"
                        id="proposedBudget"
                        name="proposedBudget"
                        value={applicationData.proposedBudget}
                        onChange={handleApplicationChange}
                        placeholder="e.g. 15000"
                        className={`professional-form-input ${errors.proposedBudget ? 'error' : ''}`}
                        min="0"
                      />
                      {errors.proposedBudget && (
                        <span className="professional-error-message">
                          <AlertCircle size={14} />
                          {errors.proposedBudget}
                        </span>
                      )}
                    </div>

                    <div className="professional-form-group">
                      <label htmlFor="estimatedTimeline" className="professional-form-label">
                        <Clock size={16} />
                        Estimated Timeline
                      </label>
                      <input
                        type="text"
                        id="estimatedTimeline"
                        name="estimatedTimeline"
                        value={applicationData.estimatedTimeline}
                        onChange={handleApplicationChange}
                        placeholder="e.g. 2 weeks"
                        className="professional-form-input"
                        maxLength={200}
                      />
                    </div>
                  </div>
                </div>

                <div className="professional-form-footer">
                  <div className="professional-proposal-summary">
                    <h4>Proposal Summary</h4>
                    <div className="professional-summary-item">
                      <span className="professional-summary-label">Job:</span>
                      <span className="professional-summary-value">{job.title}</span>
                    </div>
                    {applicationData.proposedBudget && (
                      <div className="professional-summary-item">
                        <span className="professional-summary-label">Your Budget:</span>
                        <span className="professional-summary-value">₹{parseInt(applicationData.proposedBudget).toLocaleString()}</span>
                      </div>
                    )}
                    {applicationData.estimatedTimeline && (
                      <div className="professional-summary-item">
                        <span className="professional-summary-label">Timeline:</span>
                        <span className="professional-summary-value">{applicationData.estimatedTimeline}</span>
                      </div>
                    )}
                  </div>

                  <div className="professional-form-actions">
                    <button
                      type="button"
                      onClick={() => setShowApplicationForm(false)}
                      className="professional-btn-secondary"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={applying}
                      className="professional-btn-primary"
                    >
                      {applying ? (
                        <>
                          <div className="professional-spinner"></div>
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Send size={16} />
                          Submit Proposal
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default JobDetail;
