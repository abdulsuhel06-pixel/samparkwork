import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import logo from "../assets/logo.png";
import "./Navbar.css";

// ✅ UNIVERSAL: Enhanced Avatar Component (Fixed HTTPS URLs)
const Avatar = ({ src, name, size = 40, forceRefresh = 0, className = "" }) => {
  const [imageError, setImageError] = useState(false);
  const [imageKey, setImageKey] = useState(0);
  
  const initials = (name || "U")
    .split(" ")
    .map((n) => n[0]?.toUpperCase())
    .slice(0, 2)
    .join("");

  const getAvatarUrl = useCallback((src) => {
    if (!src) return null;
    
    if (src.startsWith('http://') || src.startsWith('https://')) {
      return `${src}${src.includes('?') ? '&' : '?'}t=${Date.now()}&r=${forceRefresh}`;
    }
    
    // ✅ CRITICAL FIX: Always use HTTPS for production, remove fallback HTTP
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://samparkwork-backend.onrender.com';
    let cleanSrc = src;
    
    if (!cleanSrc.startsWith('/uploads/avatars/')) {
      if (!cleanSrc.includes('/')) {
        cleanSrc = `/uploads/avatars/${cleanSrc}`;
      }
      else if (cleanSrc.startsWith('/uploads/') && !cleanSrc.startsWith('/uploads/avatars/')) {
        cleanSrc = cleanSrc.replace('/uploads/', '/uploads/avatars/');
      }
      else if (cleanSrc.startsWith('/') && !cleanSrc.startsWith('/uploads/')) {
        cleanSrc = `/uploads/avatars${cleanSrc}`;
      }
    }
    
    return `${baseUrl}${cleanSrc}${cleanSrc.includes('?') ? '&' : '?'}t=${Date.now()}&r=${forceRefresh}`;
  }, [forceRefresh]);

  const avatarUrl = getAvatarUrl(src);

  useEffect(() => {
    setImageError(false);
    setImageKey(prev => prev + 1);
  }, [src, forceRefresh]);

  const handleImageError = useCallback(() => {
    setImageError(true);
  }, []);

  return (
    <div className={`avatar-container ${className}`} style={{ width: size, height: size }}>
      {avatarUrl && !imageError ? (
        <img
          key={`${imageKey}-${forceRefresh}`}
          src={avatarUrl}
          alt={name || "Avatar"}
          className="avatar-image"
          onError={handleImageError}
        />
      ) : (
        <div className="avatar-fallback">
          <span>{initials}</span>
        </div>
      )}
    </div>
  );
};

// ✅ FIXED: Role Selection Modal with proper login navigation
const RoleSelectionModal = ({ isOpen, onClose, onSelect, onLoginClick }) => {
  if (!isOpen) return null;

  const handleRoleSelect = useCallback((role) => {
    onSelect(role);
    onClose();
  }, [onSelect, onClose]);

  const handleLoginClick = useCallback(() => {
    onClose();
    onLoginClick();
  }, [onClose, onLoginClick]);

  return (
    <div className="role-modal-overlay" onClick={onClose}>
      <div className="role-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="role-modal-close" onClick={onClose}>
          <i className="fas fa-times"></i>
        </button>
        
        <div className="role-modal-header">
          <h2>Join as a client or Worker</h2>
          <p>Get started with your account</p>
        </div>

        <div className="role-selection-cards">
          <div 
            className="role-card client-card"
            onClick={() => handleRoleSelect('client')}
          >
            <div className="role-card-icon">
              <i className="fas fa-user-tie"></i>
            </div>
            <div className="role-card-content">
              <h3>I'm a client, hiring skilled professionals</h3>
              <p>Find talented professionals for your business needs</p>
            </div>
            <div className="role-card-radio">
              <div className="radio-button"></div>
            </div>
          </div>

          <div 
            className="role-card freelancer-card"
            onClick={() => handleRoleSelect('professional')}
          >
            <div className="role-card-icon">
              <i className="fas fa-briefcase"></i>
            </div>
            <div className="role-card-content">
              <h3>I'm a skilled professional, looking for work</h3>
              <p>Finds best work opportunities</p>
            </div>
            <div className="role-card-radio">
              <div className="radio-button"></div>
            </div>
          </div>
        </div>

        <div className="role-modal-footer">
          <p>Already have an account? <button className="link-button" onClick={handleLoginClick}>Log In</button></p>
        </div>
      </div>
    </div>
  );
};

const Navbar = () => {
  const { user, logout, loading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDesktopDropdownOpen, setIsDesktopDropdownOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [avatarRefreshKey, setAvatarRefreshKey] = useState(0);
  const [authState, setAuthState] = useState({ user: null, isAuthenticated: false });
  // ✅ NEW: Notification states
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const dropdownRef = useRef(null);

  // ✅ CRITICAL FIX: Proper auth state handling to prevent render-time updates
  useEffect(() => {
    const handleAuthStateChange = (event) => {
      // ✅ Use setTimeout to ensure state update happens after render
      setTimeout(() => {
        setAuthState({
          user: event.detail.user,
          isAuthenticated: event.detail.isAuthenticated
        });
        setAvatarRefreshKey(prev => prev + 1);
      }, 0);
    };

    const handleUserLoggedIn = () => {
      // ✅ Use setTimeout to ensure state update happens after render
      setTimeout(() => {
        setAvatarRefreshKey(prev => prev + 1);
      }, 0);
    };

    window.addEventListener('authStateChanged', handleAuthStateChange);
    window.addEventListener('userLoggedIn', handleUserLoggedIn);
    
    return () => {
      window.removeEventListener('authStateChanged', handleAuthStateChange);
      window.removeEventListener('userLoggedIn', handleUserLoggedIn);
    };
  }, []);

  // ✅ CRITICAL FIX: Update avatar when user changes without causing render warnings
  useEffect(() => {
    if (user && isAuthenticated) {
      // ✅ Use requestAnimationFrame to ensure update happens after render
      requestAnimationFrame(() => {
        setAvatarRefreshKey(prev => prev + 1);
      });
    }
  }, [user?.avatar, user?.avatarUrl, user?._id, isAuthenticated]);

  // ✅ NEW: Fetch notification count when user is authenticated
  useEffect(() => {
    if (user && isAuthenticated) {
      fetchUnreadCount();
      const interval = setInterval(fetchUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [user, isAuthenticated]);

  // ✅ NEW: Fetch unread notification count
  const fetchUnreadCount = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'https://samparkwork-backend.onrender.com'}/api/notifications/unread-count`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUnreadNotifications(data.unreadCount || 0);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  // ✅ CRITICAL: Desktop dropdown click outside handler
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDesktopDropdownOpen(false);
      }
    };

    if (isDesktopDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDesktopDropdownOpen]);

  const toggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(prev => !prev);
  }, []);

  const closeMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
  }, []);

  // ✅ CRITICAL: Desktop dropdown toggle
  const toggleDesktopDropdown = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDesktopDropdownOpen(prev => !prev);
  }, []);

  const closeDesktopDropdown = useCallback(() => {
    setIsDesktopDropdownOpen(false);
  }, []);

  const handleSignUpClick = useCallback(() => {
    setIsRoleModalOpen(true);
  }, []);

  const handleRoleSelect = useCallback((role) => {
    navigate(`/signup?role=${role}`);
  }, [navigate]);

  // ✅ FIXED: Login handler for role modal
  const handleLoginFromModal = useCallback(() => {
    navigate('/login');
  }, [navigate]);

  const handleLogout = useCallback(() => {
    logout();
    navigate("/");
    setIsMobileMenuOpen(false);
    setIsDesktopDropdownOpen(false);
    // ✅ NEW: Reset notifications
    setUnreadNotifications(0);
  }, [logout, navigate]);

  const getAvatarSrc = useCallback(() => {
    if (user?.avatarUrl) return user.avatarUrl;
    if (user?.normalizedAvatarUrl) return user.normalizedAvatarUrl;
    if (user?.avatar) return user.avatar;
    return null;
  }, [user?.avatarUrl, user?.normalizedAvatarUrl, user?.avatar]);

  const avatarSrc = getAvatarSrc();
  const firstName = user?.name?.split(' ')[0] || 'User';
  const unreadMessagesCount = user?.unreadMessages || 0;

  return (
    <>
      {/* ✅ MOBILE-FIRST NAVBAR - ADDED NOTIFICATION BELL */}
      <nav className="mobile-first-navbar">
        <div className="mobile-navbar-container">
          {/* Left: Menu Button */}
          <div className="mobile-navbar-left">
            <button 
              className={`mobile-menu-trigger ${isMobileMenuOpen ? 'active' : ''}`}
              onClick={toggleMobileMenu}
              aria-label="Toggle menu"
            >
              <span></span>
              <span></span>
              <span></span>
            </button>
          </div>

          {/* Center: Logo */}
          <div className="mobile-navbar-center">
            <Link to="/" className="mobile-brand" onClick={closeMobileMenu}>
              <img src={logo} alt="Sampark Connect" className="mobile-brand-logo" />
              <span className="mobile-brand-text">Sampark Work</span>
            </Link>
          </div>

          {/* Right: Sign Up or User Profile + Notification */}
          <div className="mobile-navbar-right">
            {loading ? (
              <div className="mobile-loading">
                <div className="mobile-spinner"></div>
              </div>
            ) : user ? (
              <div className="mobile-user-section">
                {/* ✅ NEW: Mobile notification bell */}
                <Link to="/notifications" className="mobile-notification-bell">
                  <i className="fas fa-bell"></i>
                  {unreadNotifications > 0 && (
                    <span className="mobile-notification-count">{unreadNotifications}</span>
                  )}
                </Link>
                
                <div className="mobile-user-profile">
                  <Avatar 
                    src={avatarSrc} 
                    name={user?.name} 
                    size={36} 
                    forceRefresh={avatarRefreshKey}
                    className="mobile-avatar"
                  />
                  <span className="mobile-username">{firstName}</span>
                </div>
              </div>
            ) : (
              <button className="mobile-signup-btn" onClick={handleSignUpClick}>
                Sign up
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* ✅ MOBILE MENU OVERLAY - UNCHANGED */}
      {isMobileMenuOpen && (
        <>
          <div className="mobile-menu-overlay" onClick={closeMobileMenu}></div>
          <div className="mobile-menu-drawer">
            {user ? (
              // Authenticated Menu
              <>
                <div className="mobile-menu-header">
                  <div className="mobile-menu-user">
                    <Avatar 
                      src={avatarSrc} 
                      name={user?.name} 
                      size={48} 
                      forceRefresh={avatarRefreshKey}
                      className="mobile-avatar"
                    />
                    <div className="mobile-menu-user-info">
                      <span className="mobile-menu-user-name">{user?.name}</span>
                      <span className="mobile-menu-user-role">
                        {user?.role === 'professional' ? 'Professional' : 'Client'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mobile-menu-content">
                  <ul className="mobile-menu-list">
                    <li>
                      <NavLink to="/" onClick={closeMobileMenu}>
                        <i className="fas fa-home"></i>
                        <span>Home</span>
                      </NavLink>
                    </li>
                    <li>
                      <NavLink to="/find-jobs" onClick={closeMobileMenu}>
                        <i className="fas fa-briefcase"></i>
                        <span>Find Jobs</span>
                      </NavLink>
                    </li>
                    <li>
                      <NavLink to="/find-talents" onClick={closeMobileMenu}>
                        <i className="fas fa-users"></i>
                        <span>Find Talents</span>
                      </NavLink>
                    </li>
                    <li>
                      <NavLink to="/categories" onClick={closeMobileMenu}>
                        <i className="fas fa-th-large"></i>
                        <span>Categories</span>
                      </NavLink>
                    </li>
                    <li>
                      <NavLink to="/profile" onClick={closeMobileMenu}>
                        <i className="fas fa-user"></i>
                        <span>My Profile</span>
                      </NavLink>
                    </li>
                    <li>
                      <NavLink to="/messages" onClick={closeMobileMenu}>
                        <i className="fas fa-envelope"></i>
                        <span>Messages</span>
                      </NavLink>
                    </li>
                    {/* ✅ NEW: Notifications menu item */}
                    <li>
                      <NavLink to="/notifications" onClick={closeMobileMenu}>
                        <i className="fas fa-bell"></i>
                        <span>Notifications</span>
                        {unreadNotifications > 0 && (
                          <span className="notification-badge">{unreadNotifications}</span>
                        )}
                      </NavLink>
                    </li>
                    {user?.role === "admin" && (
                      <li>
                        <NavLink to="/admin" onClick={closeMobileMenu}>
                          <i className="fas fa-shield-alt"></i>
                          <span>Admin</span>
                        </NavLink>
                      </li>
                    )}
                  </ul>

                  <div className="mobile-menu-footer">
                    <button className="mobile-logout-btn" onClick={handleLogout}>
                      <i className="fas fa-sign-out-alt"></i>
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              </>
            ) : (
              // Guest Menu - UNCHANGED
              <>
                <div className="mobile-menu-header">
                  <h3>Menu</h3>
                </div>

                <div className="mobile-menu-content">
                  <ul className="mobile-menu-list">
                    <li>
                      <NavLink to="/" onClick={closeMobileMenu}>
                        <i className="fas fa-home"></i>
                        <span>Home</span>
                      </NavLink>
                    </li>
                    <li>
                      <NavLink to="/find-jobs" onClick={closeMobileMenu}>
                        <i className="fas fa-briefcase"></i>
                        <span>Find Jobs</span>
                      </NavLink>
                    </li>
                    <li>
                      <NavLink to="/find-talents" onClick={closeMobileMenu}>
                        <i className="fas fa-users"></i>
                        <span>Find Talents</span>
                      </NavLink>
                    </li>
                    <li>
                      <NavLink to="/categories" onClick={closeMobileMenu}>
                        <i className="fas fa-th-large"></i>
                        <span>Categories</span>
                      </NavLink>
                    </li>
                    <li>
                      <NavLink to="/about" onClick={closeMobileMenu}>
                        <i className="fas fa-info-circle"></i>
                        <span>About</span>
                      </NavLink>
                    </li>
                  </ul>

                  <div className="mobile-menu-auth">
                    <Link to="/login" className="mobile-auth-btn login" onClick={closeMobileMenu}>
                      <i className="fas fa-sign-in-alt"></i>
                      Login
                    </Link>
                    <button className="mobile-auth-btn signup" onClick={() => {
                      closeMobileMenu();
                      handleSignUpClick();
                    }}>
                      <i className="fas fa-user-plus"></i>
                      Sign Up
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* ✅ FIXED: Role Selection Modal with proper login navigation - UNCHANGED */}
      <RoleSelectionModal 
        isOpen={isRoleModalOpen}
        onClose={() => setIsRoleModalOpen(false)}
        onSelect={handleRoleSelect}
        onLoginClick={handleLoginFromModal}
      />

      {/* ✅ DESKTOP NAV - NOTIFICATION BELL ALREADY ADDED */}
      <nav className="desktop-navbar">
        <div className="navbar-container">
          <Link to="/" className="navbar-brand">
            <img src={logo} alt="Sampark Connect" className="brand-logo" />
            <span className="brand-text">Sampark Work</span>
          </Link>

          <div className="navbar-center-nav">
            <ul className="navbar-nav-horizontal">
              <li><NavLink to="/" className="nav-link-horizontal text-black"><i className="fas fa-home nav-icon text-black"></i><span>Home</span></NavLink></li>
              <li><NavLink to="/find-jobs" className="nav-link-horizontal text-black"><i className="fas fa-briefcase nav-icon text-black"></i><span>Find Jobs</span></NavLink></li>
              <li><NavLink to="/find-talents" className="nav-link-horizontal text-black"><i className="fas fa-users nav-icon text-black"></i><span>Find Talents</span></NavLink></li>
              <li><NavLink to="/categories" className="nav-link-horizontal text-black"><i className="fas fa-th-large nav-icon text-black"></i><span>Categories</span></NavLink></li>
              <li><NavLink to="/about" className="nav-link-horizontal text-black"><i className="fas fa-info-circle nav-icon text-black"></i><span>About</span></NavLink></li>
              {user && user.role === "admin" && (
                <li><NavLink to="/admin" className="nav-link-horizontal admin-link"><i className="fas fa-shield-alt nav-icon"></i><span>Admin</span></NavLink></li>
              )}
            </ul>
          </div>

          <div className="navbar-auth-section">
            {loading ? (
              <div className="loading-indicator">
                <i className="fas fa-spinner fa-spin"></i>
                <span>Loading...</span>
              </div>
            ) : user ? (
              // ✅ DESKTOP: Notification bell + user dropdown
              <div className="navbar-user-section">
                {/* ✅ Desktop notification bell */}
                <Link to="/notifications" className="notification-bell">
                  <i className="fas fa-bell"></i>
                  {unreadNotifications > 0 && (
                    <span className="notification-count">{unreadNotifications}</span>
                  )}
                </Link>

                {/* ✅ UNCHANGED: Existing user dropdown */}
                <div className="user-dropdown-section" ref={dropdownRef}>
                  <button 
                    type="button"
                    className={`user-menu-trigger ${isDesktopDropdownOpen ? 'active' : ''}`}
                    onClick={toggleDesktopDropdown}
                    aria-expanded={isDesktopDropdownOpen}
                  >
                    <Avatar 
                      src={avatarSrc} 
                      name={user?.name} 
                      size={40} 
                      forceRefresh={avatarRefreshKey}
                      className="desktop-avatar"
                    />
                    <div className="user-info">
                      <span className="user-name">{user?.name || "User"}</span>
                      <span className="user-role">
                        {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : "User"}
                      </span>
                    </div>
                    <i className={`fas fa-chevron-down dropdown-arrow ${isDesktopDropdownOpen ? 'open' : ''}`}></i>
                  </button>
                  
                  {/* ✅ UNCHANGED: Working Desktop Dropdown Menu */}
                  <div className={`user-dropdown-menu ${isDesktopDropdownOpen ? 'show' : ''}`}>
                    <div className="dropdown-header">
                      <div className="dropdown-user-info">
                        <Avatar 
                          src={avatarSrc} 
                          name={user?.name} 
                          size={44} 
                          forceRefresh={avatarRefreshKey}
                          className="desktop-avatar"
                        />
                        <div className="dropdown-user-details">
                          <div className="dropdown-user-name">{user?.name || "User"}</div>
                          <div className="dropdown-user-email">{user?.email}</div>
                          <div className="dropdown-user-role">
                            <i className="fas fa-crown"></i>
                            {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : "User"}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="dropdown-body">
                      <Link className="dropdown-item" to="/profile" onClick={closeDesktopDropdown}>
                        <div className="dropdown-icon">
                          <i className="fas fa-user"></i>
                        </div>
                        <span className="dropdown-text">View Profile</span>
                      </Link>
                      
                      <Link className="dropdown-item" to="/messages" onClick={closeDesktopDropdown}>
                        <div className="dropdown-icon">
                          <i className="fas fa-envelope"></i>
                        </div>
                        <span className="dropdown-text">Messages</span>
                        {unreadMessagesCount > 0 && (
                          <span className="notification-badge">{unreadMessagesCount}</span>
                        )}
                      </Link>

                      {/* ✅ NEW: Notifications dropdown item */}
                      <Link className="dropdown-item" to="/notifications" onClick={closeDesktopDropdown}>
                        <div className="dropdown-icon">
                          <i className="fas fa-bell"></i>
                        </div>
                        <span className="dropdown-text">Notifications</span>
                        {unreadNotifications > 0 && (
                          <span className="notification-badge">{unreadNotifications}</span>
                        )}
                      </Link>
                      
                      <Link className="dropdown-item" to="/settings" onClick={closeDesktopDropdown}>
                        <div className="dropdown-icon">
                          <i className="fas fa-cog"></i>
                        </div>
                        <span className="dropdown-text">Settings</span>
                      </Link>
                      
                      {user?.role === "admin" && (
                        <>
                          <div className="dropdown-divider"></div>
                          <Link className="dropdown-item admin-item" to="/dashboard" onClick={closeDesktopDropdown}>
                            <div className="dropdown-icon">
                              <i className="fas fa-tachometer-alt"></i>
                            </div>
                            <span className="dropdown-text">Dashboard</span>
                          </Link>
                        </>
                      )}
                      
                      <div className="dropdown-divider"></div>
                      
                      <button 
                        type="button"
                        className="dropdown-item logout-item" 
                        onClick={handleLogout}
                      >
                        <div className="dropdown-icon">
                          <i className="fas fa-sign-out-alt"></i>
                        </div>
                        <span className="dropdown-text">Logout</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              // ✅ UNCHANGED: Shows BOTH Login and Signup buttons in desktop view
              <div className="auth-buttons-professional">
                <Link 
                  to="/login" 
                  className="btn-professional btn-login-professional"
                >
                  <i className="fas fa-sign-in-alt"></i>
                  <span>Login</span>
                </Link>
                <button 
                  className="btn-professional btn-signup-professional" 
                  onClick={handleSignUpClick}
                >
                  <i className="fas fa-user-plus"></i>
                  <span>Sign Up</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>
    </>
  );
};

export default Navbar;
