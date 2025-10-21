import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { apiHelpers, handleApiError, getImageUrl } from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { 
  User, Mail, Phone, MapPin, Globe, Edit3, Plus, X, Upload, 
  Eye, Trash2, Building, Briefcase, Star, Clock, TrendingUp,
  Camera, Save, Loader, CheckCircle, AlertCircle, FileText,
  Calendar, Users, ExternalLink, PlusCircle, BarChart3,
  MessageSquare, Settings
} from 'lucide-react';
import './ClientProfile.css';

const ClientProfile = ({ user: propUser, isViewOnly = false }) => {
  const navigate = useNavigate();
  const { user: currentUser, token, updateUser } = useContext(AuthContext);
  const user = propUser || currentUser;
  const isOwner = !propUser || (currentUser && currentUser._id === user?._id);
  
  const [profile, setProfile] = useState(user || null);
  const [loading, setLoading] = useState(!user);
  const [error, setError] = useState(null);
  const [postedJobs, setPostedJobs] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Modal states
  const [activeModal, setActiveModal] = useState(null);
  const [uploading, setUploading] = useState({});

  // ✅ ENHANCED: Proper dependency management to prevent infinite calls
  const fetchProfile = useCallback(async (silent = false) => {
    if (!token) {
      setError("Please log in to view profile");
      setLoading(false);
      return;
    }

    if (!silent) setLoading(true);
    else setRefreshing(true);
    
    setError(null);
    
    try {
      console.log("🔍 [ClientProfile] Fetching profile data...");
      const data = await apiHelpers.getProfile();
      
      console.log("✅ [ClientProfile] Profile data loaded:", data);
      const profileData = data.user || data;
      setProfile(profileData);
      
      if (updateUser && isOwner) {
        updateUser(profileData);
      }
    } catch (error) {
      console.error('❌ [ClientProfile] Error fetching profile:', error);
      const errorInfo = handleApiError(error);
      setError(errorInfo.message);
      
      if (errorInfo.type === 'auth') {
        localStorage.removeItem('wn_token');
        localStorage.removeItem('wn_user');
        window.location.href = '/login';
      }
    } finally {
      if (!silent) setLoading(false);
      else setRefreshing(false);
    }
  }, [token, updateUser, isOwner]);

  const fetchPostedJobs = useCallback(async () => {
    if (!isOwner) return;
    
    setJobsLoading(true);
    try {
      const response = await apiHelpers.getMyPostedJobs();
      if (response.success) {
        setPostedJobs(response.jobs || []);
      }
    } catch (error) {
      console.error('Failed to fetch posted jobs:', error);
    } finally {
      setJobsLoading(false);
    }
  }, [isOwner]);

  // ✅ ENHANCED: Only run effects when necessary
  useEffect(() => {
    if (!user && token) {
      fetchProfile();
    }
    if (isOwner) {
      fetchPostedJobs();
    }
  }, [user, token, isOwner, fetchProfile, fetchPostedJobs]);

  // ✅ ENHANCED: File upload with proper form validation
  const handleFileUpload = useCallback(async (file, type) => {
    if (!file || !isOwner) {
      alert("Please select a file to upload");
      return;
    }

    setUploading(prev => ({ ...prev, [type]: true }));

    try {
      let response;
      switch(type) {
        case 'avatar':
          response = await apiHelpers.uploadAvatar(file);
          break;
        case 'companyImage':
          response = await apiHelpers.uploadCompanyImage(file);
          break;
        default:
          throw new Error('Invalid file type');
      }

      console.log(`✅ [ClientProfile] ${type} upload successful:`, response);
      await fetchProfile(true);
      setActiveModal(null);
      
      // ✅ Success notification
      const uploadType = type.charAt(0).toUpperCase() + type.slice(1);
      showNotification(`${uploadType} uploaded successfully!`, "success");
      
    } catch (error) {
      console.error(`❌ [ClientProfile] Error uploading ${type}:`, error);
      const errorInfo = handleApiError(error);
      
      // ✅ ENHANCED: Better error messages
      let errorMessage = `Error uploading ${type}: ${errorInfo.message}`;
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      showNotification(errorMessage, "error");
    } finally {
      setUploading(prev => ({ ...prev, [type]: false }));
    }
  }, [fetchProfile, isOwner]);

  // ✅ Enhanced profile update
  const handleUpdateProfile = useCallback(async (updateData) => {
    if (!isOwner) return;
    
    setUploading(prev => ({ ...prev, update: true }));

    try {
      const response = await apiHelpers.updateProfile(updateData);
      console.log("✅ [ClientProfile] Profile updated:", response);
      
      await fetchProfile(true);
      setActiveModal(null);
      showNotification("Profile updated successfully!", "success");
    } catch (error) {
      console.error("❌ [ClientProfile] Profile update failed:", error);
      const errorInfo = handleApiError(error);
      showNotification(`Error updating profile: ${errorInfo.message}`, "error");
    } finally {
      setUploading(prev => ({ ...prev, update: false }));
    }
  }, [fetchProfile, isOwner]);

  // ✅ Enhanced delete company image
  const handleDeleteCompanyImage = useCallback(async () => {
    if (!window.confirm('Are you sure you want to delete your company image?') || !isOwner) {
      return;
    }

    setUploading(prev => ({ ...prev, deleteCompanyImage: true }));

    try {
      await api.delete('/api/users/profile/company-image');
      await fetchProfile(true);
      showNotification("Company image deleted successfully!", "success");
    } catch (error) {
      console.error("❌ [ClientProfile] Error deleting company image:", error);
      const errorInfo = handleApiError(error);
      showNotification(`Error deleting company image: ${errorInfo.message}`, "error");
    } finally {
      setUploading(prev => ({ ...prev, deleteCompanyImage: false }));
    }
  }, [fetchProfile, isOwner]);

  // ✅ Simple notification system
  const showNotification = (message, type = "success") => {
    const notification = document.createElement('div');
    notification.className = `simple-notification ${type}`;
    notification.textContent = message;
    
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      background: ${type === 'success' ? '#10b981' : '#ef4444'};
      color: white;
      border-radius: 8px;
      font-weight: 500;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      if (notification.parentNode) {
        document.body.removeChild(notification);
      }
    }, 3000);
  };

  const formatTimeAgo = (date) => {
    const now = new Date();
    const jobDate = new Date(date);
    const diffTime = Math.abs(now - jobDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    return `Over ${Math.ceil(diffDays / 30)} months ago`;
  };

  const getJobStatusColor = (status) => {
    switch(status?.toLowerCase()) {
      case 'active': return 'accepted';
      case 'closed': return 'rejected';
      case 'draft': return 'pending';
      case 'paused': return 'pending';
      default: return 'accepted';
    }
  };

  if (loading) {
    return (
      <div className="professional-profile-container">
        <div className="profile-loading">
          <Loader className="animate-spin" size={32} />
          <h3>Loading Business Profile...</h3>
          <p>Please wait while we fetch your business dashboard data</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="professional-profile-container">
        <div className="profile-error">
          <AlertCircle size={48} className="text-red-500" />
          <h3>{error || "Profile not found"}</h3>
          <p>We couldn't load your business profile. Please try again.</p>
          {isOwner && (
            <button onClick={() => fetchProfile()} className="btn btn-primary">
              <Clock size={16} />
              Try Again
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="professional-profile-container">
      {/* ✅ FIXED: CLEAN SIMPLE HERO SECTION */}
      <section className="profile-header-section">
        <div className="profile-header-content">
          {/* Avatar Section */}
          <div className="profile-avatar-section">
            <div className="avatar-wrapper">
              {profile.avatar || profile.avatarUrl ? (
                <img 
                  src={profile.avatarUrl || getImageUrl(profile.avatar, 'avatars')}
                  alt={profile.name || 'Business Owner'}
                  className="avatar-image"
                />
              ) : (
                <div className="avatar-placeholder">
                  <User size={40} />
                </div>
              )}
              
              {isOwner && (
                <button 
                  className="avatar-edit-btn"
                  onClick={() => setActiveModal('avatar')}
                  disabled={refreshing}
                  title="Change Profile Photo"
                >
                  <Camera size={16} />
                </button>
              )}
            </div>
          </div>

          {/* ✅ SIMPLIFIED: Business Info - Only Essential Information */}
          <div className="profile-info-section">
            <div className="profile-name-section">
              <h1 className="profile-name">{profile.name || 'Business Owner'}</h1>
              <h2 className="profile-company">{profile.companyName || 'Your Business'}</h2>
              
              {/* ✅ CLEANED: Only Essential Meta Info */}
              <div className="profile-meta-info">
                {profile.industry && (
                  <div className="meta-item">
                    <Star size={16} />
                    <span>{profile.industry}</span>
                  </div>
                )}
                {(profile.companyAddress || profile.contact?.address) && (
                  <div className="meta-item">
                    <MapPin size={16} />
                    <span>{profile.companyAddress || profile.contact?.address}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ✅ FIXED: Properly Sized Action Buttons */}
        {isOwner && (
          <div className="profile-action-buttons">
            <button 
              className="btn btn-primary"
              onClick={() => navigate('/post-job')}
            >
              <Plus size={18} />
              Post New Job
            </button>
            <button 
              className="btn btn-secondary"
              onClick={() => navigate('/manage-jobs')}
            >
              <Settings size={18} />
              Manage Jobs ({postedJobs.length})
            </button>
          </div>
        )}

        {/* ✅ ENHANCED: Clean Stats Section */}
        {isOwner && (
          <div className="profile-stats-section">
            <div className="stats-grid">
              <div className="stat-item">
                <div className="stat-value">{postedJobs.length}</div>
                <div className="stat-label">Jobs Posted</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">
                  {postedJobs.reduce((total, job) => total + (job.applicationCount || 0), 0)}
                </div>
                <div className="stat-label">Applications</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">
                  {postedJobs.reduce((total, job) => total + (job.views || 113), 0) || 113}
                </div>
                <div className="stat-label">Total Views</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">
                  {postedJobs.filter(job => job.status === 'active' || !job.status).length}
                </div>
                <div className="stat-label">Active Jobs</div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ✅ BUSINESS INFORMATION SECTION */}
      <section className="profile-professional-section">
        <div className="section-header">
          <div className="section-title">
            <Building size={20} />
            <h3>Business Information</h3>
          </div>
          {isOwner && (
            <button 
              className="section-edit-btn"
              onClick={() => setActiveModal('businessInfo')}
              disabled={refreshing}
            >
              <Edit3 size={16} />
              Edit
            </button>
          )}
        </div>
        
        <div className="professional-info-grid">
          <div className="info-item">
            <span className="info-label">Contact Person</span>
            <span className="info-value">{profile.name || 'Not provided'}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Company Name</span>
            <span className="info-value">{profile.companyName || 'Not specified'}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Industry</span>
            <span className="info-value">{profile.industry || 'Not specified'}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Business Email</span>
            <span className="info-value">{profile.email || 'Not provided'}</span>
          </div>
        </div>

        {profile.companyAddress && (
          <div className="professional-info-grid" style={{ marginTop: '16px' }}>
            <div className="info-item" style={{ gridColumn: '1 / -1' }}>
              <span className="info-label">Business Address</span>
              <span className="info-value">{profile.companyAddress}</span>
            </div>
          </div>
        )}
      </section>

      {/* ✅ CONTACT INFORMATION SECTION */}
      <section className="profile-contact-section">
        <div className="section-header">
          <div className="section-title">
            <Mail size={20} />
            <h3>Contact Information</h3>
          </div>
          {isOwner && (
            <button 
              className="section-edit-btn"
              onClick={() => setActiveModal('contact')}
              disabled={refreshing}
            >
              <Edit3 size={16} />
              Edit
            </button>
          )}
        </div>
        
        <div className="contact-info-grid">
          <div className="contact-item">
            <div className="contact-icon">
              <Phone size={18} />
            </div>
            <div className="contact-details">
              <span className="contact-label">Business Phone</span>
              <span className="contact-value">{profile.contact?.phone || profile.phone || 'Not provided'}</span>
            </div>
          </div>
          
          <div className="contact-item">
            <div className="contact-icon">
              <Mail size={18} />
            </div>
            <div className="contact-details">
              <span className="contact-label">Email</span>
              <span className="contact-value">{profile.email || 'Not provided'}</span>
            </div>
          </div>
          
          <div className="contact-item">
            <div className="contact-icon">
              <MapPin size={18} />
            </div>
            <div className="contact-details">
              <span className="contact-label">Business Address</span>
              <span className="contact-value">{profile.contact?.address || profile.companyAddress || 'Not provided'}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ✅ BUSINESS GALLERY SECTION */}
      <section className="profile-portfolio-section">
        <div className="section-header">
          <div className="section-title">
            <Upload size={20} />
            <h3>Business Gallery</h3>
          </div>
          {isOwner && (
            <button 
              className="section-edit-btn"
              onClick={() => setActiveModal('companyImage')}
              disabled={refreshing}
            >
              <Plus size={16} />
              Add Image
            </button>
          )}
        </div>
        
        <div className="portfolio-content">
          {profile.companyImage || profile.companyImageUrl ? (
            <div className="portfolio-grid">
              <div className="portfolio-item">
                <div className="portfolio-image">
                  <img 
                    src={profile.companyImageUrl || getImageUrl(profile.companyImage, 'companies')}
                    alt="Business Gallery"
                    loading="lazy"
                  />
                  
                  {isOwner && (
                    <div className="portfolio-actions">
                      <button 
                        onClick={() => {
                          const imageUrl = profile.companyImageUrl || getImageUrl(profile.companyImage, 'companies');
                          if (imageUrl) window.open(imageUrl, '_blank');
                        }}
                        className="action-btn view"
                        title="View Image"
                      >
                        <Eye size={16} />
                      </button>
                      <button 
                        onClick={handleDeleteCompanyImage}
                        disabled={uploading.deleteCompanyImage}
                        className="action-btn delete"
                        title="Delete Image"
                      >
                        {uploading.deleteCompanyImage ? <Loader className="animate-spin" size={16} /> : <Trash2 size={16} />}
                      </button>
                    </div>
                  )}
                </div>
                <div className="portfolio-info">
                  <h4>Business Showcase</h4>
                  <p>Visual representation of your business</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <Building size={48} />
              <h4>No business images yet</h4>
              <p>{isViewOnly ? 'No images available' : 'Add images to showcase your business to potential professionals'}</p>
              {isOwner && (
                <button 
                  onClick={() => setActiveModal('companyImage')}
                  className="btn btn-primary"
                >
                  <Plus size={16} />
                  Add Business Image
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ✅ RECENT JOB POSTS SECTION */}
      {isOwner && (
        <section className="profile-applications-section">
          <div className="section-header">
            <div className="section-title">
              <Briefcase size={20} />
              <h3>Recent Job Posts</h3>
            </div>
            {postedJobs.length > 0 && (
              <button 
                className="btn-text"
                onClick={() => navigate('/manage-jobs')}
              >
                View All ({postedJobs.length})
              </button>
            )}
          </div>
          
          <div className="applications-content">
            {postedJobs.length > 0 ? (
              <div className="applications-list">
                {postedJobs.slice(0, 3).map(job => (
                  <div 
                    key={job._id} 
                    className="application-item"
                    onClick={() => navigate(`/jobs/${job._id}`)}
                  >
                    <div className="application-header">
                      <div className="job-info">
                        <h4>{job.title}</h4>
                        <span className="company-name">
                          {job.applicationCount || 0} applications received
                        </span>
                      </div>
                      <div className={`status-badge status-${getJobStatusColor(job.status)}`}>
                        {(job.status || 'active').charAt(0).toUpperCase() + (job.status || 'active').slice(1)}
                      </div>
                    </div>
                    <div className="application-meta">
                      <span className="budget">
                        ₹{job.budget?.min?.toLocaleString('en-IN') || '20,000'} - ₹{job.budget?.max?.toLocaleString('en-IN') || '25,000'}
                      </span>
                      <span className="time-ago">
                        {formatTimeAgo(job.createdAt)}
                      </span>
                      <span className="views">
                        <Eye size={12} />
                        {job.views || 113} views
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <Briefcase size={48} />
                <h4>No jobs posted yet</h4>
                <p>Start posting jobs to find perfect professionals for your projects</p>
                <button 
                  onClick={() => navigate('/post-job')}
                  className="btn btn-primary"
                >
                  <PlusCircle size={16} />
                  Post Your First Job
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ✅ FIXED: Modals */}
      {activeModal && isOwner && (
        <ProfileModal
          title={getModalTitle(activeModal)}
          onClose={() => setActiveModal(null)}
        >
          {renderModalContent(activeModal)}
        </ProfileModal>
      )}
    </div>
  );

  function getModalTitle(modalType) {
    const titles = {
      avatar: 'Update Profile Photo',
      contact: 'Edit Contact Information',
      businessInfo: 'Edit Business Information',
      companyImage: 'Add Business Image'
    };
    return titles[modalType] || 'Edit';
  }

  function renderModalContent(modalType) {
    switch(modalType) {
      case 'avatar':
        return <AvatarUploadForm onUpload={handleFileUpload} uploading={uploading.avatar} />;
      case 'contact':
        return <ContactForm profile={profile} onSave={handleUpdateProfile} uploading={uploading.update} />;
      case 'businessInfo':
        return <BusinessInfoForm profile={profile} onSave={handleUpdateProfile} uploading={uploading.update} />;
      case 'companyImage':
        return <CompanyImageForm onUpload={handleFileUpload} uploading={uploading.companyImage} />;
      default:
        return null;
    }
  }
};

// ✅ ENHANCED: Modal Component
const ProfileModal = ({ title, onClose, children }) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="modal-content">
          {children}
        </div>
      </div>
    </div>
  );
};

// ✅ ENHANCED FORM COMPONENTS
const AvatarUploadForm = ({ onUpload, uploading }) => {
  const [file, setFile] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (file) {
      onUpload(file, 'avatar');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="form">
      <div className="file-upload">
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files[0])}
          id="avatar-upload"
          className="file-input"
        />
        <label htmlFor="avatar-upload" className="file-label">
          <Upload size={24} />
          <span>Choose profile photo</span>
          <small>JPG, PNG or GIF (max 5MB)</small>
        </label>
        {file && (
          <div className="file-selected">
            <CheckCircle size={16} />
            <span>{file.name}</span>
          </div>
        )}
      </div>

      <div className="form-actions">
        <button 
          type="submit" 
          className="btn btn-primary"
          disabled={!file || uploading}
        >
          {uploading ? <Loader className="animate-spin" size={16} /> : <Save size={16} />}
          {uploading ? 'Uploading...' : 'Update Photo'}
        </button>
      </div>
    </form>
  );
};

const ContactForm = ({ profile, onSave, uploading }) => {
  const [formData, setFormData] = useState({
    'contact.phone': profile.contact?.phone || '',
    'contact.address': profile.contact?.address || profile.companyAddress || '',
    'contact.socials.facebook': profile.contact?.socials?.facebook || '',
    'contact.socials.instagram': profile.contact?.socials?.instagram || ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      contact: {
        phone: formData['contact.phone'].trim(),
        address: formData['contact.address'].trim(),
        socials: {
          facebook: formData['contact.socials.facebook'].trim(),
          instagram: formData['contact.socials.instagram'].trim()
        }
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="form">
      <div className="form-grid">
        <div className="form-field">
          <label>Business Phone</label>
          <input
            type="tel"
            value={formData['contact.phone']}
            onChange={(e) => setFormData({...formData, 'contact.phone': e.target.value})}
            placeholder="Your business phone number"
          />
        </div>
        <div className="form-field">
          <label>Facebook Page</label>
          <input
            type="url"
            value={formData['contact.socials.facebook']}
            onChange={(e) => setFormData({...formData, 'contact.socials.facebook': e.target.value})}
            placeholder="https://facebook.com/yourpage"
          />
        </div>
        <div className="form-field form-field-full">
          <label>Business Address</label>
          <textarea
            value={formData['contact.address']}
            onChange={(e) => setFormData({...formData, 'contact.address': e.target.value})}
            placeholder="Your complete business address"
            rows="3"
          />
        </div>
        <div className="form-field">
          <label>Instagram Profile</label>
          <input
            type="url"
            value={formData['contact.socials.instagram']}
            onChange={(e) => setFormData({...formData, 'contact.socials.instagram': e.target.value})}
            placeholder="https://instagram.com/yourprofile"
          />
        </div>
      </div>

      <div className="form-actions">
        <button 
          type="submit" 
          className="btn btn-primary"
          disabled={uploading}
        >
          {uploading ? <Loader className="animate-spin" size={16} /> : <Save size={16} />}
          Save Changes
        </button>
      </div>
    </form>
  );
};

const BusinessInfoForm = ({ profile, onSave, uploading }) => {
  const [formData, setFormData] = useState({
    name: profile.name || '',
    companyName: profile.companyName || '',
    industry: profile.industry || '',
    companyAddress: profile.companyAddress || '',
    bio: profile.bio || ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="form">
      <div className="form-grid">
        <div className="form-field">
          <label>Contact Person Name *</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            placeholder="Your full name"
            required
          />
        </div>
        <div className="form-field">
          <label>Company Name *</label>
          <input
            type="text"
            value={formData.companyName}
            onChange={(e) => setFormData({...formData, companyName: e.target.value})}
            placeholder="Your company name"
            required
          />
        </div>
        <div className="form-field">
          <label>Industry</label>
          <select
            value={formData.industry}
            onChange={(e) => setFormData({...formData, industry: e.target.value})}
          >
            <option value="">Select Industry</option>
            <option value="Jewellery">Jewellery</option>
            <option value="Textiles">Textiles</option>
            <option value="Manufacturing">Manufacturing</option>
            <option value="Retail">Retail</option>
            <option value="Services">Services</option>
            <option value="Technology">Technology</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div className="form-field form-field-full">
          <label>Business Address</label>
          <textarea
            value={formData.companyAddress}
            onChange={(e) => setFormData({...formData, companyAddress: e.target.value})}
            placeholder="Your business address"
            rows="3"
          />
        </div>
        <div className="form-field form-field-full">
          <label>About Your Business</label>
          <textarea
            value={formData.bio}
            onChange={(e) => setFormData({...formData, bio: e.target.value})}
            placeholder="Tell professionals about your business..."
            rows="4"
          />
        </div>
      </div>

      <div className="form-actions">
        <button 
          type="submit" 
          className="btn btn-primary"
          disabled={uploading}
        >
          {uploading ? <Loader className="animate-spin" size={16} /> : <Save size={16} />}
          Save Changes
        </button>
      </div>
    </form>
  );
};

const CompanyImageForm = ({ onUpload, uploading }) => {
  const [file, setFile] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (file) {
      onUpload(file, 'companyImage');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="form">
      <div className="file-upload">
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files[0])}
          id="company-image-upload"
          className="file-input"
        />
        <label htmlFor="company-image-upload" className="file-label">
          <Upload size={24} />
          <span>Choose business image</span>
          <small>JPG, PNG or GIF (max 5MB)</small>
        </label>
        {file && (
          <div className="file-selected">
            <CheckCircle size={16} />
            <span>{file.name}</span>
          </div>
        )}
      </div>

      <div className="form-actions">
        <button 
          type="submit" 
          className="btn btn-primary"
          disabled={!file || uploading}
        >
          {uploading ? <Loader className="animate-spin" size={16} /> : <Plus size={16} />}
          {uploading ? 'Uploading...' : 'Add to Gallery'}
        </button>
      </div>
    </form>
  );
};

export default ClientProfile;
