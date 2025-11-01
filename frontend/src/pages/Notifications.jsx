import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import './Notifications.css';

const Notifications = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, unread, read
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // ✅ BASE URL CONFIGURATION
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://samparkwork-backend.onrender.com';

  // ✅ FETCH NOTIFICATIONS
  const fetchNotifications = useCallback(async (pageNum = 1, filterType = 'all') => {
    try {
      if (pageNum === 1) setLoading(true);
      
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: '20',
        ...(filterType === 'unread' && { unreadOnly: 'true' })
      });

      const response = await fetch(`${API_BASE_URL}/api/notifications?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        
        if (pageNum === 1) {
          setNotifications(data.notifications || []);
        } else {
          setNotifications(prev => [...prev, ...(data.notifications || [])]);
        }
        
        setHasMore(data.pagination?.hasMore || false);
      } else if (response.status === 401) {
        navigate('/login');
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [navigate, API_BASE_URL]);

  // ✅ MARK AS READ
  const markAsRead = async (notificationIds) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/api/notifications/mark-read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ notificationIds })
      });

      if (response.ok) {
        // Update local state
        setNotifications(prev =>
          prev.map(notification =>
            notificationIds.includes(notification._id)
              ? { ...notification, read: true, readAt: new Date() }
              : notification
          )
        );
      }
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  // ✅ MARK ALL AS READ
  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/api/notifications/mark-all-read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setNotifications(prev =>
          prev.map(notification => ({
            ...notification,
            read: true,
            readAt: new Date()
          }))
        );
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  // ✅ HANDLE NOTIFICATION CLICK
  const handleNotificationClick = async (notification) => {
    // Mark as read if unread
    if (!notification.read) {
      await markAsRead([notification._id]);
    }

    // Navigate based on notification type
    if (notification.type === 'new_message' && notification.relatedData?.conversationId) {
      navigate(`/messages?conversation=${notification.relatedData.conversationId}`);
    } else if (notification.type === 'job_application' && notification.relatedData?.jobId) {
      navigate(`/job/${notification.relatedData.jobId}`);
    } else if (notification.type === 'job_update' && notification.relatedData?.jobId) {
      navigate(`/job/${notification.relatedData.jobId}`);
    }
  };

  // ✅ DELETE NOTIFICATION
  const deleteNotification = async (notificationId, event) => {
    event.stopPropagation();
    
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/api/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setNotifications(prev => prev.filter(n => n._id !== notificationId));
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  // ✅ FILTER CHANGE
  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    setPage(1);
    setNotifications([]);
    fetchNotifications(1, newFilter);
  };

  // ✅ LOAD MORE
  const loadMore = () => {
    if (hasMore && !loading) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchNotifications(nextPage, filter);
    }
  };

  // ✅ INITIALIZE
  useEffect(() => {
    if (user) {
      fetchNotifications(1, filter);
    }
  }, [user, fetchNotifications, filter]);

  if (!user) {
    return (
      <div className="notifications-container">
        <div className="auth-required">
          <i className="fas fa-bell fa-3x"></i>
          <h2>Sign in Required</h2>
          <p>Please sign in to view your notifications.</p>
          <button onClick={() => navigate('/login')} className="btn-primary">
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="notifications-container">
      <div className="notifications-header">
        <div className="header-title">
          <h1><i className="fas fa-bell"></i> Notifications</h1>
          <p>Stay updated with your latest activities</p>
        </div>
        
        <div className="header-actions">
          {notifications.some(n => !n.read) && (
            <button className="mark-all-read-btn" onClick={markAllAsRead}>
              <i className="fas fa-check-double"></i>
              Mark All Read
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="notification-filters">
        <button 
          className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
          onClick={() => handleFilterChange('all')}
        >
          <i className="fas fa-list"></i>
          All
        </button>
        <button 
          className={`filter-tab ${filter === 'unread' ? 'active' : ''}`}
          onClick={() => handleFilterChange('unread')}
        >
          <i className="fas fa-circle"></i>
          Unread
        </button>
        <button 
          className={`filter-tab ${filter === 'read' ? 'active' : ''}`}
          onClick={() => handleFilterChange('read')}
        >
          <i className="fas fa-check"></i>
          Read
        </button>
      </div>

      {/* Notifications List */}
      <div className="notifications-list">
        {loading && page === 1 ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="empty-state">
            <i className="fas fa-bell-slash fa-3x"></i>
            <h3>No notifications</h3>
            <p>
              {filter === 'unread' 
                ? "You're all caught up! No unread notifications." 
                : "You don't have any notifications yet."}
            </p>
          </div>
        ) : (
          <>
            {notifications.map((notification) => (
              <div
                key={notification._id}
                className={`notification-item ${!notification.read ? 'unread' : ''}`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="notification-icon">
                  <i className={`fas ${getNotificationIcon(notification.type)}`}></i>
                </div>

                <div className="notification-content">
                  <div className="notification-header">
                    <h4 className="notification-title">{notification.title}</h4>
                    <span className="notification-time">
                      {formatTimeAgo(notification.createdAt)}
                    </span>
                  </div>
                  
                  <p className="notification-message">{notification.message}</p>
                  
                  {notification.sender && (
                    <div className="notification-sender">
                      <i className="fas fa-user"></i>
                      <span>From: {notification.sender.name}</span>
                    </div>
                  )}
                </div>

                <div className="notification-actions">
                  {!notification.read && (
                    <div className="unread-indicator">
                      <i className="fas fa-circle"></i>
                    </div>
                  )}
                  
                  <button
                    className="delete-btn"
                    onClick={(e) => deleteNotification(notification._id, e)}
                    title="Delete notification"
                  >
                    <i className="fas fa-times"></i>
                  </button>
                </div>
              </div>
            ))}

            {/* Load More Button */}
            {hasMore && (
              <div className="load-more-container">
                <button 
                  className={`load-more-btn ${loading ? 'loading' : ''}`}
                  onClick={loadMore}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <div className="spinner-small"></div>
                      Loading...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-chevron-down"></i>
                      Load More
                    </>
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// ✅ HELPER FUNCTIONS
const getNotificationIcon = (type) => {
  switch (type) {
    case 'new_message': return 'fa-envelope';
    case 'job_application': return 'fa-briefcase';
    case 'job_update': return 'fa-edit';
    case 'payment': return 'fa-credit-card';
    case 'system': return 'fa-cog';
    default: return 'fa-bell';
  }
};

const formatTimeAgo = (dateString) => {
  const now = new Date();
  const date = new Date(dateString);
  const diffInSeconds = Math.floor((now - date) / 1000);
  
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  
  return date.toLocaleDateString();
};

export default Notifications;
