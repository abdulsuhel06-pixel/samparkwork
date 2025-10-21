import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { apiHelpers, handleApiError, getImageUrl } from '../services/api';
import { 
  ArrowLeft, Send, Search, MoreHorizontal, Phone, Video, 
  Paperclip, User, Building, Star, Clock, CheckCircle, 
  XCircle, Eye, MessageSquare, Filter, Plus, X, FileText, 
  Calendar, MapPin, Briefcase, AlertCircle, Loader, Mail, 
  Trash2, Ban
} from 'lucide-react';
import './Applications.css';

const Applications = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useContext(AuthContext);
  
  // State management
  const [applications, setApplications] = useState([]);
  const [jobApplications, setJobApplications] = useState([]);
  const [myJobs, setMyJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('received');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [jobFilter, setJobFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [processingActions, setProcessingActions] = useState({});
  
  // Stats
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    accepted: 0,
    rejected: 0
  });

  // Fetch data on component mount
  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated, user?.role]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      if (user?.role === 'client') {
        await Promise.all([
          fetchReceivedApplications(),
          fetchMyJobs()
        ]);
      } else if (user?.role === 'professional') {
        await fetchMyApplications();
      }
    } catch (err) {
      console.error('Error fetching applications:', err);
      setError('Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const fetchReceivedApplications = async () => {
    try {
      console.log('Fetching received applications for client...');
      const response = await apiHelpers.getReceivedApplications();
      console.log('Received applications response:', response);
      
      if (response.success) {
        const apps = response.applications || [];
        setApplications(apps);
        
        // Calculate stats
        const newStats = {
          total: apps.length,
          pending: apps.filter(app => app.status === 'pending').length,
          accepted: apps.filter(app => app.status === 'accepted').length,
          rejected: apps.filter(app => app.status === 'rejected').length
        };
        setStats(newStats);
        console.log('Updated stats:', newStats);
      } else {
        throw new Error(response.message || 'Failed to fetch applications');
      }
    } catch (error) {
      console.error('Error fetching received applications:', error);
      const errorInfo = handleApiError(error);
      setError(errorInfo.message);
      setApplications([]);
    }
  };

  const fetchMyJobs = async () => {
    try {
      console.log('Fetching client posted jobs...');
      const response = await apiHelpers.getMyPostedJobs();
      if (response.success) {
        setMyJobs(response.jobs || []);
        console.log('Fetched jobs:', response.jobs?.length || 0);
      }
    } catch (error) {
      console.error('Error fetching posted jobs:', error);
    }
  };

  const fetchMyApplications = async () => {
    try {
      console.log('Fetching professional applications...');
      const response = await apiHelpers.getMyApplications();
      console.log('My applications response:', response);
      
      if (response.success) {
        const apps = response.applications || [];
        setJobApplications(apps);
        console.log('Fetched my applications:', apps.length);
        
        // Calculate stats for professional
        const newStats = {
          total: apps.length,
          pending: apps.filter(app => app.status === 'pending').length,
          accepted: apps.filter(app => app.status === 'accepted').length,
          rejected: apps.filter(app => app.status === 'rejected').length
        };
        setStats(newStats);
      } else {
        throw new Error(response.message || 'Failed to fetch applications');
      }
    } catch (error) {
      console.error('Error fetching my applications:', error);
      const errorInfo = handleApiError(error);
      setError(errorInfo.message);
      setJobApplications([]);
    }
  };

  // ✅ ENHANCED: Handle application actions (Accept/Reject with DELETE)
  const handleApplicationAction = async (applicationId, status, customMessage = '') => {
    console.log(`Processing application ${applicationId} with status: ${status}`);
    setProcessingActions(prev => ({ ...prev, [applicationId]: status }));

    try {
      let message = customMessage;
      
      // Default messages if none provided
      if (!message) {
        if (status === 'accepted') {
          message = '🎉 Congratulations! Your application has been accepted. We look forward to working with you.';
        } else if (status === 'rejected') {
          message = 'Thank you for your interest. We have decided to move forward with other candidates at this time.';
        }
      }

      // ✅ NEW: Use DELETE for rejected applications
      if (status === 'rejected') {
        const response = await apiHelpers.deleteApplication(applicationId, message);
        
        if (response.success) {
          // Refresh applications data
          await fetchReceivedApplications();
          
          showNotification('Application rejected and removed successfully!', 'success');
        } else {
          throw new Error(response.message || 'Failed to reject application');
        }
      } else {
        // Use update for accepted applications
        const response = await apiHelpers.updateApplicationStatus(applicationId, status, message);
        
        if (response.success) {
          // Refresh applications data
          await fetchReceivedApplications();
          
          showNotification('Application accepted successfully!', 'success');
        } else {
          throw new Error(response.message || 'Failed to accept application');
        }
      }
    } catch (error) {
      console.error(`Error ${status}ing application:`, error);
      const errorInfo = handleApiError(error);
      showNotification(`Error ${status}ing application: ${errorInfo.message}`, 'error');
    } finally {
      setProcessingActions(prev => ({ ...prev, [applicationId]: false }));
    }
  };

  // ✅ NEW: Delete application permanently (for accepted applications too)
  const handleDeleteApplication = async (applicationId) => {
    const confirmed = window.confirm('Are you sure you want to permanently delete this application? This action cannot be undone.');
    if (!confirmed) return;

    console.log(`Permanently deleting application: ${applicationId}`);
    setProcessingActions(prev => ({ ...prev, [applicationId]: 'deleting' }));

    try {
      const response = await apiHelpers.deleteApplication(applicationId, 'Application deleted by client');
      
      if (response.success) {
        await fetchReceivedApplications();
        showNotification('Application deleted permanently!', 'success');
      } else {
        throw new Error(response.message || 'Failed to delete application');
      }
    } catch (error) {
      console.error('Error deleting application:', error);
      const errorInfo = handleApiError(error);
      showNotification(`Error deleting application: ${errorInfo.message}`, 'error');
    } finally {
      setProcessingActions(prev => ({ ...prev, [applicationId]: false }));
    }
  };

  // ✅ FIXED: Navigate to messages with professional context
  const handleContactProfessional = (application) => {
    const professionalId = application.professional._id;
    const jobId = application.job._id;
    const applicationId = application._id;
    
    // Navigate to messages with query parameters
    navigate(`/messages?freelancer=${professionalId}&job=${jobId}&application=${applicationId}`);
    
    showNotification('Redirecting to messages...', 'success');
  };

  const showNotification = (message, type = 'success') => {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
      color: white;
      border-radius: 8px;
      font-weight: 500;
      z-index: 10000;
      animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
          if (notification.parentNode) {
            document.body.removeChild(notification);
          }
        }, 300);
      }
    }, 4000);
  };

  // Filter applications
  const filterApplications = (apps) => {
    return apps.filter(app => {
      const matchesSearch = !searchTerm || 
        app.professional?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.job?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.coverLetter?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
      
      const matchesJob = jobFilter === 'all' || app.job?._id === jobFilter;
      
      return matchesSearch && matchesStatus && matchesJob;
    });
  };

  // Sort applications
  const sortApplications = (apps) => {
    const sorted = [...apps];
    switch (sortBy) {
      case 'newest':
        return sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      case 'oldest':
        return sorted.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      case 'status':
        return sorted.sort((a, b) => a.status.localeCompare(b.status));
      default:
        return sorted;
    }
  };

  const formatTimeAgo = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    return date.toLocaleDateString();
  };

  if (!isAuthenticated) {
    return (
      <div className="applications-container">
        <div className="applications-error">
          <AlertCircle size={48} />
          <h2>Authentication Required</h2>
          <p>Please log in to view your applications.</p>
          <button onClick={() => navigate('/login')} className="btn btn-primary">
            Log In
          </button>
        </div>
      </div>
    );
  }

  const currentApplications = user?.role === 'client' ? 
    (activeTab === 'received' ? applications : jobApplications) : 
    jobApplications;
  
  const filteredApplications = sortApplications(filterApplications(currentApplications));

  return (
    <div className="applications-container">
      {/* Header */}
      <div className="applications-header">
        <div className="header-content">
          <div className="header-text">
            <h1>Job Applications</h1>
            <p>Review and manage applications for your jobs</p>
          </div>
          
          {user?.role === 'client' && (
            <div className="header-tabs">
              <button 
                className={`tab-btn ${activeTab === 'received' ? 'active' : ''}`}
                onClick={() => setActiveTab('received')}
              >
                <FileText size={16} />
                Received Applications
              </button>
              <button 
                className={`tab-btn ${activeTab === 'my-applications' ? 'active' : ''}`}
                onClick={() => setActiveTab('my-applications')}
              >
                <User size={16} />
                My Applications
              </button>
            </div>
          )}
          
          <div className="header-actions">
            <button 
              className="btn btn-primary"
              onClick={() => navigate('/find-jobs')}
            >
              <Plus size={16} />
              Find Jobs
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="applications-stats">
        <div className="stats-grid">
          <div className="stat-card total">
            <div className="stat-icon">
              <FileText size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-number">{stats.total}</div>
              <div className="stat-label">Total Applications</div>
            </div>
          </div>
          
          <div className="stat-card pending">
            <div className="stat-icon">
              <Clock size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-number">{stats.pending}</div>
              <div className="stat-label">Pending</div>
            </div>
          </div>
          
          <div className="stat-card accepted">
            <div className="stat-icon">
              <CheckCircle size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-number">{stats.accepted}</div>
              <div className="stat-label">Accepted</div>
            </div>
          </div>
          
          <div className="stat-card rejected">
            <div className="stat-icon">
              <XCircle size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-number">{stats.rejected}</div>
              <div className="stat-label">Rejected</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="applications-filters">
        <div className="filters-row">
          <div className="search-filter">
            <div className="search-input">
              <Search size={20} />
              <input
                type="text"
                placeholder="Search professionals or jobs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <div className="filter-controls">
            <div className="filter-group">
              <label>Job:</label>
              <select 
                value={jobFilter} 
                onChange={(e) => setJobFilter(e.target.value)}
              >
                <option value="all">All Jobs ({myJobs.length})</option>
                {myJobs.map(job => (
                  <option key={job._id} value={job._id}>
                    {job.title}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="filter-group">
              <label>Status:</label>
              <select 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All ({stats.total})</option>
                <option value="pending">Pending ({stats.pending})</option>
                <option value="accepted">Accepted ({stats.accepted})</option>
                <option value="rejected">Rejected ({stats.rejected})</option>
              </select>
            </div>
            
            <div className="filter-group">
              <label>Sort by:</label>
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="status">Status</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Applications List */}
      <div className="applications-content">
        <div className="applications-info">
          <span>Showing {filteredApplications.length} of {currentApplications.length} applications</span>
        </div>

        {loading ? (
          <div className="applications-loading">
            <Loader className="animate-spin" size={32} />
            <p>Loading applications...</p>
          </div>
        ) : error ? (
          <div className="applications-error">
            <AlertCircle size={48} />
            <h3>Error Loading Applications</h3>
            <p>{error}</p>
            <button onClick={fetchData} className="btn btn-primary">
              <Clock size={16} />
              Try Again
            </button>
          </div>
        ) : filteredApplications.length === 0 ? (
          <div className="applications-empty">
            <FileText size={64} />
            <h3>No Applications Found</h3>
            <p>
              {currentApplications.length === 0 
                ? "No applications received yet. Post a job to start receiving applications."
                : "No applications match your current filters. Try adjusting your search criteria."
              }
            </p>
            {currentApplications.length === 0 && (
              <button 
                onClick={() => navigate('/post-job')} 
                className="btn btn-primary"
              >
                <Plus size={16} />
                Post a Job
              </button>
            )}
          </div>
        ) : (
          <div className="applications-list">
            {filteredApplications.map((application) => {
              return (
                <div key={application._id} className="application-card">
                  <div className="application-header">
                    <div className="applicant-info">
                      <div className="applicant-avatar">
                        {application.professional?.avatarUrl || application.professional?.avatar ? (
                          <img 
                            src={application.professional.avatarUrl || getImageUrl(application.professional.avatar, 'avatars')}
                            alt={application.professional?.name || 'Professional'}
                          />
                        ) : (
                          <User size={20} />
                        )}
                      </div>
                      <div className="applicant-details">
                        <h3>{application.professional?.name || 'Unknown Professional'}</h3>
                        <div className="applicant-meta">
                          <span className="applied-for">
                            Applied for: <strong>{application.job?.title || 'Job Title'}</strong>
                          </span>
                          <div className="application-type">
                            Professional
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="application-status">
                      <span className={`status-badge status-${application.status}`}>
                        {application.status === 'accepted' && <CheckCircle size={16} />}
                        {application.status === 'rejected' && <XCircle size={16} />}
                        {application.status === 'pending' && <Clock size={16} />}
                        {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                      </span>
                    </div>
                  </div>

                  <div className="application-details">
                    <div className="application-meta">
                      <div className="meta-item">
                        <Calendar size={14} />
                        <span>Applied {formatTimeAgo(application.createdAt)}</span>
                      </div>
                      {/* ✅ REMOVED: Job budget display as requested */}
                      {application.proposedBudget && (
                        <div className="meta-item proposal-budget">
                          <Star size={14} />
                          <span>Their Proposal: ₹{application.proposedBudget.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="meta-item">
                        <MapPin size={14} />
                        <span>{application.job?.location || 'Remote'}</span>
                      </div>
                      {application.job?.deadline && (
                        <div className="meta-item">
                          <Clock size={14} />
                          <span>Deadline: {new Date(application.job.deadline).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>

                    {application.coverLetter && (
                      <div className="application-proposal">
                        <h4>
                          <FileText size={16} />
                          Their Proposal:
                        </h4>
                        <p>{application.coverLetter}</p>
                      </div>
                    )}

                    {application.professional?.skills && application.professional.skills.length > 0 && (
                      <div className="professional-skills">
                        <h4>
                          <Star size={16} />
                          Professional's Skills:
                        </h4>
                        <div className="skills-list">
                          {application.professional.skills.slice(0, 3).map((skill, index) => (
                            <span key={index} className="skill-tag">{skill}</span>
                          ))}
                          {application.professional.skills.length > 3 && (
                            <span className="skill-tag more">
                              +{application.professional.skills.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ✅ ENHANCED: Action buttons with Contact redirect and Delete option */}
                  {user?.role === 'client' && activeTab === 'received' && (
                    <div className="application-actions">
                      <div className="action-buttons">
                        <button 
                          className="btn btn-text"
                          onClick={() => navigate(`/profile/${application.professional._id}`)}
                        >
                          <User size={16} />
                          View Profile
                        </button>
                        
                        {/* ✅ FIXED: Contact redirects to Messages */}
                        <button 
                          className="btn btn-secondary"
                          onClick={() => handleContactProfessional(application)}
                        >
                          <MessageSquare size={16} />
                          Contact
                        </button>

                        {/* ✅ ENHANCED: Actions for all statuses */}
                        {application.status === 'pending' && (
                          <div className="approval-buttons">
                            <button 
                              className="btn btn-success"
                              onClick={() => handleApplicationAction(application._id, 'accepted')}
                              disabled={processingActions[application._id]}
                            >
                              {processingActions[application._id] === 'accepted' ? (
                                <Loader className="animate-spin" size={16} />
                              ) : (
                                <CheckCircle size={16} />
                              )}
                              Accept
                            </button>
                            
                            <button 
                              className="btn btn-danger"
                              onClick={() => handleApplicationAction(application._id, 'rejected')}
                              disabled={processingActions[application._id]}
                            >
                              {processingActions[application._id] === 'rejected' ? (
                                <Loader className="animate-spin" size={16} />
                              ) : (
                                <Ban size={16} />
                              )}
                              Reject
                            </button>
                          </div>
                        )}

                        {/* ✅ NEW: Delete option for all applications (including accepted) */}
                        <button 
                          className="btn btn-danger-outline"
                          onClick={() => handleDeleteApplication(application._id)}
                          disabled={processingActions[application._id]}
                          title="Permanently delete this application"
                        >
                          {processingActions[application._id] === 'deleting' ? (
                            <Loader className="animate-spin" size={16} />
                          ) : (
                            <Trash2 size={16} />
                          )}
                          Delete
                        </button>
                      </div>
                      
                      <div className="application-id">
                        ID: {application._id.slice(-6).toUpperCase()}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(100%); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default Applications;
