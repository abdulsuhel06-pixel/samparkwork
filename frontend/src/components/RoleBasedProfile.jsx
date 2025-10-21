import React, { useContext, useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { apiHelpers, handleApiError } from '../services/api';
import ProfessionalProfile from './ProfessionalProfile';
import ClientProfile from './ClientProfile';
import AdminProfile from './AdminProfile';
import { User, AlertCircle } from 'lucide-react';
import './Profile.css';

const RoleBasedProfile = () => {
  const { userId } = useParams(); // For viewing other user profiles
  const { user: authUser, loading: authLoading, token } = useContext(AuthContext);
  
  const [profile, setProfile] = useState(authUser);
  const [viewingUser, setViewingUser] = useState(null); // User being viewed
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ✅ CRITICAL FIX: Determine if viewing other profile properly
  const isViewingOtherProfile = userId && userId !== authUser?._id;

  console.log('🔍 RoleBasedProfile - Current user:', authUser?.email || 'Not logged in');
  console.log('🔍 RoleBasedProfile - Viewing userId:', userId || 'Own profile');
  console.log('🔍 RoleBasedProfile - Is viewing other profile:', isViewingOtherProfile);

  // ✅ CRITICAL FIX: Proper profile fetching with correct dependencies
  const fetchUserProfile = useCallback(async (targetUserId) => {
    if (!targetUserId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      console.log("🔍 [RoleBasedProfile] Fetching user profile for ID:", targetUserId);
      
      const response = await apiHelpers.getUserById(targetUserId);
      
      if (response.success) {
        console.log("✅ [RoleBasedProfile] User profile loaded:", response.user.email);
        setViewingUser(response.user);
      } else {
        throw new Error('User profile not found');
      }
    } catch (error) {
      console.error('❌ [RoleBasedProfile] Error fetching user profile:', error);
      const errorInfo = handleApiError(error);
      setError(errorInfo.message);
    } finally {
      setLoading(false);
    }
  }, []); // ✅ No dependencies to prevent infinite calls

  // ✅ CRITICAL FIX: Proper useEffect with correct dependencies
  useEffect(() => {
    if (isViewingOtherProfile) {
      // Viewing someone else's profile
      fetchUserProfile(userId);
    } else {
      // Viewing own profile
      if (authUser) {
        setProfile(authUser);
        setLoading(false);
      } else if (!authLoading && !token) {
        setError("Please log in to view profile");
        setLoading(false);
      }
    }
  }, [userId, authUser, authLoading, token, isViewingOtherProfile, fetchUserProfile]);

  // ✅ Enhanced loading state
  if (authLoading || loading) {
    return (
      <div className="profile-wrapper">
        <div className="profile-loading">
          <div className="loading-spinner"></div>
          <div className="loading-content">
            <h3>Loading {isViewingOtherProfile ? 'User' : 'Your'} Profile</h3>
            <p>Please wait while we fetch the information...</p>
          </div>
        </div>
      </div>
    );
  }

  // ✅ Enhanced error state
  if (error || (!profile && !isViewingOtherProfile) || (isViewingOtherProfile && !viewingUser)) {
    return (
      <div className="profile-wrapper">
        <div className="profile-error">
          <div className="error-icon">
            <AlertCircle size={64} />
          </div>
          <h3>
            {error ? 'Profile Loading Error' : 
             isViewingOtherProfile ? 'User Profile Not Found' : 
             'Please log in to view your profile'}
          </h3>
          <p className="error-message">
            {error || 
             (isViewingOtherProfile ? 'The requested user profile could not be found.' : 
              'You need to be authenticated to access this page.')}
          </p>
          <div className="error-actions">
            {!isViewingOtherProfile && !authUser ? (
              <button 
                className="login-redirect-btn"
                onClick={() => window.location.href = '/login'}
              >
                <i className="fas fa-sign-in-alt"></i>
                <span>Go to Login</span>
              </button>
            ) : (
              <button 
                className="back-btn"
                onClick={() => window.history.back()}
              >
                <i className="fas fa-arrow-left"></i>
                <span>Go Back</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ✅ Role-based component rendering
  const renderProfile = () => {
    const targetUser = isViewingOtherProfile ? viewingUser : profile;
    const userRole = targetUser?.role?.toLowerCase();
    
    console.log(`✅ Loading ${userRole} Profile ${isViewingOtherProfile ? '(View Only)' : '(Owner)'}`);
    
    switch(userRole) {
      case 'professional':
        return <ProfessionalProfile user={targetUser} isViewOnly={isViewingOtherProfile} />;
        
      case 'client':
        return <ClientProfile user={targetUser} isViewOnly={isViewingOtherProfile} />;
        
      case 'admin':
        return <AdminProfile user={targetUser} isViewOnly={isViewingOtherProfile} />;
        
      default:
        console.log('⚠️ Unknown role, loading default Professional Profile');
        return <ProfessionalProfile user={targetUser} isViewOnly={isViewingOtherProfile} />;
    }
  };

  const targetUser = isViewingOtherProfile ? viewingUser : profile;

  return (
    <div className={`profile-wrapper ${targetUser?.role?.toLowerCase() || 'professional'}-theme`}>
      {/* Role indicator badge */}
      <div className="role-indicator-badge">
        <i className={`fas ${getRoleIcon(targetUser?.role)}`}></i>
        <span>
          {isViewingOtherProfile 
            ? `${targetUser?.name}'s ${targetUser?.role?.charAt(0)?.toUpperCase() + targetUser?.role?.slice(1)} Profile`
            : `${targetUser?.role?.charAt(0)?.toUpperCase() + targetUser?.role?.slice(1)} Dashboard`
          }
        </span>
        {isViewingOtherProfile && (
          <span className="view-only-badge">View Only</span>
        )}
      </div>
      
      {renderProfile()}
    </div>
  );
};

// Helper function for role-specific icons
const getRoleIcon = (role) => {
  const icons = {
    admin: 'fa-shield-alt',
    professional: 'fa-briefcase',
    client: 'fa-building',
  };
  return icons[role?.toLowerCase()] || 'fa-user';
};

export default RoleBasedProfile;
