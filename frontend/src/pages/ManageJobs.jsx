import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { apiHelpers, handleApiError } from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { 
  Plus, Edit3, Trash2, Eye, Users, Clock, Calendar, MapPin,
  Briefcase, Star, Search, Filter, MoreHorizontal, MessageSquare,
  Loader, AlertCircle, CheckCircle, XCircle, PauseCircle,
  DollarSign, User, ExternalLink
} from 'lucide-react';
import './ManageJobs.css';

const ManageJobs = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showActionMenu, setShowActionMenu] = useState(null);
  const [actionLoading, setActionLoading] = useState({});

  useEffect(() => {
    fetchMyJobs();
  }, []);

  const fetchMyJobs = async () => {
    try {
      setLoading(true);
      const response = await apiHelpers.getMyPostedJobs();
      if (response.success) {
        setJobs(response.jobs || []);
      }
    } catch (error) {
      console.error('Error fetching jobs:', error);
      setError('Failed to fetch jobs. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleJobAction = async (jobId, action) => {
    setActionLoading(prev => ({ ...prev, [jobId]: true }));
    
    try {
      let response;
      switch(action) {
        case 'pause':
          response = await api.put(`/api/jobs/${jobId}/status`, { status: 'paused' });
          break;
        case 'activate':
          response = await api.put(`/api/jobs/${jobId}/status`, { status: 'active' });
          break;
        case 'close':
          response = await api.put(`/api/jobs/${jobId}/status`, { status: 'closed' });
          break;
        case 'delete':
          if (!window.confirm('Are you sure you want to delete this job? This action cannot be undone.')) {
            return;
          }
          response = await api.delete(`/api/jobs/${jobId}`);
          break;
        default:
          throw new Error('Invalid action');
      }

      if (response.data.success) {
        showNotification(`Job ${action === 'delete' ? 'deleted' : 'updated'} successfully!`, 'success');
        fetchMyJobs(); // Refresh the jobs list
      }
    } catch (error) {
      console.error(`Error ${action}ing job:`, error);
      const errorInfo = handleApiError(error);
      showNotification(errorInfo.message, 'error');
    } finally {
      setActionLoading(prev => ({ ...prev, [jobId]: false }));
      setShowActionMenu(null);
    }
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
      background: ${type === 'success' ? '#10b981' : '#ef4444'};
      color: white;
      border-radius: 8px;
      font-weight: 500;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      if (notification.parentNode) {
        document.body.removeChild(notification);
      }
    }, 3000);
  };

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         job.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || job.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status) => {
    switch(status?.toLowerCase()) {
      case 'active': return 'success';
      case 'paused': return 'warning';
      case 'closed': return 'danger';
      case 'draft': return 'secondary';
      default: return 'success';
    }
  };

  const getStatusIcon = (status) => {
    switch(status?.toLowerCase()) {
      case 'active': return <CheckCircle size={16} />;
      case 'paused': return <PauseCircle size={16} />;
      case 'closed': return <XCircle size={16} />;
      case 'draft': return <Clock size={16} />;
      default: return <CheckCircle size={16} />;
    }
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

  if (loading) {
    return (
      <div className="manage-jobs-container">
        <div className="loading-state">
          <Loader className="animate-spin" size={32} />
          <h3>Loading Your Jobs...</h3>
          <p>Please wait while we fetch your job postings</p>
        </div>
      </div>
    );
  }

  return (
    <div className="manage-jobs-container">
      {/* Header Section */}
      <div className="manage-jobs-header">
        <div className="header-content">
          <div className="header-info">
            <h1>Manage Jobs</h1>
            <p>View and manage all your job postings in one place</p>
          </div>
          <button 
            className="btn btn-primary"
            onClick={() => navigate('/post-job')}
          >
            <Plus size={18} />
            Post New Job
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="jobs-filters">
        <div className="search-box">
          <Search size={20} />
          <input
            type="text"
            placeholder="Search jobs by title or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="filter-group">
          <Filter size={18} />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="closed">Closed</option>
            <option value="draft">Draft</option>
          </select>
        </div>
      </div>

      {/* Jobs Stats */}
      <div className="jobs-stats">
        <div className="stat-item">
          <div className="stat-value">{jobs.length}</div>
          <div className="stat-label">Total Jobs</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">
            {jobs.filter(job => job.status === 'active' || !job.status).length}
          </div>
          <div className="stat-label">Active</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">
            {jobs.reduce((total, job) => total + (job.applicationCount || 0), 0)}
          </div>
          <div className="stat-label">Applications</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">
            {jobs.reduce((total, job) => total + (job.views || 0), 0)}
          </div>
          <div className="stat-label">Total Views</div>
        </div>
      </div>

      {/* Jobs List */}
      {filteredJobs.length > 0 ? (
        <div className="jobs-list">
          {filteredJobs.map(job => (
            <div key={job._id} className="job-card">
              <div className="job-header">
                <div className="job-main-info">
                  <h3 className="job-title">{job.title}</h3>
                  <div className="job-meta">
                    <span className="job-budget">
                      <DollarSign size={16} />
                      ₹{job.budget?.min?.toLocaleString('en-IN') || '20,000'} - 
                      ₹{job.budget?.max?.toLocaleString('en-IN') || '25,000'}
                    </span>
                    <span className="job-location">
                      <MapPin size={16} />
                      {job.location || 'Remote'}
                    </span>
                    <span className="job-posted">
                      <Calendar size={16} />
                      {formatTimeAgo(job.createdAt)}
                    </span>
                  </div>
                </div>
                
                <div className="job-status-actions">
                  <div className={`status-badge status-${getStatusColor(job.status)}`}>
                    {getStatusIcon(job.status)}
                    {(job.status || 'active').charAt(0).toUpperCase() + (job.status || 'active').slice(1)}
                  </div>
                  
                  <div className="job-actions">
                    <button
                      className="action-btn"
                      onClick={() => setShowActionMenu(showActionMenu === job._id ? null : job._id)}
                    >
                      <MoreHorizontal size={18} />
                    </button>
                    
                    {showActionMenu === job._id && (
                      <div className="action-menu">
                        <button onClick={() => navigate(`/jobs/${job._id}`)}>
                          <Eye size={16} />
                          View Job
                        </button>
                        <button onClick={() => navigate(`/job/${job._id}/applications`)}>
                          <Users size={16} />
                          Applications ({job.applicationCount || 0})
                        </button>
                        <button onClick={() => navigate(`/client-messages?job=${job._id}`)}>
                          <MessageSquare size={16} />
                          Messages
                        </button>
                        <button onClick={() => navigate(`/post-job?edit=${job._id}`)}>
                          <Edit3 size={16} />
                          Edit Job
                        </button>
                        
                        <hr />
                        
                        {job.status === 'active' ? (
                          <button 
                            onClick={() => handleJobAction(job._id, 'pause')}
                            disabled={actionLoading[job._id]}
                          >
                            <PauseCircle size={16} />
                            Pause Job
                          </button>
                        ) : (
                          <button 
                            onClick={() => handleJobAction(job._id, 'activate')}
                            disabled={actionLoading[job._id]}
                          >
                            <CheckCircle size={16} />
                            Activate Job
                          </button>
                        )}
                        
                        <button 
                          onClick={() => handleJobAction(job._id, 'close')}
                          disabled={actionLoading[job._id]}
                        >
                          <XCircle size={16} />
                          Close Job
                        </button>
                        
                        <button 
                          onClick={() => handleJobAction(job._id, 'delete')}
                          disabled={actionLoading[job._id]}
                          className="danger"
                        >
                          <Trash2 size={16} />
                          Delete Job
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="job-description">
                <p>{job.description.substring(0, 150)}...</p>
              </div>

              <div className="job-stats">
                <div className="stat">
                  <Users size={16} />
                  <span>{job.applicationCount || 0} Applications</span>
                </div>
                <div className="stat">
                  <Eye size={16} />
                  <span>{job.views || 113} Views</span>
                </div>
                <div className="stat">
                  <Clock size={16} />
                  <span>Deadline: {job.deadline ? new Date(job.deadline).toLocaleDateString() : 'Not set'}</span>
                </div>
              </div>

              <div className="job-quick-actions">
                <button 
                  className="btn btn-secondary btn-sm"
                  onClick={() => navigate(`/job/${job._id}/applications`)}
                >
                  <Users size={16} />
                  View Applications
                </button>
                <button 
                  className="btn btn-outline btn-sm"
                  onClick={() => navigate(`/jobs/${job._id}`)}
                >
                  <ExternalLink size={16} />
                  View Public
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <Briefcase size={64} />
          <h3>No Jobs Found</h3>
          <p>
            {jobs.length === 0 
              ? "You haven't posted any jobs yet. Start by creating your first job posting!"
              : "No jobs match your current filters. Try adjusting your search criteria."
            }
          </p>
          <button 
            className="btn btn-primary"
            onClick={() => navigate('/post-job')}
          >
            <Plus size={18} />
            Post Your First Job
          </button>
        </div>
      )}

      <style>{`
        @keyframes slideIn {
          from { 
            transform: translateX(100%);
            opacity: 0;
          }
          to { 
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default ManageJobs;
