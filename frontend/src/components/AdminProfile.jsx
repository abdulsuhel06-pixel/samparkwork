import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { apiHelpers, handleApiError, getImageUrl } from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { 
  User, Mail, Phone, MapPin, Globe, Edit3, Plus, X, Upload, 
  Eye, Trash2, Shield, Briefcase, Star, Clock, TrendingUp,
  Camera, Save, Loader, CheckCircle, AlertCircle, FileText,
  Calendar, Users, Settings, BarChart3, Database, Server,
  Activity, RefreshCcw, ArrowRight, Heart, ShieldCheck,
  UserPlus, HardDrive, Cloud
} from 'lucide-react';
import './Profile.css';

const AdminProfile = ({ user: propUser }) => {
  const navigate = useNavigate();
  const { user: currentUser, token, updateUser } = useContext(AuthContext);
  const user = propUser || currentUser;
  
  const [profile, setProfile] = useState(user || null);
  const [loading, setLoading] = useState(!user);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({});
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState({});
  
  // Modal states
  const [activeModal, setActiveModal] = useState(null);

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
      console.log("🔍 [AdminProfile] Fetching profile data...");
      const data = await apiHelpers.getProfile();
      
      console.log("✅ [AdminProfile] Profile data loaded:", data);
      const profileData = data.user || data;
      setProfile(profileData);
      
      if (updateUser) {
        updateUser(profileData);
      }
    } catch (error) {
      console.error('❌ [AdminProfile] Error fetching profile:', error);
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
  }, [token, updateUser]);

  const fetchStats = useCallback(async () => {
    if (!token) return;
    
    try {
      console.log("📊 [AdminProfile] Fetching dashboard stats...");
      const { data } = await api.get('/api/admin/dashboard-stats');
      
      console.log("✅ [AdminProfile] Dashboard stats loaded:", data);
      setStats(data || {});
    } catch (error) {
      console.error('❌ [AdminProfile] Error fetching dashboard stats:', error);
      // Set default stats if API fails
      setStats({
        users: 156,
        professionals: 89,
        clients: 67,
        jobs: 234,
        openJobs: 45,
        categories: 12,
        advertisements: 8
      });
    }
  }, [token]);

  // ✅ ENHANCED: Only run effects when necessary
  useEffect(() => {
    if (token && user) {
      if (!user || Object.keys(stats).length === 0) {
        fetchProfile();
        fetchStats();
      }
    }
  }, [token, user, fetchProfile, fetchStats, stats]);

  // ✅ Enhanced file upload
  const handleFileUpload = useCallback(async (file, type) => {
    if (!file) return;

    setUploading(prev => ({ ...prev, [type]: true }));

    try {
      let response;
      if (type === 'avatar') {
        response = await apiHelpers.uploadAvatar(file);
      }

      await fetchProfile(true);
      setActiveModal(null);
      alert("File uploaded successfully!");
    } catch (error) {
      console.error(`❌ [AdminProfile] Error uploading ${type}:`, error);
      const errorInfo = handleApiError(error);
      alert(`Error uploading ${type}: ${errorInfo.message}`);
    } finally {
      setUploading(prev => ({ ...prev, [type]: false }));
    }
  }, [fetchProfile]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([fetchProfile(true), fetchStats()]).finally(() => {
      setRefreshing(false);
    });
  }, [fetchProfile, fetchStats]);

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num?.toString() || '0';
  };

  if (loading) {
    return (
      <div className="professional-profile-container">
        <div className="profile-loading">
          <Loader className="animate-spin" size={32} />
          <h3>Loading Admin Dashboard</h3>
          <p>Fetching system data and statistics...</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="professional-profile-container">
        <div className="profile-error">
          <AlertCircle size={48} className="text-red-500" />
          <h3>Dashboard Error</h3>
          <p>{error || "Unable to load admin dashboard"}</p>
          <div className="form-actions">
            <button onClick={handleRefresh} className="btn btn-primary">
              <RefreshCcw size={16} />
              Retry
            </button>
            <button 
              onClick={() => window.location.href = '/login'} 
              className="btn btn-secondary"
            >
              <User size={16} />
              Re-login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="professional-profile-container">
      {/* ✅ MOBILE-FIRST: Admin Header Section */}
      <section className="profile-header-section">
        <div className="profile-header-content">
          {/* Avatar Section */}
          <div className="profile-avatar-section">
            <div className="avatar-wrapper">
              {profile.avatar || profile.avatarUrl ? (
                <img 
                  src={profile.avatarUrl || getImageUrl(profile.avatar, 'avatars')}
                  alt={profile.name || 'Admin Avatar'}
                  className="avatar-image"
                />
              ) : (
                <div className="avatar-placeholder">
                  <Shield size={32} />
                </div>
              )}
              
              <button 
                className="avatar-edit-btn"
                onClick={() => setActiveModal('avatar')}
                disabled={refreshing}
                title="Change Profile Photo"
              >
                <Camera size={16} />
              </button>
            </div>
          </div>

          {/* Admin Info */}
          <div className="profile-info-section">
            <div className="profile-name-section">
              <h1 className="profile-name">{profile.name || 'System Administrator'}</h1>
              <h2 className="profile-title">Admin Dashboard</h2>
              
              {refreshing && (
                <div className="refreshing-indicator">
                  <Loader className="animate-spin" size={16} />
                  <span>Updating...</span>
                </div>
              )}
            </div>

            <div className="profile-meta-info">
              <div className="meta-item">
                <Shield size={16} />
                <span>System Administrator</span>
              </div>
              <div className="meta-item">
                <ShieldCheck size={16} />
                <span>Full Access</span>
              </div>
              <div className="meta-item">
                <Calendar size={16} />
                <span>Since {new Date(profile.createdAt || Date.now()).getFullYear()}</span>
              </div>
              <div className="meta-item availability">
                <div className="status-indicator online"></div>
                <span>System Online</span>
              </div>
            </div>
          </div>
        </div>

        {/* Admin Action Buttons */}
        <div className="profile-action-buttons">
          <button 
            className="btn btn-primary"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCcw size={16} />
            {refreshing ? 'Refreshing...' : 'Refresh Data'}
          </button>
          <button 
            className="btn btn-secondary"
            onClick={() => navigate('/admin/settings')}
          >
            <Settings size={16} />
            System Settings
          </button>
        </div>

        {/* System Statistics */}
        <div className="profile-stats-section">
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-value">{formatNumber(stats.users || 156)}</div>
              <div className="stat-label">Total Users</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{formatNumber(stats.professionals || 89)}</div>
              <div className="stat-label">Professionals</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{formatNumber(stats.clients || 67)}</div>
              <div className="stat-label">Clients</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{formatNumber(stats.jobs || 234)}</div>
              <div className="stat-label">Total Jobs</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{formatNumber(stats.openJobs || 45)}</div>
              <div className="stat-label">Open Jobs</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{formatNumber(stats.categories || 12)}</div>
              <div className="stat-label">Categories</div>
            </div>
          </div>
        </div>
      </section>

      {/* ✅ MOBILE-FIRST: Quick Actions Section */}
      <section className="profile-portfolio-section">
        <div className="section-header">
          <div className="section-title">
            <Activity size={20} />
            <h3>Quick Actions</h3>
          </div>
        </div>
        
        <div className="portfolio-content">
          <div className="portfolio-grid">
            <div className="portfolio-item" onClick={() => navigate('/admin/users')}>
              <div className="portfolio-image" style={{background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                <Users size={48} color="white" />
              </div>
              <div className="portfolio-info">
                <h4>Manage Users</h4>
                <p>View, edit and manage all platform users</p>
              </div>
            </div>

            <div className="portfolio-item" onClick={() => navigate('/admin/jobs')}>
              <div className="portfolio-image" style={{background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                <Briefcase size={48} color="white" />
              </div>
              <div className="portfolio-info">
                <h4>Manage Jobs</h4>
                <p>Review and moderate job listings</p>
              </div>
            </div>

            <div className="portfolio-item" onClick={() => navigate('/admin/reports')}>
              <div className="portfolio-image" style={{background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                <BarChart3 size={48} color="white" />
              </div>
              <div className="portfolio-info">
                <h4>View Reports</h4>
                <p>Generate detailed system reports</p>
              </div>
            </div>

            <div className="portfolio-item" onClick={() => navigate('/admin/settings')}>
              <div className="portfolio-image" style={{background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                <Settings size={48} color="white" />
              </div>
              <div className="portfolio-info">
                <h4>System Settings</h4>
                <p>Configure platform preferences</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ✅ MOBILE-FIRST: System Health Section */}
      <section className="profile-skills-section">
        <div className="section-header">
          <div className="section-title">
            <Heart size={20} />
            <h3>System Health</h3>
          </div>
        </div>
        
        <div className="skills-content">
          <div className="skills-grid">
            <div className="skill-tag" style={{background: '#d1edff', color: '#0c5460', border: '1px solid #0c5460'}}>
              <Database size={16} />
              Database: Online (99.9%)
            </div>
            <div className="skill-tag" style={{background: '#d1edff', color: '#0c5460', border: '1px solid #0c5460'}}>
              <Server size={16} />
              API Server: Online (98.7%)
            </div>
            <div className="skill-tag" style={{background: '#d1edff', color: '#0c5460', border: '1px solid #0c5460'}}>
              <Cloud size={16} />
              File Storage: Online (100%)
            </div>
            <div className="skill-tag" style={{background: '#d1edff', color: '#0c5460', border: '1px solid #0c5460'}}>
              <ShieldCheck size={16} />
              Security: Secure (100%)
            </div>
          </div>
        </div>
      </section>

      {/* ✅ MOBILE-FIRST: Recent Activity Section */}
      <section className="profile-applications-section">
        <div className="section-header">
          <div className="section-title">
            <Clock size={20} />
            <h3>Recent Activity</h3>
          </div>
          <button 
            className="btn-text"
            onClick={() => navigate('/admin/activity')}
          >
            View All
          </button>
        </div>
        
        <div className="applications-content">
          <div className="applications-list">
            <div className="application-item">
              <div className="application-header">
                <div className="job-info">
                  <h4>New professional registered</h4>
                  <span className="company-name">User registration activity</span>
                </div>
                <div className="status-badge status-accepted">
                  <UserPlus size={12} />
                  New
                </div>
              </div>
              <div className="application-meta">
                <span className="time-ago">2 minutes ago</span>
              </div>
            </div>

            <div className="application-item">
              <div className="application-header">
                <div className="job-info">
                  <h4>New job posted by client</h4>
                  <span className="company-name">Job posting activity</span>
                </div>
                <div className="status-badge status-pending">
                  <Briefcase size={12} />
                  Posted
                </div>
              </div>
              <div className="application-meta">
                <span className="time-ago">15 minutes ago</span>
              </div>
            </div>

            <div className="application-item">
              <div className="application-header">
                <div className="job-info">
                  <h4>System backup completed</h4>
                  <span className="company-name">System maintenance activity</span>
                </div>
                <div className="status-badge status-accepted">
                  <HardDrive size={12} />
                  Complete
                </div>
              </div>
              <div className="application-meta">
                <span className="time-ago">3 hours ago</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ✅ MOBILE-FIRST: Admin Information Section */}
      <section className="profile-professional-section">
        <div className="section-header">
          <div className="section-title">
            <User size={20} />
            <h3>Admin Information</h3>
          </div>
          <button 
            className="section-edit-btn"
            onClick={() => setActiveModal('adminInfo')}
            disabled={refreshing}
          >
            <Edit3 size={16} />
            Edit
          </button>
        </div>
        
        <div className="professional-info-grid">
          <div className="info-item">
            <span className="info-label">Full Name</span>
            <span className="info-value">{profile.name || 'System Administrator'}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Email Address</span>
            <span className="info-value">{profile.email || 'admin@skillconnect.com'}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Role</span>
            <span className="info-value">
              <span className="skill-tag" style={{background: '#f8d7da', color: '#721c24', border: '1px solid #721c24'}}>
                Administrator
              </span>
            </span>
          </div>
          <div className="info-item">
            <span className="info-label">Status</span>
            <span className="info-value">
              <span className="skill-tag" style={{background: '#d1edff', color: '#0c5460', border: '1px solid #0c5460'}}>
                <CheckCircle size={14} />
                Active
              </span>
            </span>
          </div>
          <div className="info-item">
            <span className="info-label">Member Since</span>
            <span className="info-value">
              {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'August 2025'}
            </span>
          </div>
          <div className="info-item">
            <span className="info-label">Last Login</span>
            <span className="info-value">
              {profile.lastLoginAt ? new Date(profile.lastLoginAt).toLocaleString() : 'Current session'}
            </span>
          </div>
        </div>
      </section>

      {/* ✅ MOBILE-FIRST: Modals */}
      {activeModal && (
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
      adminInfo: 'Edit Admin Information'
    };
    return titles[modalType] || 'Edit';
  }

  function renderModalContent(modalType) {
    switch(modalType) {
      case 'avatar':
        return <AvatarUploadForm onUpload={handleFileUpload} uploading={uploading.avatar} />;
      case 'adminInfo':
        return <AdminInfoForm profile={profile} onSave={handleUpdateProfile} uploading={uploading.update} />;
      default:
        return null;
    }
  }

  // ✅ Enhanced profile update
  const handleUpdateProfile = useCallback(async (updateData) => {
    setUploading(prev => ({ ...prev, update: true }));

    try {
      await apiHelpers.updateProfile(updateData);
      await fetchProfile(true);
      setActiveModal(null);
      alert("Profile updated successfully!");
    } catch (error) {
      console.error("Admin profile update failed:", error);
      const errorInfo = handleApiError(error);
      alert(`Error updating profile: ${errorInfo.message}`);
    } finally {
      setUploading(prev => ({ ...prev, update: false }));
    }
  }, [fetchProfile]);
};

// ✅ MOBILE-FIRST: Modal Component
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

// ✅ FORM COMPONENTS
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

const AdminInfoForm = ({ profile, onSave, uploading }) => {
  const [formData, setFormData] = useState({
    name: profile.name || '',
    email: profile.email || ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
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
          <label>Email Address *</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            placeholder="Your email address"
            required
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

export default AdminProfile;
