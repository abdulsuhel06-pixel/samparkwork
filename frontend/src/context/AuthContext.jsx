import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiHelpers, handleApiError } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState(() => localStorage.getItem('wn_token')); // ✅ FIXED: Use wn_token

  // ✅ Enhanced event dispatching
  const dispatchAuthEvent = useCallback((userData, isAuth) => {
    requestAnimationFrame(() => {
      window.dispatchEvent(new CustomEvent('authStateChanged', { 
        detail: { user: userData, isAuthenticated: isAuth, timestamp: Date.now() }
      }));
    });
  }, []);

  // ✅ CRITICAL FIX: Avatar URL helper with CORRECT production URL
  const getAvatarUrl = useCallback((avatar) => {
    if (!avatar) return null;
    
    if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
      return avatar;
    }
    
    // ✅ CRITICAL FIX: Use CORRECT production backend URL
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://samparkwork-backend.onrender.com'  // ✅ FIXED: CORRECT URL!
      : 'http://localhost:5000';
    
    if (avatar.startsWith('/uploads/avatars/')) {
      return `${baseUrl}${avatar}`;
    } else if (avatar.startsWith('uploads/avatars/')) {
      return `${baseUrl}/${avatar}`;
    } else if (avatar.startsWith('/uploads/')) {
      return `${baseUrl}${avatar}`;
    } else if (avatar.startsWith('uploads/')) {
      return `${baseUrl}/${avatar}`;
    } else {
      return `${baseUrl}/uploads/avatars/${avatar}`;
    }
  }, []);

  const isClient = useCallback(() => user?.role === 'client', [user?.role]);
  const isProfessional = useCallback(() => user?.role === 'professional', [user?.role]);
  const isAdmin = useCallback(() => user?.role === 'admin', [user?.role]);
  const canPostJobs = useCallback(() => user?.role === 'client' || user?.role === 'admin', [user?.role]);
  const canApplyToJobs = useCallback(() => user?.role === 'professional', [user?.role]);

  // ✅ CRITICAL FIX: Load stored user data first, then verify with API
  useEffect(() => {
    let isMounted = true;
    
    const initializeAuth = async () => {
      if (!isMounted) return;
      
      console.log('🔍 [AuthContext] === INITIALIZING AUTH ===');
      
      if (!token) {
        console.log('❌ [AuthContext] No token found');
        if (isMounted) {
          setLoading(false);
        }
        return;
      }

      // ✅ CRITICAL FIX: Load stored user data FIRST
      const storedUser = localStorage.getItem('wn_user');
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          console.log('📦 [AuthContext] Loading stored user data:', {
            name: parsedUser.name,
            title: parsedUser.title,
            category: parsedUser.category,
            subcategory: parsedUser.subcategory
          });
          
          if (parsedUser.avatar && !parsedUser.avatarUrl) {
            parsedUser.avatarUrl = getAvatarUrl(parsedUser.avatar);
          }
          
          setUser(parsedUser);
          setIsAuthenticated(true);
          dispatchAuthEvent(parsedUser, true);
          console.log('✅ [AuthContext] Stored user data loaded successfully');
        } catch (parseError) {
          console.error('❌ [AuthContext] Failed to parse stored user:', parseError);
        }
      }

      // ✅ ENHANCED: Then verify/refresh with API (but don't overwrite unless newer)
      try {
        console.log('📞 [AuthContext] Verifying auth with API...');
        const response = await apiHelpers.getProfile(); // Use getProfile instead of getMe for full data
        
        if (!isMounted) return;
        
        if (response.success && response.user) {
          console.log('✅ [AuthContext] API verification successful');
          console.log('📊 [AuthContext] API user data:', {
            name: response.user.name,
            title: response.user.title,
            category: response.user.category,
            subcategory: response.user.subcategory
          });
          
          const apiUserData = { ...response.user };
          
          if (apiUserData.avatar && !apiUserData.avatarUrl) {
            apiUserData.avatarUrl = getAvatarUrl(apiUserData.avatar);
          }
          
          // ✅ CRITICAL FIX: Only update if API data is newer or different
          setUser(prevUser => {
            if (!prevUser) {
              console.log('🔄 [AuthContext] No previous user, using API data');
              localStorage.setItem('wn_user', JSON.stringify(apiUserData));
              dispatchAuthEvent(apiUserData, true);
              return apiUserData;
            }
            
            // Check if API data has meaningful updates
            const hasUpdatedData = ['name', 'title', 'category', 'subcategory', 'bio', 'email'].some(field => {
              const apiValue = apiUserData[field] || '';
              const currentValue = prevUser[field] || '';
              return apiValue !== currentValue && apiValue.trim() !== '';
            });
            
            // Check contact data
            const apiContact = apiUserData.contact || {};
            const currentContact = prevUser.contact || {};
            const hasUpdatedContact = ['phone', 'address'].some(field => {
              const apiValue = apiContact[field] || '';
              const currentValue = currentContact[field] || '';
              return apiValue !== currentValue && apiValue.trim() !== '';
            });
            
            if (hasUpdatedData || hasUpdatedContact) {
              console.log('🔄 [AuthContext] API has newer data, updating user state');
              localStorage.setItem('wn_user', JSON.stringify(apiUserData));
              dispatchAuthEvent(apiUserData, true);
              return apiUserData;
            } else {
              console.log('ℹ️ [AuthContext] API data matches stored data, keeping current state');
              return prevUser;
            }
          });
          
          setIsAuthenticated(true);
        } else {
          throw new Error('Invalid API response format');
        }
      } catch (error) {
        console.error('❌ [AuthContext] API verification failed:', error);
        
        if (isMounted) {
          const errorInfo = handleApiError(error);
          if (errorInfo.type === 'auth') {
            logout();
          }
          // If API fails but we have stored data, continue with stored data
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();
    
    return () => {
      isMounted = false;
    };
  }, [token, getAvatarUrl, dispatchAuthEvent]);

  // ✅ UPDATED: Enhanced login function with Google Auth support
  const login = async (credentials, authType = 'manual') => {
    try {
      console.log(`🔑 [AuthContext] ${authType} login attempt:`, { 
        email: credentials.email,
        authType 
      });
      setLoading(true);
      
      let response;
      if (authType === 'google') {
        // Handle Google Auth login
        response = await apiHelpers.googleAuth({
          ...credentials,
          action: 'login'
        });
      } else {
        // Handle manual login
        response = await apiHelpers.login(credentials);
      }
      
      if (response.success && response.token && response.user) {
        console.log(`✅ [AuthContext] ${authType} login successful for:`, response.user.email);
        
        const userData = { 
          ...response.user,
          authType // Track how user logged in
        };
        
        if (userData.avatar && !userData.avatarUrl) {
          userData.avatarUrl = getAvatarUrl(userData.avatar);
        }
        
        localStorage.setItem('wn_token', response.token); // ✅ FIXED: Use wn_token
        localStorage.setItem('wn_user', JSON.stringify(userData));
        
        setToken(response.token);
        setUser(userData);
        setIsAuthenticated(true);
        
        dispatchAuthEvent(userData, true);
        
        return { success: true, user: userData };
      } else {
        throw new Error(response.message || `${authType} login failed`);
      }
    } catch (error) {
      console.error(`❌ [AuthContext] ${authType} login error:`, error);
      const errorInfo = handleApiError(error, `${authType} Login`); // ✅ Pass context for better error handling
      return { 
        success: false, 
        error: errorInfo.message 
      };
    } finally {
      setLoading(false);
    }
  };

  // ✅ FIXED: Google OAuth login function - CRITICAL FIX
  const googleLogin = async (credential) => {
    setLoading(true);
    
    try {
      console.log('🔐 [AuthContext] Google OAuth login attempt...');
      
      // ✅ CRITICAL FIX: Use correct API endpoint
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/oauth/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ credential }),
      });

      const data = await response.json();
      
      console.log('🔐 [AuthContext] Backend response:', data);

      if (!response.ok) {
        throw new Error(data.message || `Google authentication failed (${response.status})`);
      }

      console.log('✅ [AuthContext] Google OAuth successful:', data.user.name);

      const userData = { 
        ...data.user,
        authType: 'google' // Mark as Google OAuth user
      };

      if (userData.avatar && !userData.avatarUrl) {
        userData.avatarUrl = getAvatarUrl(userData.avatar);
      }
      
      // Store user and token
      localStorage.setItem('wn_token', data.token);
      localStorage.setItem('wn_user', JSON.stringify(userData));
      
      setToken(data.token);
      setUser(userData);
      setIsAuthenticated(true);
      
      dispatchAuthEvent(userData, true);

      return { success: true, user: userData };
      
    } catch (error) {
      console.error('❌ [AuthContext] Google OAuth error:', error);
      const errorInfo = handleApiError(error, 'Google OAuth');
      throw new Error(errorInfo.message);
    } finally {
      setLoading(false);
    }
  };

  const logout = useCallback(() => {
    console.log('🚪 [AuthContext] Logging out user');
    
    localStorage.removeItem('wn_token'); // ✅ FIXED: Use wn_token
    localStorage.removeItem('wn_user');
    
    setUser(null);
    setIsAuthenticated(false);
    setToken(null);
    
    dispatchAuthEvent(null, false);
  }, [dispatchAuthEvent]);

  // ✅ UPDATED: Enhanced register function with Google Auth support
  const register = async (userData, authType = 'manual') => {
    try {
      console.log(`📝 [AuthContext] ${authType} registration attempt...`);
      setLoading(true);
      
      let response;
      if (authType === 'google') {
        // Handle Google Auth registration
        response = await apiHelpers.googleAuth({
          ...userData,
          action: 'register'
        });
      } else {
        // Handle manual registration
        response = await apiHelpers.register(userData);
      }
      
      if (response.success && response.token && response.user) {
        console.log(`✅ [AuthContext] ${authType} registration successful:`, response.user.email);
        
        const userDataWithAuth = { 
          ...response.user,
          authType // Track how user registered
        };
        
        if (userDataWithAuth.avatar && !userDataWithAuth.avatarUrl) {
          userDataWithAuth.avatarUrl = getAvatarUrl(userDataWithAuth.avatar);
        }
        
        localStorage.setItem('wn_token', response.token); // ✅ FIXED: Use wn_token
        localStorage.setItem('wn_user', JSON.stringify(userDataWithAuth));
        
        setToken(response.token);
        setUser(userDataWithAuth);
        setIsAuthenticated(true);
        
        dispatchAuthEvent(userDataWithAuth, true);
        
        return { success: true, user: userDataWithAuth };
      } else {
        throw new Error(response.message || `${authType} registration failed`);
      }
    } catch (error) {
      console.error(`❌ [AuthContext] ${authType} registration error:`, error);
      const errorInfo = handleApiError(error, `${authType} Registration`);
      return { 
        success: false, 
        error: errorInfo.message 
      };
    } finally {
      setLoading(false);
    }
  };

  // ✅ CRITICAL FIX: Enhanced updateUser with guaranteed persistence
  const updateUser = useCallback((updatedUserData) => {
    console.log('🔄 [AuthContext] === UPDATING USER DATA ===');
    console.log('📝 [AuthContext] Update data received:', updatedUserData);
    
    if (!updatedUserData) {
      console.warn('⚠️ [AuthContext] updateUser called with null data');
      return;
    }
    
    setUser(prevUser => {
      if (!prevUser) {
        console.warn('⚠️ [AuthContext] No previous user to update');
        return null;
      }
      
      const newUserData = typeof updatedUserData === 'function' 
        ? updatedUserData(prevUser) 
        : { ...prevUser, ...updatedUserData };
      
      if (!newUserData) {
        console.warn('⚠️ [AuthContext] New user data is null after processing');
        return prevUser;
      }
      
      // Add avatar URL if needed
      if (newUserData.avatar && !newUserData.avatarUrl) {
        newUserData.avatarUrl = getAvatarUrl(newUserData.avatar);
      }
      
      // ✅ CRITICAL FIX: Always update localStorage and dispatch events
      console.log('✅ [AuthContext] Updating user state with new data');
      console.log('📊 [AuthContext] Final user data:', {
        name: newUserData.name,
        title: newUserData.title,
        category: newUserData.category,
        subcategory: newUserData.subcategory,
        phone: newUserData.contact?.phone,
        address: newUserData.contact?.address,
        authType: newUserData.authType
      });
      
      try {
        localStorage.setItem('wn_user', JSON.stringify(newUserData));
        dispatchAuthEvent(newUserData, true);
        console.log('💾 [AuthContext] localStorage and events updated successfully');
      } catch (storageError) {
        console.error('❌ [AuthContext] localStorage update failed:', storageError);
      }
      
      return newUserData;
    });
  }, [getAvatarUrl, dispatchAuthEvent]);

  const refreshAuth = useCallback(async () => {
    try {
      console.log('🔄 [AuthContext] Refreshing authentication...');
      setLoading(true);
      
      const response = await apiHelpers.getProfile(); // Use getProfile for complete data
      
      if (response.success && response.user) {
        const userData = { ...response.user };
        
        if (userData.avatar && !userData.avatarUrl) {
          userData.avatarUrl = getAvatarUrl(userData.avatar);
        }
        
        setUser(userData);
        localStorage.setItem('wn_user', JSON.stringify(userData));
        dispatchAuthEvent(userData, true);
        
        console.log('✅ [AuthContext] Auth refreshed successfully');
      }
    } catch (error) {
      console.error('❌ [AuthContext] Auth refresh failed:', error);
    } finally {
      setLoading(false);
    }
  }, [getAvatarUrl, dispatchAuthEvent]);

  // ✅ NEW: Helper function to check if user is using Google Auth
  const isGoogleAuth = useCallback(() => {
    return user?.authType === 'google';
  }, [user?.authType]);

  const value = React.useMemo(() => ({
    user,
    token,
    loading,
    isAuthenticated,
    login,
    googleLogin, // ✅ NEW: Add Google OAuth login function
    register,
    logout,
    updateUser,
    refreshAuth,
    isClient,
    isProfessional,
    isAdmin,
    canPostJobs,
    canApplyToJobs,
    isGoogleAuth // ✅ NEW: Expose Google Auth status
  }), [
    user,
    token,
    loading,
    isAuthenticated,
    googleLogin, // ✅ NEW: Include in dependencies
    logout,
    updateUser,
    refreshAuth,
    isClient,
    isProfessional,
    isAdmin,
    canPostJobs,
    canApplyToJobs,
    isGoogleAuth
  ]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export { AuthContext };
export default AuthProvider;
