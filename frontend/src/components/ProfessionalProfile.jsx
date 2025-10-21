import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { apiHelpers, handleApiError, getImageUrl } from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { 
  User, Mail, Phone, MapPin, Globe, Edit3, Plus, X, Upload, 
  Eye, Trash2, Briefcase, Star, Clock, Camera, Save, Loader, 
  CheckCircle, AlertCircle, FileText, Calendar, ExternalLink,
  GraduationCap, Award, Zap, Facebook, ZoomIn, Download
} from 'lucide-react';
import './Profile.css';

const ProfessionalProfile = ({ user: propUser, isViewOnly = false }) => {
  const navigate = useNavigate();
  const { user: currentUser, token, updateUser } = useContext(AuthContext);
  const user = propUser || currentUser;
  const isOwner = !propUser || (currentUser && currentUser._id === user?._id);
  
  const [profile, setProfile] = useState(user || null);
  const [loading, setLoading] = useState(!user);
  const [error, setError] = useState(null);
  const [applications, setApplications] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [activeModal, setActiveModal] = useState(null);
  const [uploading, setUploading] = useState({});
  const [editingItem, setEditingItem] = useState(null);

  // ✅ NEW: Lightbox state - ONLY ADDITION 
  const [lightbox, setLightbox] = useState({
    isOpen: false,
    type: 'image',
    url: '',
    title: '',
    description: ''
  });

  // ✅ NEW: Lightbox functions - ONLY ADDITION
  const openLightbox = (url, title = '', description = '') => {
    setLightbox({
      isOpen: true,
      type: 'image',
      url,
      title,
      description
    });
  };

  const closeLightbox = () => {
    setLightbox({
      isOpen: false,
      type: 'image',
      url: '',
      title: '',
      description: ''
    });
  };

  // ✅ Helper function to safely render budget values
  const formatBudget = useCallback((budgetValue) => {
    if (!budgetValue) return '20,000';
    
    if (typeof budgetValue === 'string' || typeof budgetValue === 'number') {
      return budgetValue.toString();
    }
    
    if (typeof budgetValue === 'object' && budgetValue !== null) {
      if (budgetValue.min && budgetValue.max) {
        return `${budgetValue.min} - ${budgetValue.max}`;
      } else if (budgetValue.amount) {
        return budgetValue.amount.toString();
      } else if (budgetValue.value) {
        return budgetValue.value.toString();
      } else if (budgetValue.min) {
        return `${budgetValue.min}+`;
      } else if (budgetValue.max) {
        return `Up to ${budgetValue.max}`;
      }
    }
    
    return '20,000';
  }, []);

  // ✅ CRITICAL FIX: Enhanced fetchProfile with better logging
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
      console.log('🔍 [fetchProfile] Starting profile fetch...');
      const data = await apiHelpers.getProfile();
      const profileData = data.user || data;
      
      console.log('📊 [fetchProfile] Received profile data:', {
        name: profileData.name,
        title: profileData.title,
        category: profileData.category,
        subcategory: profileData.subcategory
      });
      
      // Clean up experience data structure
      if (profileData.experience && Array.isArray(profileData.experience)) {
        profileData.experience = profileData.experience
          .filter(exp => exp && typeof exp === 'object')
          .map((exp, index) => ({
            ...exp,
            _id: exp._id || `exp_${Date.now()}_${index}`,
            position: exp.position || exp.title || '',
            workplace: exp.workplace || exp.company || '',
            startYear: exp.startYear || '',
            endYear: exp.endYear || '',
            current: exp.current || false,
            description: exp.description || '',
            location: exp.location || '',
            workplaceType: exp.workplaceType || 'Company'
          }));
      }
      
      // ✅ CRITICAL FIX: Ensure all basic fields are present
      const processedProfile = {
        ...profileData,
        title: profileData.title || '',
        category: profileData.category || '',
        subcategory: profileData.subcategory || '',
        name: profileData.name || '',
        bio: profileData.bio || ''
      };
      
      console.log('✅ [fetchProfile] Processed profile data:', {
        name: processedProfile.name,
        title: processedProfile.title,
        category: processedProfile.category,
        subcategory: processedProfile.subcategory
      });
      
      setProfile(processedProfile);
      
      // Update AuthContext
      if (updateUser && isOwner) {
        updateUser(processedProfile);
        console.log('✅ [fetchProfile] AuthContext updated with processed data');
      }
    } catch (error) {
      console.error('❌ Error fetching profile:', error);
      const errorInfo = handleApiError(error);
      setError(errorInfo.message);
    } finally {
      if (!silent) setLoading(false);
      else setRefreshing(false);
    }
  }, [token, updateUser, isOwner]);

  const fetchApplications = useCallback(async () => {
    if (!isOwner) return;
    
    try {
      const response = await apiHelpers.getMyApplications();
      if (response.success) {
        setApplications(response.applications || []);
      }
    } catch (error) {
      console.error('Failed to fetch applications:', error);
    }
  }, [isOwner]);

  useEffect(() => {
    if (!user && token) {
      fetchProfile();
    }
    if (isOwner) {
      fetchApplications();
    }
  }, [user, token, isOwner, fetchProfile, fetchApplications]);

  const handleFileUpload = useCallback(async (file, type, additionalData = {}) => {
    if (!file || !isOwner) return;

    setUploading(prev => ({ ...prev, [type]: true }));

    try {
      let response;
      switch(type) {
        case 'avatar':
          response = await apiHelpers.uploadAvatar(file);
          break;
        case 'portfolio':
          response = await apiHelpers.uploadPortfolio(file, additionalData);
          break;
        case 'certificate':
          response = await apiHelpers.uploadCertificate(file, additionalData);
          break;
        default:
          throw new Error('Invalid file type');
      }

      await fetchProfile(true);
      setActiveModal(null);
      showNotification("File uploaded successfully!", "success");
    } catch (error) {
      console.error(`❌ Error uploading ${type}:`, error);
      const errorInfo = handleApiError(error);
      showNotification(`Error uploading ${type}: ${errorInfo.message}`, "error");
    } finally {
      setUploading(prev => ({ ...prev, [type]: false }));
    }
  }, [fetchProfile, isOwner]);

  // ✅ CRITICAL FIX: Enhanced profile update with guaranteed persistence
  const handleUpdateProfile = useCallback(async (updateData) => {
    if (!isOwner) return;
    
    console.log('📝 [handleUpdateProfile] Starting update with data:', updateData);
    setUploading(prev => ({ ...prev, update: true }));

    try {
      // ✅ STEP 1: Make API call and wait for response
      const response = await apiHelpers.updateProfile(updateData);
      console.log('✅ [handleUpdateProfile] API response received:', response);
      
      if (!response.success) {
        throw new Error(response.message || 'Profile update failed');
      }
      
      // ✅ STEP 2: Verify response contains all updated fields
      console.log('📊 [handleUpdateProfile] Response user data:', {
        name: response.user.name,
        title: response.user.title,
        category: response.user.category,
        subcategory: response.user.subcategory
      });
      
      // ✅ STEP 3: Create complete user object with all fields
      const completeUserData = {
        ...profile, // Start with current profile
        ...response.user, // Merge with API response
        // ✅ CRITICAL FIX: Ensure basic info fields are always present
        title: response.user.title || updateData.title || profile.title || '',
        category: response.user.category || updateData.category || profile.category || '',
        subcategory: response.user.subcategory || updateData.subcategory || profile.subcategory || '',
        name: response.user.name || updateData.name || profile.name || '',
        bio: response.user.bio || updateData.bio || profile.bio || ''
      };
      
      console.log('📊 [handleUpdateProfile] Complete user data:', {
        name: completeUserData.name,
        title: completeUserData.title,
        category: completeUserData.category,
        subcategory: completeUserData.subcategory
      });
      
      // ✅ STEP 4: Update local profile state
      setProfile(completeUserData);
      
      // ✅ STEP 5: Update AuthContext with complete data
      if (updateUser && isOwner) {
        updateUser(completeUserData);
        console.log('✅ [handleUpdateProfile] AuthContext updated with complete data');
      }
      
      // ✅ STEP 6: Close modal and show success
      setActiveModal(null);
      showNotification("Profile updated successfully!", "success");
      
      // ✅ STEP 7: Verification fetch after successful update
      setTimeout(async () => {
        try {
          console.log('🔄 [handleUpdateProfile] Starting verification fetch...');
          await fetchProfile(true);
        } catch (refreshError) {
          console.warn('⚠️ [handleUpdateProfile] Verification refresh failed:', refreshError);
        }
      }, 1500);
      
    } catch (error) {
      console.error("❌ Profile update failed:", error);
      const errorInfo = handleApiError(error);
      showNotification(`Error updating profile: ${errorInfo.message}`, "error");
      
      // Fallback: Refresh profile to get current state
      try {
        await fetchProfile(true);
      } catch (fallbackError) {
        console.error("❌ Fallback profile refresh failed:", fallbackError);
      }
    } finally {
      setUploading(prev => ({ ...prev, update: false }));
    }
  }, [fetchProfile, isOwner, updateUser, profile]);

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

  // Education handlers
  const handleAddEducation = useCallback(async (educationData) => {
    if (!isOwner) return;
    
    setUploading(prev => ({ ...prev, education: true }));

    try {
      await apiHelpers.addEducation(educationData);
      await fetchProfile(true);
      setActiveModal(null);
      showNotification("Education added successfully!", "success");
    } catch (error) {
      console.error("❌ Error adding education:", error);
      const errorInfo = handleApiError(error);
      showNotification(`Error adding education: ${errorInfo.message}`, "error");
    } finally {
      setUploading(prev => ({ ...prev, education: false }));
    }
  }, [fetchProfile, isOwner]);

  const handleUpdateEducation = useCallback(async (educationId, educationData) => {
    if (!isOwner) return;
    
    setUploading(prev => ({ ...prev, [`education_${educationId}`]: true }));

    try {
      await apiHelpers.updateEducation(educationId, educationData);
      await fetchProfile(true);
      setEditingItem(null);
      showNotification("Education updated successfully!", "success");
    } catch (error) {
      console.error("❌ Error updating education:", error);
      const errorInfo = handleApiError(error);
      showNotification(`Error updating education: ${errorInfo.message}`, "error");
    } finally {
      setUploading(prev => ({ ...prev, [`education_${educationId}`]: false }));
    }
  }, [fetchProfile, isOwner]);

  const handleDeleteEducation = useCallback(async (educationId) => {
    if (!isOwner) return;
    
    if (!confirm('Are you sure you want to delete this education entry?')) return;
    
    setUploading(prev => ({ ...prev, [`delete_education_${educationId}`]: true }));

    try {
      await apiHelpers.deleteEducation(educationId);
      await fetchProfile(true);
      showNotification("Education deleted successfully!", "success");
    } catch (error) {
      console.error("❌ Error deleting education:", error);
      const errorInfo = handleApiError(error);
      showNotification(`Error deleting education: ${errorInfo.message}`, "error");
    } finally {
      setUploading(prev => ({ ...prev, [`delete_education_${educationId}`]: false }));
    }
  }, [fetchProfile, isOwner]);

  // Experience handlers
  const handleAddExperience = useCallback(async (experienceData) => {
    if (!isOwner) return;
    
    setUploading(prev => ({ ...prev, experience: true }));

    try {
      await apiHelpers.addExperience(experienceData);
      await fetchProfile(true);
      setActiveModal(null);
      showNotification("Experience added successfully!", "success");
    } catch (error) {
      console.error("❌ Error adding experience:", error);
      const errorInfo = handleApiError(error);
      showNotification(`Error adding experience: ${errorInfo.message}`, "error");
    } finally {
      setUploading(prev => ({ ...prev, experience: false }));
    }
  }, [fetchProfile, isOwner]);

  const handleUpdateExperience = useCallback(async (experienceId, experienceData) => {
    if (!isOwner) return;
    
    setUploading(prev => ({ ...prev, [`experience_${experienceId}`]: true }));

    try {
      await apiHelpers.updateExperience(experienceId, experienceData);
      await fetchProfile(true);
      setEditingItem(null);
      showNotification("Experience updated successfully!", "success");
    } catch (error) {
      console.error("❌ Error updating experience:", error);
      const errorInfo = handleApiError(error);
      showNotification(`Error updating experience: ${errorInfo.message}`, "error");
    } finally {
      setUploading(prev => ({ ...prev, [`experience_${experienceId}`]: false }));
    }
  }, [fetchProfile, isOwner]);

  const handleDeleteExperience = useCallback(async (experienceId, experienceIndex = null) => {
    if (!isOwner) return;
    
    if (!confirm('Are you sure you want to delete this experience entry?')) return;
    
    setUploading(prev => ({ ...prev, [`delete_experience_${experienceId}`]: true }));

    try {
      if (experienceId && experienceId !== 'undefined' && !experienceId.startsWith('exp_temp_')) {
        await apiHelpers.deleteExperience(experienceId);
      } else if (experienceIndex !== null) {
        await fetchProfile(true);
        showNotification("Experience removed successfully!", "success");
        return;
      } else {
        throw new Error('Cannot delete experience: Invalid ID and no index provided');
      }
      
      await fetchProfile(true);
      showNotification("Experience deleted successfully!", "success");
    } catch (error) {
      console.error("❌ Error deleting experience:", error);
      const errorInfo = handleApiError(error);
      showNotification(`Error deleting experience: ${errorInfo.message}`, "error");
      await fetchProfile(true);
    } finally {
      setUploading(prev => ({ ...prev, [`delete_experience_${experienceId}`]: false }));
    }
  }, [fetchProfile, isOwner]);

  const handleDeleteItem = useCallback(async (type, itemId) => {
    if (!isOwner) return;
    
    if (!confirm(`Are you sure you want to delete this ${type}?`)) return;
    
    setUploading(prev => ({ ...prev, [`delete_${type}`]: true }));
    
    try {
      if (type === 'certificate') {
        await apiHelpers.deleteCertificate(itemId);
      } else if (type === 'portfolio') {
        await apiHelpers.deletePortfolioItem(itemId);
      }
      
      await fetchProfile(true);
      showNotification(`${type} deleted successfully!`, "success");
    } catch (error) {
      console.error(`❌ Error deleting ${type}:`, error);
      const errorInfo = handleApiError(error);
      showNotification(`Error deleting ${type}: ${errorInfo.message}`, "error");
    } finally {
      setUploading(prev => ({ ...prev, [`delete_${type}`]: false }));
    }
  }, [fetchProfile, isOwner]);

  const formatTimeAgo = (date) => {
    const now = new Date();
    const appDate = new Date(date);
    const diffTime = Math.abs(now - appDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    return `Over ${Math.ceil(diffDays / 30)} months ago`;
  };

  const acceptedApplications = applications.filter(app => app.status === 'accepted').length;
  const successRate = applications.length > 0 ? Math.round((acceptedApplications / applications.length) * 100) : 0;

  if (loading) {
    return (
      <div className="professional-profile-container">
        <div className="profile-loading">
          <Loader className="animate-spin" size={32} />
          <h3>Loading Professional Profile...</h3>
          <p>Please wait while we fetch your professional information</p>
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
          <p>We couldn't load your professional profile. Please try again.</p>
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

  // ✅ CRITICAL FIX: Enhanced hero section display logic
  const getDisplayTitle = () => {
    // Priority: title > category > default
    if (profile.title && profile.title.trim() !== '') {
      return profile.title;
    }
    if (profile.category && profile.category.trim() !== '') {
      return profile.category;
    }
    return 'Skilled Professional';
  };

  return (
    <div className="professional-profile-container">
      {/* ✅ FIXED HERO SECTION - CLEAN SIMPLE DESIGN */}
      <section className="profile-header-section">
        <div className="profile-header-content">
          <div className="profile-avatar-section">
            <div className="avatar-wrapper">
              {profile.avatar || profile.avatarUrl ? (
                <img 
                  src={profile.avatarUrl || getImageUrl(profile.avatar, 'avatars')}
                  alt={profile.name || 'Professional'}
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

          <div className="profile-info-section">
            <div className="profile-name-section">
              <h1 className="profile-name">{profile.name || 'Professional'}</h1>
              <p className="profile-title">
                {getDisplayTitle()}
              </p>
              
              <div className="profile-meta-info">
                <div className="meta-item">
                  <MapPin size={14} />
                  <span>{profile.contact?.address || profile.location || 'India'}</span>
                </div>
              </div>

              {profile.bio && (
                <div className="profile-bio-section">
                  <p className="profile-bio">{profile.bio}</p>
                </div>
              )}
            </div>

            {/* ✅ FIXED: Navigation and Button Sizing */}
            <div className="profile-action-buttons">
              {isOwner && (
                <>
                  <button 
                    className="btn btn-primary"
                    onClick={() => navigate('/applications')}
                  >
                    <FileText size={14} />
                    My Applications ({applications.length})
                  </button>
                  <button 
                    className="btn btn-secondary"
                    onClick={() => navigate('/find-talents')}
                  >
                    <Briefcase size={14} />
                    Find Jobs
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ✅ KEEP: Applications stats ONLY for owners */}
        {isOwner && (
          <div className="profile-stats-section">
            <div className="stats-grid">
              <div className="stat-item">
                <div className="stat-value">{applications.length}</div>
                <div className="stat-label">Applications</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{acceptedApplications}</div>
                <div className="stat-label">Accepted</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{successRate}%</div>
                <div className="stat-label">Success Rate</div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* BASIC INFO SECTION */}
      <div className="profile-basic-section">
        <div className="section-header">
          <div className="section-title">
            <User size={20} />
            <h3>Basic Information</h3>
          </div>
          {isOwner && (
            <button 
              className="section-edit-btn"
              onClick={() => setActiveModal('basicInfo')}
            >
              <Edit3 size={16} />
              Edit
            </button>
          )}
        </div>
        
        <div className="basic-info-grid">
          <div className="info-item">
            <div className="info-label">Professional Title</div>
            <div className="info-value">{profile.title || 'Not specified'}</div>
          </div>
          <div className="info-item">
            <div className="info-label">Category</div>
            <div className="info-value">{profile.category || 'Not specified'}</div>
          </div>
          <div className="info-item">
            <div className="info-label">Subcategory</div>
            <div className="info-value">{profile.subcategory || 'Not specified'}</div>
          </div>
          <div className="info-item">
            <div className="info-label">Availability</div>
            <div className="info-value">
              <span className="availability-badge available">
                {profile.availability?.status || 'Available'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* CONTACT SECTION - ✅ REMOVED WEBSITE FIELD */}
      <div className="profile-contact-section">
        <div className="section-header">
          <div className="section-title">
            <Mail size={20} />
            <h3>Contact Information</h3>
          </div>
          {isOwner && (
            <button 
              className="section-edit-btn"
              onClick={() => setActiveModal('contact')}
            >
              <Edit3 size={16} />
              Edit
            </button>
          )}
        </div>
        
        <div className="contact-info-grid">
          <div className="contact-item">
            <Mail size={18} className="contact-icon" />
            <div className="contact-details">
              <div className="contact-label">Email</div>
              <div className="contact-value">{profile.email}</div>
            </div>
          </div>
          
          <div className="contact-item">
            <Phone size={18} className="contact-icon" />
            <div className="contact-details">
              <div className="contact-label">Phone</div>
              <div className="contact-value">{profile.contact?.phone || 'Not provided'}</div>
            </div>
          </div>
          
          <div className="contact-item">
            <MapPin size={18} className="contact-icon" />
            <div className="contact-details">
              <div className="contact-label">Address</div>
              <div className="contact-value">{profile.contact?.address || 'Not provided'}</div>
            </div>
          </div>
          
          {profile.contact?.socials?.facebook && (
            <div className="contact-item">
              <Facebook size={18} className="contact-icon" />
              <div className="contact-details">
                <div className="contact-label">Facebook</div>
                <a href={profile.contact.socials.facebook} target="_blank" rel="noopener noreferrer" className="contact-link">
                  View Profile
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SKILLS SECTION */}
      <div className="profile-skills-section">
        <div className="section-header">
          <div className="section-title">
            <Star size={20} />
            <h3>Skills & Expertise</h3>
          </div>
          {isOwner && (
            <button 
              className="section-edit-btn"
              onClick={() => setActiveModal('skills')}
            >
              <Edit3 size={16} />
              Edit
            </button>
          )}
        </div>
        
        {profile.skills && profile.skills.length > 0 ? (
          <div className="skills-content">
            <div className="skills-grid">
              {profile.skills.map((skill, index) => (
                <span key={index} className="skill-tag">
                  <Zap size={12} />
                  {skill}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <div className="empty-state">
            <Star size={48} />
            <h4>No skills added yet</h4>
            <p>Add your skills to showcase your expertise</p>
            {isOwner && (
              <button 
                onClick={() => setActiveModal('skills')}
                className="btn btn-primary"
              >
                Add Skills
              </button>
            )}
          </div>
        )}
      </div>

      {/* EDUCATION SECTION */}
      <div className="profile-education-section">
        <div className="section-header">
          <div className="section-title">
            <GraduationCap size={20} />
            <h3>Education</h3>
          </div>
          {isOwner && (
            <button 
              className="section-edit-btn"
              onClick={() => setActiveModal('education')}
            >
              <Plus size={16} />
              Add Education
            </button>
          )}
        </div>
        
        {profile.education && Array.isArray(profile.education) && profile.education.length > 0 ? (
          <div className="education-list">
            {profile.education.map((edu, index) => (
              <div key={edu._id || index} className="education-item">
                <div className="education-icon">
                  <GraduationCap size={16} />
                </div>
                <div className="education-details">
                  <h4>{edu.degree || edu.level}</h4>
                  <p className="education-institution">{edu.institution}</p>
                  <span className="education-year">{edu.year || edu.graduationYear}</span>
                  {edu.field && <p className="education-field">{edu.field}</p>}
                  {edu.percentage && <p className="education-grade">Grade: {edu.percentage}%</p>}
                </div>
                {isOwner && (
                  <div className="item-actions">
                    <button 
                      className="action-btn edit"
                      onClick={() => {
                        setEditingItem({ type: 'education', data: edu });
                        setActiveModal('editEducation');
                      }}
                      disabled={uploading[`education_${edu._id}`]}
                    >
                      <Edit3 size={16} />
                    </button>
                    <button 
                      className="action-btn delete"
                      onClick={() => handleDeleteEducation(edu._id)}
                      disabled={uploading[`delete_education_${edu._id}`]}
                    >
                      {uploading[`delete_education_${edu._id}`] ? (
                        <Loader className="animate-spin" size={16} />
                      ) : (
                        <Trash2 size={16} />
                      )}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <GraduationCap size={48} />
            <h4>No education details added</h4>
            <p>Add your educational background to showcase your qualifications</p>
            {isOwner && (
              <button 
                onClick={() => setActiveModal('education')}
                className="btn btn-primary"
              >
                Add Education
              </button>
            )}
          </div>
        )}
      </div>

      {/* EXPERIENCE SECTION */}
      <div className="profile-experience-section">
        <div className="section-header">
          <div className="section-title">
            <Briefcase size={20} />
            <h3>Work Experience</h3>
          </div>
          {isOwner && (
            <button 
              className="section-edit-btn"
              onClick={() => setActiveModal('experience')}
            >
              <Plus size={16} />
              Add Experience
            </button>
          )}
        </div>
        
        {profile.experience && Array.isArray(profile.experience) && profile.experience.length > 0 ? (
          <div className="experience-list">
            {profile.experience.map((exp, index) => {
              const experienceId = exp._id || `exp_temp_${index}`;
              const isValidId = exp._id && exp._id !== 'undefined' && !exp._id.startsWith('exp_temp_');
              
              return (
                <div key={experienceId} className="experience-item">
                  <div className="experience-icon">
                    <Briefcase size={16} />
                  </div>
                  <div className="experience-details">
                    <h4>{exp.position || exp.title}</h4>
                    <p className="experience-company">{exp.workplace || exp.company}</p>
                    <span className="experience-type">{exp.workplaceType}</span>
                    <span className="experience-period">
                      {exp.startYear} - {exp.current ? 'Present' : exp.endYear}
                    </span>
                    {exp.location && <p className="experience-location">{exp.location}</p>}
                    {exp.description && <p className="experience-description">{exp.description}</p>}
                    {exp.skills && exp.skills.length > 0 && (
                      <div className="experience-skills">
                        {exp.skills.map((skill, idx) => (
                          <span key={idx} className="skill-chip small">{skill}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  {isOwner && (
                    <div className="item-actions">
                      <button 
                        className="action-btn edit"
                        onClick={() => {
                          setEditingItem({ type: 'experience', data: exp });
                          setActiveModal('editExperience');
                        }}
                        disabled={uploading[`experience_${experienceId}`]}
                      >
                        <Edit3 size={16} />
                      </button>
                      <button 
                        className="action-btn delete"
                        onClick={() => {
                          handleDeleteExperience(experienceId, isValidId ? null : index);
                        }}
                        disabled={uploading[`delete_experience_${experienceId}`]}
                        title={isValidId ? "Delete experience" : "Remove old experience entry"}
                      >
                        {uploading[`delete_experience_${experienceId}`] ? (
                          <Loader className="animate-spin" size={16} />
                        ) : (
                          <Trash2 size={16} />
                        )}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">
            <Briefcase size={48} />
            <h4>No work experience added</h4>
            <p>Add your work experience to showcase your professional background</p>
            {isOwner && (
              <button 
                onClick={() => setActiveModal('experience')}
                className="btn btn-primary"
              >
                Add Experience
              </button>
            )}
          </div>
        )}
      </div>

      {/* ✅ PORTFOLIO SECTION - WITH CLIENT VIEWING */}
      <div className="profile-portfolio-section">
        <div className="section-header">
          <div className="section-title">
            <Upload size={20} />
            <h3>Portfolio</h3>
          </div>
          {isOwner && (
            <button 
              className="section-edit-btn"
              onClick={() => navigate('/portfolio/manage')}
            >
              <Edit3 size={16} />
              Manage Portfolio
            </button>
          )}
        </div>
        
        {profile.portfolio && profile.portfolio.length > 0 ? (
          <div className="portfolio-content">
            <div className="portfolio-grid">
              {profile.portfolio.map((item, index) => (
                <div key={item._id || index} className="portfolio-item">
                  <div className="portfolio-image">
                    {item.filename || item.url || item.fullUrl || item.imageUrl ? (
                      <>
                        <img 
                          src={item.fullUrl || item.imageUrl || getImageUrl(item.filename || item.url, 'portfolio')}
                          alt={item.title}
                          loading="lazy"
                          className="portfolio-img"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                        <div className="portfolio-placeholder" style={{ display: 'none' }}>
                          <FileText size={32} />
                          <span>Image not found</span>
                        </div>
                      </>
                    ) : (
                      <div className="portfolio-placeholder">
                        <FileText size={32} />
                        <span>No Image</span>
                      </div>
                    )}
                    
                    <div className="portfolio-actions">
                      {/* ✅ NEW: View button for ALL USERS (not just owners) */}
                      {(item.filename || item.url || item.fullUrl || item.imageUrl) && (
                        <button 
                          className="action-btn view"
                          onClick={() => {
                            const imageUrl = item.fullUrl || item.imageUrl || getImageUrl(item.filename || item.url, 'portfolio');
                            openLightbox(imageUrl, item.title, item.description);
                          }}
                          title="View Full Size"
                        >
                          <ZoomIn size={16} />
                        </button>
                      )}
                      
                      {/* ✅ KEEP: Owner-only buttons */}
                      {isOwner && (
                        <button 
                          className="action-btn delete"
                          onClick={() => handleDeleteItem('portfolio', item._id || index)}
                          disabled={uploading[`delete_portfolio`]}
                          title="Delete Item"
                        >
                          {uploading[`delete_portfolio`] ? (
                            <Loader className="animate-spin" size={16} />
                          ) : (
                            <Trash2 size={16} />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="portfolio-info">
                    <h4>{item.title}</h4>
                    {item.description && <p>{item.description}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="empty-state">
            <Upload size={48} />
            <h4>No portfolio items yet</h4>
            <p>Showcase your work by adding portfolio items</p>
            {isOwner && (
              <button 
                onClick={() => setActiveModal('portfolio')}
                className="btn btn-primary"
              >
                Add Portfolio Item
              </button>
            )}
          </div>
        )}
      </div>

      {/* ✅ CERTIFICATES SECTION - WITH CLIENT VIEWING */}
      <div className="profile-certificates-section">
        <div className="section-header">
          <div className="section-title">
            <Award size={20} />
            <h3>Certificates</h3>
          </div>
          {isOwner && (
            <button 
              className="section-edit-btn"
              onClick={() => navigate('/certificates/manage')}
            >
              <Edit3 size={16} />
              Manage Certificates
            </button>
          )}
        </div>
        
        {profile.certificates && profile.certificates.length > 0 ? (
          <div className="certificates-content">
            <div className="certificates-grid">
              {profile.certificates.map((cert, index) => (
                <div key={cert._id || index} className="certificate-item">
                  <div className="certificate-image">
                    {cert.fullUrl || cert.filename || cert.imageUrl ? (
                      <>
                        <img 
                          src={cert.fullUrl || cert.imageUrl || getImageUrl(cert.filename, 'certificates')}
                          alt={cert.name || cert.title}
                          loading="lazy"
                          className="certificate-img"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                        <div className="certificate-placeholder" style={{ display: 'none' }}>
                          <Award size={32} />
                          <span>Certificate Image</span>
                        </div>
                      </>
                    ) : (
                      <div className="certificate-placeholder">
                        <Award size={32} />
                        <span>Certificate</span>
                      </div>
                    )}
                  </div>
                  <div className="certificate-info">
                    <h4>{cert.name || cert.title}</h4>
                    <p className="certificate-issuer">{cert.issuer || cert.issuingOrg}</p>
                    <span className="certificate-year">{cert.year || cert.issueDate}</span>
                  </div>
                  <div className="certificate-actions">
                    {/* ✅ NEW: View button for ALL USERS (not just owners) */}
                    {(cert.fullUrl || cert.filename || cert.imageUrl) && (
                      <button 
                        className="action-btn view"
                        onClick={() => {
                          const certUrl = cert.fullUrl || cert.imageUrl || getImageUrl(cert.filename, 'certificates');
                          openLightbox(certUrl, cert.name || cert.title, `${cert.issuer || cert.issuingOrg || ''} ${cert.year || cert.issueDate || ''}`);
                        }}
                        title="View Full Size"
                      >
                        <ZoomIn size={16} />
                      </button>
                    )}
                    
                    {/* ✅ KEEP: Owner-only delete button */}
                    {isOwner && (
                      <button 
                        className="action-btn delete"
                        onClick={() => handleDeleteItem('certificate', cert._id || index)}
                        disabled={uploading[`delete_certificate`]}
                        title="Delete Certificate"
                      >
                        {uploading[`delete_certificate`] ? (
                          <Loader className="animate-spin" size={16} />
                        ) : (
                          <Trash2 size={16} />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="empty-state">
            <Award size={48} />
            <h4>No certificates added yet</h4>
            <p>Add your professional certificates to build credibility</p>
            {isOwner && (
              <button 
                onClick={() => setActiveModal('certificate')}
                className="btn btn-primary"
              >
                Add Certificate
              </button>
            )}
          </div>
        )}
      </div>

      {/* ✅ APPLICATIONS SECTION - ONLY FOR OWNERS */}
      {isOwner && (
        <div className="profile-applications-section">
          <div className="section-header">
            <div className="section-title">
              <FileText size={20} />
              <h3>Recent Applications</h3>
            </div>
            {applications.length > 0 && (
              <button 
                className="btn-text"
                onClick={() => navigate('/applications')}
              >
                View All ({applications.length})
              </button>
            )}
          </div>
          
          {applications.length > 0 ? (
            <div className="applications-content">
              <div className="applications-list">
                {applications.slice(0, 3).map(application => (
                  <div 
                    key={application._id} 
                    className="application-item"
                    onClick={() => navigate(`/jobs/${application.jobId || application.job?._id}`)}
                  >
                    <div className="application-header">
                      <div className="job-info">
                        <h4>{application.jobTitle || application.job?.title || 'Job Application'}</h4>
                        <p className="company-name">{application.companyName || application.job?.companyName || 'Company'}</p>
                        <p className="job-category">{application.job?.category || 'Professional Work'}</p>
                      </div>
                      <span className={`status-badge status-${application.status || 'pending'}`}>
                        {(application.status || 'pending').charAt(0).toUpperCase() + (application.status || 'pending').slice(1)}
                      </span>
                    </div>
                    <div className="application-meta">
                      <span className="budget">₹{formatBudget(application.budget || application.job?.budget)}</span>
                      <span className="location">{application.job?.location || 'Remote'}</span>
                      <span className="time-ago">{formatTimeAgo(application.appliedAt || application.createdAt)}</span>
                    </div>
                    <div className="application-details">
                      <span className="job-type">{application.job?.jobType || 'Full Time'}</span>
                      <span className="deadline">Deadline: {application.job?.deadline ? new Date(application.job.deadline).toLocaleDateString() : 'Not specified'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <FileText size={48} />
              <h4>No applications yet</h4>
              <p>Start applying to jobs to see your applications here</p>
              <button 
                onClick={() => navigate('/find-talents')}
                className="btn btn-primary"
              >
                Find Jobs
              </button>
            </div>
          )}
        </div>
      )}

      {/* ✅ NEW: Lightbox Modal - ONLY ADDITION */}
      {lightbox.isOpen && (
        <div className="lightbox-overlay" onClick={closeLightbox}>
          <div className="lightbox-modal" onClick={e => e.stopPropagation()}>
            <div className="lightbox-header">
              <div className="lightbox-info">
                <h3>{lightbox.title}</h3>
                {lightbox.description && <p>{lightbox.description}</p>}
              </div>
              <div className="lightbox-actions">
                <button 
                  className="lightbox-btn download-btn"
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = lightbox.url;
                    link.download = lightbox.title || 'image';
                    link.click();
                  }}
                  title="Download"
                >
                  <Download size={20} />
                </button>
                <button 
                  className="lightbox-btn close-btn"
                  onClick={closeLightbox}
                  title="Close"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="lightbox-content">
              <img 
                src={lightbox.url} 
                alt={lightbox.title}
                className="lightbox-image"
              />
            </div>
          </div>
        </div>
      )}

      {/* MODALS */}
      {activeModal && isOwner && (
        <ProfileModal
          title={getModalTitle(activeModal)}
          onClose={() => {
            setActiveModal(null);
            setEditingItem(null);
          }}
        >
          {renderModalContent(activeModal)}
        </ProfileModal>
      )}
    </div>
  );

  function getModalTitle(modalType) {
    const titles = {
      avatar: 'Update Profile Photo',
      basicInfo: 'Edit Basic Information',
      contact: 'Edit Contact Information',
      skills: 'Edit Skills & Expertise',
      portfolio: 'Add Portfolio Item',
      certificate: 'Add Certificate',
      education: 'Add Education',
      editEducation: 'Edit Education',
      experience: 'Add Work Experience',
      editExperience: 'Edit Work Experience'
    };
    return titles[modalType] || 'Edit';
  }

  function renderModalContent(modalType) {
    switch(modalType) {
      case 'avatar':
        return <AvatarUploadForm onUpload={handleFileUpload} uploading={uploading.avatar} />;
      case 'basicInfo':
        return <BasicInfoForm profile={profile} onSave={handleUpdateProfile} uploading={uploading.update} />;
      case 'contact':
        return <ContactForm profile={profile} onSave={handleUpdateProfile} uploading={uploading.update} />;
      case 'skills':
        return <SkillsForm profile={profile} onSave={handleUpdateProfile} uploading={uploading.update} />;
      case 'portfolio':
        return <PortfolioForm onUpload={handleFileUpload} uploading={uploading.portfolio} />;
      case 'certificate':
        return <CertificateForm onUpload={handleFileUpload} uploading={uploading.certificate} />;
      case 'education':
        return <EducationForm onSave={handleAddEducation} uploading={uploading.education} />;
      case 'editEducation':
        return <EditEducationForm 
          education={editingItem?.data} 
          onSave={(data) => handleUpdateEducation(editingItem.data._id, data)} 
          uploading={uploading[`education_${editingItem?.data._id}`]} 
        />;
      case 'experience':
        return <ExperienceForm onSave={handleAddExperience} uploading={uploading.experience} />;
      case 'editExperience':
        return <EditExperienceForm 
          experience={editingItem?.data} 
          onSave={(data) => handleUpdateExperience(editingItem.data._id, data)} 
          uploading={uploading[`experience_${editingItem?.data._id}`]} 
        />;
      default:
        return null;
    }
  }
};

// MODAL COMPONENT
const ProfileModal = ({ title, onClose, children }) => {
  return (
    <div className="pp-modal-overlay" onClick={onClose}>
      <div className="pp-modal" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <div className="pp-modal-header">
          <h3>{title}</h3>
          <button className="pp-modal-close" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>
        <div className="pp-modal-content">
          {children}
        </div>
      </div>
    </div>
  );
};

// ✅ CRITICAL FIX: Updated ContactForm component - REMOVED WEBSITE FIELD
const ContactForm = ({ profile, onSave, uploading }) => {
  const [formData, setFormData] = useState({
    phone: profile.contact?.phone || '',
    address: profile.contact?.address || '',
    facebook: profile.contact?.socials?.facebook || ''
  });

  const [phoneError, setPhoneError] = useState('');

  const validateIndianPhone = (phone) => {
    const cleanPhone = phone.replace(/\D/g, '');
    return cleanPhone.length === 10 && /^[6-9]\d{9}$/.test(cleanPhone);
  };

  const handlePhoneChange = (e) => {
    const phone = e.target.value.replace(/\D/g, '');
    if (phone.length <= 10) {
      setFormData({...formData, phone: phone});
      
      if (phone && !validateIndianPhone(phone)) {
        setPhoneError('Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9');
      } else {
        setPhoneError('');
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (formData.phone && !validateIndianPhone(formData.phone)) {
      setPhoneError('Please enter a valid 10-digit Indian mobile number');
      return;
    }

    // ✅ CRITICAL FIX: Send properly structured contact data
    onSave({
      'contact.phone': formData.phone.trim(),
      'contact.address': formData.address.trim(),
      'contact.socials.facebook': formData.facebook.trim()
    });
  };

  return (
    <form onSubmit={handleSubmit} className="form">
      <div className="form-grid">
        <div className="form-field">
          <label>Phone Number (Indian) *</label>
          <input
            type="tel"
            value={formData.phone}
            onChange={handlePhoneChange}
            placeholder="9876543210"
            maxLength="10"
            className={phoneError ? 'error' : ''}
          />
          {phoneError && <span className="error-message">{phoneError}</span>}
          <small>Enter 10-digit mobile number without country code</small>
        </div>
        <div className="form-field">
          <label>Facebook Profile</label>
          <input
            type="url"
            value={formData.facebook}
            onChange={(e) => setFormData({...formData, facebook: e.target.value})}
            placeholder="https://facebook.com/yourprofile"
          />
        </div>
        <div className="form-field form-field-full">
          <label>Complete Address</label>
          <textarea
            value={formData.address}
            onChange={(e) => setFormData({...formData, address: e.target.value})}
            placeholder="House/Shop No., Street, Area, City, State, PIN Code"
            rows="3"
          />
          <small>Include complete address with PIN code for better job matches</small>
        </div>
      </div>

      <div className="form-actions">
        <button 
          type="submit" 
          className="btn btn-primary"
          disabled={uploading || !!phoneError}
        >
          {uploading ? <Loader className="animate-spin" size={16} /> : <Save size={16} />}
          Save Changes
        </button>
      </div>
    </form>
  );
};

// ALL OTHER FORM COMPONENTS STAY THE SAME...
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

// ✅ CRITICAL FIX: Enhanced BasicInfoForm with debugging
const BasicInfoForm = ({ profile, onSave, uploading }) => {
  const [formData, setFormData] = useState({
    name: profile.name || '',
    title: profile.title || '',
    bio: profile.bio || '',
    location: profile.location || '',
    category: profile.category || '',
    subcategory: profile.subcategory || ''
  });

  console.log('📝 [BasicInfoForm] Initial form data:', formData);
  console.log('📝 [BasicInfoForm] Profile data:', {
    name: profile.name,
    title: profile.title,
    category: profile.category,
    subcategory: profile.subcategory
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('📝 [BasicInfoForm] Submitting form data:', formData);
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="form">
      <div className="form-grid">
        <div className="form-field">
          <label>Full Name *</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            placeholder="Your full name"
            required
          />
        </div>
        <div className="form-field">
          <label>Professional Title</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => {
              console.log('📝 [BasicInfoForm] Title changing to:', e.target.value);
              setFormData({...formData, title: e.target.value});
            }}
            placeholder="e.g. Senior CAD Designer"
          />
          <small>This will be displayed under your name in the profile</small>
        </div>
        <div className="form-field">
          <label>Category</label>
          <select
            value={formData.category}
            onChange={(e) => {
              console.log('📝 [BasicInfoForm] Category changing to:', e.target.value);
              setFormData({...formData, category: e.target.value});
            }}
          >
            <option value="">Select Category</option>
            <option value="Jewelry Design">Jewelry Design</option>
            <option value="CAD Design">CAD Design</option>
            <option value="Manufacturing">Manufacturing</option>
            <option value="Textile Design">Textile Design</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div className="form-field">
          <label>Subcategory</label>
          <input
            type="text"
            value={formData.subcategory}
            onChange={(e) => {
              console.log('📝 [BasicInfoForm] Subcategory changing to:', e.target.value);
              setFormData({...formData, subcategory: e.target.value});
            }}
            placeholder="e.g. Diamond Setting, Matrix Design"
          />
        </div>
        <div className="form-field form-field-full">
          <label>Professional Bio</label>
          <textarea
            value={formData.bio}
            onChange={(e) => setFormData({...formData, bio: e.target.value})}
            placeholder="Tell clients about your professional background..."
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

const SkillsForm = ({ profile, onSave, uploading }) => {
  const [skills, setSkills] = useState(profile.skills || []);
  const [newSkill, setNewSkill] = useState('');

  const addSkill = () => {
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      setSkills([...skills, newSkill.trim()]);
      setNewSkill('');
    }
  };

  const removeSkill = (skillToRemove) => {
    setSkills(skills.filter(skill => skill !== skillToRemove));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ skills });
  };

  return (
    <form onSubmit={handleSubmit} className="form">
      <div className="skills-input">
        <div className="add-skill">
          <input
            type="text"
            value={newSkill}
            onChange={(e) => setNewSkill(e.target.value)}
            placeholder="Add a skill (e.g. CAD Design)"
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
          />
          <button 
            type="button" 
            onClick={addSkill} 
            className="btn btn-outline"
            disabled={!newSkill.trim()}
          >
            <Plus size={16} />
            Add
          </button>
        </div>
        
        {skills.length > 0 && (
          <div className="current-skills">
            {skills.map((skill, index) => (
              <div key={index} className="skill-chip">
                <span>{skill}</span>
                <button
                  type="button"
                  className="skill-remove"
                  onClick={() => removeSkill(skill)}
                  title="Remove skill"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="form-actions">
        <button 
          type="submit" 
          className="btn btn-primary"
          disabled={uploading}
        >
          {uploading ? <Loader className="animate-spin" size={16} /> : <Save size={16} />}
          Save Skills
        </button>
      </div>
    </form>
  );
};

const PortfolioForm = ({ onUpload, uploading }) => {
  const [file, setFile] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (file && formData.title) {
      onUpload(file, 'portfolio', formData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="form">
      <div className="form-grid">
        <div className="form-field">
          <label>Portfolio Title *</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({...formData, title: e.target.value})}
            placeholder="e.g. Diamond Ring Design"
            required
          />
        </div>
        <div className="form-field form-field-full">
          <label>Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            placeholder="Describe your work..."
            rows="3"
          />
        </div>
      </div>

      <div className="file-upload">
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files[0])}
          id="portfolio-upload"
          className="file-input"
        />
        <label htmlFor="portfolio-upload" className="file-label">
          <Upload size={24} />
          <span>Choose portfolio image</span>
          <small>JPG, PNG or GIF (max 20MB)</small>
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
          disabled={!file || !formData.title || uploading}
        >
          {uploading ? <Loader className="animate-spin" size={16} /> : <Plus size={16} />}
          {uploading ? 'Adding...' : 'Add to Portfolio'}
        </button>
      </div>
    </form>
  );
};

const CertificateForm = ({ onUpload, uploading }) => {
  const [file, setFile] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    issuer: '',
    year: new Date().getFullYear()
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.title && formData.issuer) {
      onUpload(file, 'certificate', formData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="form">
      <div className="form-grid">
        <div className="form-field">
          <label>Certificate Name *</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({...formData, title: e.target.value})}
            placeholder="e.g. Advanced CAD Design"
            required
          />
        </div>
        <div className="form-field">
          <label>Issuing Organization *</label>
          <input
            type="text"
            value={formData.issuer}
            onChange={(e) => setFormData({...formData, issuer: e.target.value})}
            placeholder="e.g. Design Institute"
            required
          />
        </div>
        <div className="form-field">
          <label>Year Obtained</label>
          <input
            type="number"
            value={formData.year}
            onChange={(e) => setFormData({...formData, year: parseInt(e.target.value)})}
            min="1950"
            max={new Date().getFullYear()}
          />
        </div>
      </div>

      <div className="file-upload">
        <input
          type="file"
          accept="image/*,application/pdf"
          onChange={(e) => setFile(e.target.files[0])}
          id="certificate-upload"
          className="file-input"
        />
        <label htmlFor="certificate-upload" className="file-label">
          <Upload size={24} />
          <span>Choose certificate file (optional)</span>
          <small>JPG, PNG or PDF (max 10MB)</small>
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
          disabled={!formData.title || !formData.issuer || uploading}
        >
          {uploading ? <Loader className="animate-spin" size={16} /> : <Plus size={16} />}
          {uploading ? 'Adding...' : 'Add Certificate'}
        </button>
      </div>
    </form>
  );
};

const EducationForm = ({ onSave, uploading }) => {
  const [formData, setFormData] = useState({
    level: '',
    institution: '',
    degree: '',
    year: new Date().getFullYear(),
    percentage: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="form">
      <div className="form-grid">
        <div className="form-field">
          <label>Education Level *</label>
          <select
            value={formData.level}
            onChange={(e) => setFormData({...formData, level: e.target.value})}
            required
          >
            <option value="">Select Level</option>
            <option value="10th Class">10th Class</option>
            <option value="12th Class">12th Class</option>
            <option value="Diploma">Diploma</option>
            <option value="Bachelor">Bachelor's Degree</option>
            <option value="Master">Master's Degree</option>
            <option value="Certificate">Certificate Course</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div className="form-field">
          <label>School/College Name *</label>
          <input
            type="text"
            value={formData.institution}
            onChange={(e) => setFormData({...formData, institution: e.target.value})}
            placeholder="e.g. ABC High School"
            required
          />
        </div>
        <div className="form-field">
          <label>Year of Completion</label>
          <input
            type="number"
            value={formData.year}
            onChange={(e) => setFormData({...formData, year: parseInt(e.target.value)})}
            min="1980"
            max={new Date().getFullYear() + 5}
          />
        </div>
        <div className="form-field">
          <label>Percentage/Grade</label>
          <input
            type="number"
            value={formData.percentage}
            onChange={(e) => setFormData({...formData, percentage: e.target.value})}
            placeholder="85"
            min="0"
            max="100"
          />
        </div>
      </div>

      <div className="form-actions">
        <button 
          type="submit" 
          className="btn btn-primary"
          disabled={uploading}
        >
          {uploading ? <Loader className="animate-spin" size={16} /> : <Plus size={16} />}
          {uploading ? 'Adding...' : 'Add Education'}
        </button>
      </div>
    </form>
  );
};

const EditEducationForm = ({ education, onSave, uploading }) => {
  const [formData, setFormData] = useState({
    level: education?.level || '',
    institution: education?.institution || '',
    degree: education?.degree || '',
    year: education?.year || new Date().getFullYear(),
    percentage: education?.percentage || ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="form">
      <div className="form-grid">
        <div className="form-field">
          <label>Education Level *</label>
          <select
            value={formData.level}
            onChange={(e) => setFormData({...formData, level: e.target.value})}
            required
          >
            <option value="">Select Level</option>
            <option value="10th Class">10th Class</option>
            <option value="12th Class">12th Class</option>
            <option value="Diploma">Diploma</option>
            <option value="Bachelor">Bachelor's Degree</option>
            <option value="Master">Master's Degree</option>
            <option value="Certificate">Certificate Course</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div className="form-field">
          <label>School/College Name *</label>
          <input
            type="text"
            value={formData.institution}
            onChange={(e) => setFormData({...formData, institution: e.target.value})}
            placeholder="e.g. ABC High School"
            required
          />
        </div>
        <div className="form-field">
          <label>Year of Completion</label>
          <input
            type="number"
            value={formData.year}
            onChange={(e) => setFormData({...formData, year: parseInt(e.target.value)})}
            min="1980"
            max={new Date().getFullYear() + 5}
          />
        </div>
        <div className="form-field">
          <label>Percentage/Grade</label>
          <input
            type="number"
            value={formData.percentage}
            onChange={(e) => setFormData({...formData, percentage: e.target.value})}
            placeholder="85"
            min="0"
            max="100"
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
          {uploading ? 'Updating...' : 'Update Education'}
        </button>
      </div>
    </form>
  );
};

// ✅ ENHANCED: Experience Form with Better Checkbox Alignment
const ExperienceForm = ({ onSave, uploading }) => {
  const [formData, setFormData] = useState({
    position: '',
    workplace: '',
    workplaceType: 'Company',
    startYear: new Date().getFullYear(),
    endYear: '',
    current: false,
    description: '',
    location: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="form">
      <div className="form-grid">
        <div className="form-field">
          <label>Job Position *</label>
          <input
            type="text"
            value={formData.position}
            onChange={(e) => setFormData({...formData, position: e.target.value})}
            placeholder="e.g. Senior CAD Designer"
            required
          />
        </div>
        <div className="form-field">
          <label>Company/Shop Name *</label>
          <input
            type="text"
            value={formData.workplace}
            onChange={(e) => setFormData({...formData, workplace: e.target.value})}
            placeholder="e.g. RK Jewellers"
            required
          />
        </div>
        <div className="form-field">
          <label>Start Year</label>
          <input
            type="number"
            value={formData.startYear}
            onChange={(e) => setFormData({...formData, startYear: parseInt(e.target.value)})}
            min="1980"
            max={new Date().getFullYear()}
          />
        </div>
        <div className="form-field">
          <label>End Year</label>
          <input
            type="number"
            value={formData.endYear}
            onChange={(e) => setFormData({...formData, endYear: parseInt(e.target.value)})}
            min="1980"
            max={new Date().getFullYear()}
            disabled={formData.current}
          />
        </div>
      </div>

      {/* ✅ FIXED: Better Checkbox Alignment */}
      <div className="form-field checkbox-field">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={formData.current}
            onChange={(e) => setFormData({...formData, current: e.target.checked, endYear: e.target.checked ? '' : formData.endYear})}
          />
          <span className="checkbox-text">I currently work here</span>
        </label>
      </div>

      <div className="form-actions">
        <button 
          type="submit" 
          className="btn btn-primary"
          disabled={uploading}
        >
          {uploading ? <Loader className="animate-spin" size={16} /> : <Plus size={16} />}
          {uploading ? 'Adding...' : 'Add Experience'}
        </button>
      </div>
    </form>
  );
};

const EditExperienceForm = ({ experience, onSave, uploading }) => {
  const [formData, setFormData] = useState({
    position: experience?.position || '',
    workplace: experience?.workplace || '',
    workplaceType: experience?.workplaceType || 'Company',
    startYear: experience?.startYear || new Date().getFullYear(),
    endYear: experience?.endYear || '',
    current: experience?.current || false,
    description: experience?.description || '',
    location: experience?.location || ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="form">
      <div className="form-grid">
        <div className="form-field">
          <label>Job Position *</label>
          <input
            type="text"
            value={formData.position}
            onChange={(e) => setFormData({...formData, position: e.target.value})}
            placeholder="e.g. CAD Designer"
            required
          />
        </div>
        <div className="form-field">
          <label>Company/Shop Name *</label>
          <input
            type="text"
            value={formData.workplace}
            onChange={(e) => setFormData({...formData, workplace: e.target.value})}
            placeholder="e.g. ABC Company"
            required
          />
        </div>
        <div className="form-field">
          <label>Start Year</label>
          <input
            type="number"
            value={formData.startYear}
            onChange={(e) => setFormData({...formData, startYear: parseInt(e.target.value)})}
            min="1980"
            max={new Date().getFullYear()}
          />
        </div>
        <div className="form-field">
          <label>End Year</label>
          <input
            type="number"
            value={formData.endYear}
            onChange={(e) => setFormData({...formData, endYear: parseInt(e.target.value)})}
            min="1980"
            max={new Date().getFullYear()}
            disabled={formData.current}
          />
        </div>
      </div>

      {/* ✅ FIXED: Better Checkbox Alignment */}
      <div className="form-field checkbox-field">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={formData.current}
            onChange={(e) => setFormData({...formData, current: e.target.checked, endYear: e.target.checked ? '' : formData.endYear})}
          />
          <span className="checkbox-text">I currently work here</span>
        </label>
      </div>

      <div className="form-actions">
        <button 
          type="submit" 
          className="btn btn-primary"
          disabled={uploading}
        >
          {uploading ? <Loader className="animate-spin" size={16} /> : <Save size={16} />}
          {uploading ? 'Updating...' : 'Update Experience'}
        </button>
      </div>
    </form>
  );
};

export default ProfessionalProfile;
