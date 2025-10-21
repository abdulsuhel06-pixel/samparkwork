import axios from 'axios';

// ✅ FIXED: Dynamic API Configuration for Mobile Compatibility
const isDevelopment = process.env.NODE_ENV !== 'production';

// ✅ MOBILE COMPATIBLE: Get local network IP dynamically or use relative URLs
const getDevBaseURL = () => {
  // For mobile testing, use your computer's actual network IP
  const networkIP = window.location.hostname; // Uses current hostname (works for mobile)
  const currentPort = window.location.port || '5173';
  
  // If accessing via network IP (mobile), use that IP for API calls
  if (networkIP !== 'localhost' && networkIP !== '127.0.0.1') {
    return `http://${networkIP}:${currentPort}`;
  }
  
  // Fallback to localhost for desktop development
  return 'http://localhost:5173';
};

// ✅ CRITICAL MOBILE FIX: Separate function for media URLs (port 5000)
const getDevMediaBaseURL = () => {
  const networkIP = window.location.hostname;
  
  // ✅ MOBILE COMPATIBLE: For mobile, use network IP with backend port 5000
  if (networkIP !== 'localhost' && networkIP !== '127.0.0.1') {
    return `http://${networkIP}:5000`;  // Backend port for media
  }
  
  // Desktop: use localhost backend
  return 'http://localhost:5000';
};

const API_BASE_URL = isDevelopment 
  ? getDevBaseURL()  // ✅ MOBILE COMPATIBLE: Dynamic URL resolution
  : 'https://your-production-domain.com';  // Replace with your production URL

// Create axios instance with interceptors
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Helper function to get auth token
const getAuthToken = () => {
  return localStorage.getItem('wn_token');
};

// Request interceptor to add token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('wn_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    console.log(`🌐 API Request: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
    console.log('📤 Request data:', config.data);
    return config;
  },
  (error) => {
    console.error('❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response: ${response.status} ${response.config.url}`);
    console.log('📥 Response data:', response.data);
    return response;
  },
  (error) => {
    console.error(`❌ API Error: ${error.response?.status} ${error.config?.url}`, error.response?.data);
    
    if (error.response?.status === 401) {
      localStorage.removeItem('wn_token');
      localStorage.removeItem('wn_user');
      window.location.href = '/login';
    }
    
    return Promise.reject(error);
  }
);

// ✅ MOBILE COMPATIBLE: Fixed image URL helper
export const getImageUrl = (imagePath) => {
  if (!imagePath) return null;
  
  // If already a complete URL, return as-is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  
  // ✅ MOBILE CRITICAL FIX: Use backend media URL (port 5000)
  const baseUrl = isDevelopment ? getDevMediaBaseURL() : 'https://your-production-domain.com';
  
  // Remove leading slash if present to avoid double slashes
  const cleanPath = imagePath.startsWith('/') ? imagePath.substring(1) : imagePath;
  
  const finalUrl = `${baseUrl}/${cleanPath}`;
  
  console.log('🖼️ [getImageUrl] Mobile-compatible URL generation:', {
    originalPath: imagePath,
    cleanPath: cleanPath,
    baseUrl: baseUrl,
    finalUrl: finalUrl,
    networkInfo: getNetworkInfo()
  });
  
  return finalUrl;
};

// ✅ MOBILE COMPATIBLE: Fixed media URL helper for videos/images
export const getMediaUrl = (mediaPath) => {
  if (!mediaPath) return null;
  
  // If already a complete URL, return as-is
  if (mediaPath.startsWith('http://') || mediaPath.startsWith('https://')) {
    return mediaPath;
  }
  
  // ✅ MOBILE CRITICAL FIX: Use backend media URL (port 5000)
  const baseUrl = isDevelopment ? getDevMediaBaseURL() : 'https://your-production-domain.com';
  
  // Remove leading slash if present
  const cleanPath = mediaPath.startsWith('/') ? mediaPath.substring(1) : mediaPath;
  
  const finalUrl = `${baseUrl}/${cleanPath}`;
  
  console.log('🎬 [getMediaUrl] Mobile-compatible URL generation:', {
    originalPath: mediaPath,
    cleanPath: cleanPath,
    baseUrl: baseUrl,
    finalUrl: finalUrl,
    networkInfo: getNetworkInfo()
  });
  
  return finalUrl;
};

// ✅ COMPLETE API Helper Functions
export const apiHelpers = {
  // ============================================
  // AUTH ENDPOINTS
  // ============================================
  login: async (credentials) => {
    console.log('🔑 [API] Login request with:', { email: credentials.email });
    const response = await api.post('/api/auth/login', credentials);
    console.log('✅ [API] Login response:', response.data);
    return response.data;
  },

  register: async (userData) => {
    console.log('📝 [API] Register request');
    const response = await api.post('/api/auth/signup', userData);
    console.log('✅ [API] Register response:', response.data);
    return response.data;
  },

  getMe: async () => {
    console.log('🔍 [API] Get current user request');
    const response = await api.get('/api/auth/me');
    console.log('✅ [API] Get current user response:', response.data);
    return response.data;
  },

  verifyToken: async () => {
    const response = await api.post('/api/auth/verify-token');
    return response.data;
  },

  // ============================================
  // USER PROFILE ENDPOINTS
  // ============================================
  getProfile: async () => {
    console.log('👤 [API] Getting user profile...');
    const response = await api.get('/api/users/profile');
    
    console.log('✅ [API] Profile response received');
    console.log('📊 [API] Profile basic fields from backend:', {
      name: response.data.user?.name,
      title: response.data.user?.title,
      category: response.data.user?.category,
      subcategory: response.data.user?.subcategory,
      bio: response.data.user?.bio
    });
    
    return response.data;
  },

  updateProfile: async (profileData) => {
    console.log('📝 [API] === STARTING PROFILE UPDATE ===');
    console.log('📝 [API] Raw profile data received:', profileData);
    
    // ✅ Log specific fields we're updating
    const fieldsToUpdate = {
      name: profileData.name,
      title: profileData.title,
      category: profileData.category,
      subcategory: profileData.subcategory,
      bio: profileData.bio,
      location: profileData.location
    };
    
    console.log('📊 [API] Basic Info fields being updated:', fieldsToUpdate);
    
    // ✅ CRITICAL FIX: Convert nested objects to dot notation for backend
    const formattedData = { ...profileData };
    
    // If contact data is provided as an object, convert to dot notation
    if (profileData.contact && typeof profileData.contact === 'object') {
      console.log('📞 [API] Processing contact data:', profileData.contact);
      
      Object.keys(profileData.contact).forEach(key => {
        if (key === 'socials' && typeof profileData.contact.socials === 'object') {
          Object.keys(profileData.contact.socials).forEach(socialKey => {
            formattedData[`contact.socials.${socialKey}`] = profileData.contact.socials[socialKey];
          });
        } else {
          formattedData[`contact.${key}`] = profileData.contact[key];
        }
      });
      // Remove the original contact object
      delete formattedData.contact;
    }
    
    console.log('📝 [API] Formatted profile data being sent to backend:', formattedData);
    console.log('📊 [API] Formatted basic fields:', {
      name: formattedData.name,
      title: formattedData.title,
      category: formattedData.category,
      subcategory: formattedData.subcategory,
      bio: formattedData.bio
    });
    
    const response = await api.put('/api/users/profile', formattedData);
    
    console.log('✅ [API] Raw backend response received:', response.data);
    
    if (response.data.user) {
      console.log('📊 [API] Backend response user fields:', {
        name: response.data.user.name,
        title: response.data.user.title,
        category: response.data.user.category,
        subcategory: response.data.user.subcategory,
        bio: response.data.user.bio
      });
      
      // ✅ CRITICAL VALIDATION: Check if all fields are present in response
      const missingFields = [];
      if (fieldsToUpdate.name && !response.data.user.name) missingFields.push('name');
      if (fieldsToUpdate.title && !response.data.user.title) missingFields.push('title');
      if (fieldsToUpdate.category && !response.data.user.category) missingFields.push('category');
      if (fieldsToUpdate.subcategory && !response.data.user.subcategory) missingFields.push('subcategory');
      
      if (missingFields.length > 0) {
        console.warn('⚠️ [API] WARNING: Missing fields in backend response:', missingFields);
        console.warn('⚠️ [API] This could cause data loss after refresh!');
      } else {
        console.log('✅ [API] All updated fields present in backend response');
      }
    } else {
      console.error('❌ [API] No user data in backend response!');
    }
    
    console.log('📝 [API] === PROFILE UPDATE COMPLETED ===');
    return response.data;
  },

  // ============================================
  // FILE UPLOAD ENDPOINTS
  // ============================================
  uploadAvatar: async (file) => {
    console.log('📸 [API] Uploading avatar:', file.name);
    const formData = new FormData();
    formData.append('avatar', file);
    
    const response = await api.post('/api/users/profile/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    console.log('✅ [API] Avatar uploaded:', response.data);
    return response.data;
  },

  uploadPortfolio: async (file, portfolioData = {}) => {
    console.log('🎨 [API] Uploading portfolio:', file.name, portfolioData);
    const formData = new FormData();
    formData.append('portfolioFile', file);
    
    // Add portfolio metadata
    Object.keys(portfolioData).forEach(key => {
      if (portfolioData[key] !== undefined && portfolioData[key] !== null) {
        formData.append(key, portfolioData[key]);
      }
    });
    
    const response = await api.post('/api/users/profile/portfolio', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    console.log('✅ [API] Portfolio uploaded:', response.data);
    return response.data;
  },

  uploadCertificate: async (file, certificateData = {}) => {
    console.log('📄 [API] Uploading certificate:', file?.name, certificateData);
    const formData = new FormData();
    
    if (file) {
      formData.append('certificate', file);
    }
    
    // Add certificate metadata
    Object.keys(certificateData).forEach(key => {
      if (certificateData[key] !== undefined && certificateData[key] !== null) {
        formData.append(key, certificateData[key]);
      }
    });
    
    const response = await api.post('/api/users/profile/certificate', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    console.log('✅ [API] Certificate uploaded:', response.data);
    return response.data;
  },

  uploadCompanyImage: async (file) => {
    console.log('🏢 [API] Uploading company image:', file.name);
    const formData = new FormData();
    formData.append('companyImage', file);
    
    const response = await api.post('/api/users/profile/company-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    console.log('✅ [API] Company image uploaded:', response.data);
    return response.data;
  },

  // ============================================
  // DELETE ENDPOINTS
  // ============================================
  deleteCertificate: async (certId) => {
    console.log('🗑️ [API] Deleting certificate:', certId);
    const response = await api.delete(`/api/users/profile/certificate/${certId}`);
    console.log('✅ [API] Certificate deleted:', response.data);
    return response.data;
  },

  deletePortfolioItem: async (itemId) => {
    console.log('🗑️ [API] Deleting portfolio item:', itemId);
    const response = await api.delete(`/api/users/profile/portfolio/${itemId}`);
    console.log('✅ [API] Portfolio item deleted:', response.data);
    return response.data;
  },

  deleteAvatar: async () => {
    console.log('🗑️ [API] Deleting avatar');
    const response = await api.delete('/api/users/profile/avatar');
    console.log('✅ [API] Avatar deleted:', response.data);
    return response.data;
  },

  deleteCompanyImage: async () => {
    console.log('🗑️ [API] Deleting company image');
    const response = await api.delete('/api/users/profile/company-image');
    console.log('✅ [API] Company image deleted:', response.data);
    return response.data;
  },

  // ============================================
  // EDUCATION & EXPERIENCE ENDPOINTS
  // ============================================
  addEducation: async (educationData) => {
    console.log('🎓 [API] Adding education:', educationData);
    const response = await api.post('/api/users/profile/education', educationData);
    console.log('✅ [API] Education added:', response.data);
    return response.data;
  },

  updateEducation: async (educationId, educationData) => {
    console.log('📝 [API] Updating education:', educationId, educationData);
    const response = await api.put(`/api/users/profile/education/${educationId}`, educationData);
    console.log('✅ [API] Education updated:', response.data);
    return response.data;
  },

  deleteEducation: async (educationId) => {
    console.log('🗑️ [API] Deleting education:', educationId);
    const response = await api.delete(`/api/users/profile/education/${educationId}`);
    console.log('✅ [API] Education deleted:', response.data);
    return response.data;
  },

  addExperience: async (experienceData) => {
    console.log('💼 [API] Adding experience:', experienceData);
    const response = await api.post('/api/users/profile/experience', experienceData);
    console.log('✅ [API] Experience added:', response.data);
    return response.data;
  },

  updateExperience: async (experienceId, experienceData) => {
    console.log('📝 [API] Updating experience:', experienceId, experienceData);
    const response = await api.put(`/api/users/profile/experience/${experienceId}`, experienceData);
    console.log('✅ [API] Experience updated:', response.data);
    return response.data;
  },

  deleteExperience: async (experienceId) => {
    console.log('🗑️ [API] Deleting experience:', experienceId);
    const response = await api.delete(`/api/users/profile/experience/${experienceId}`);
    console.log('✅ [API] Experience deleted:', response.data);
    return response.data;
  },

  validateAddress: async (address) => {
    console.log('🗺️ [API] Validating address:', address);
    const response = await api.post('/api/users/profile/validate-address', { address });
    console.log('✅ [API] Address validated:', response.data);
    return response.data;
  },

  // ============================================
  // PUBLIC CATEGORY ENDPOINTS
  // ============================================
  getFeaturedCategories: async () => {
    const response = await api.get('/api/categories/featured');
    return response.data;
  },

  getCategories: async (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    const response = await api.get(`/api/categories${queryParams ? `?${queryParams}` : ''}`);
    return response.data;
  },

  // ============================================
  // ADVERTISEMENT ENDPOINTS
  // ============================================
  getAdvertisements: async (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    const response = await api.get(`/api/advertisements${queryParams ? `?${queryParams}` : ''}`);
    return response.data;
  },

  trackAdClick: async (adId) => {
    const response = await api.post(`/api/advertisements/${adId}/click`);
    return response.data;
  },

  // ============================================
  // JOB MANAGEMENT ENDPOINTS
  // ============================================
  getJobs: async (params = {}) => {
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value && value !== '' && value !== 'all') {
        queryParams.append(key, value);
      }
    });
    
    const response = await api.get(`/api/jobs${queryParams.toString() ? `?${queryParams}` : ''}`);
    return response.data;
  },

  // ✅ NEW: Enhanced job search with category matching
  getJobsWithCategorySearch: async (params = {}) => {
    try {
      console.log('🔍 [API] Enhanced job search with params:', params);
      
      const queryParams = new URLSearchParams();
      
      Object.entries(params).forEach(([key, value]) => {
        if (value && value !== '' && value !== 'all') {
          queryParams.append(key, value);
        }
      });
      
      // Add special handling for category search
      if (params.categorySearch) {
        queryParams.delete('category');
        queryParams.append('categorySearch', params.categorySearch);
      }
      
      const url = `/api/jobs/search${queryParams.toString() ? `?${queryParams}` : ''}`;
      console.log('🌐 [API] Category search URL:', `${API_BASE_URL}${url}`);
      
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      console.error('❌ [API] Enhanced job search failed:', error);
      
      // If search endpoint doesn't exist, fallback to regular search
      if (error.response?.status === 404) {
        console.log('🔄 [API] Search endpoint not found, falling back to regular getJobs...');
        return await apiHelpers.getJobs(params);
      }
      
      throw error;
    }
  },

  getRecentJobs: async () => {
    const response = await api.get('/api/jobs/recent');
    return response.data;
  },

  getJobCategories: async () => {
    const response = await api.get('/api/jobs/categories');
    return response.data;
  },

  getJobById: async (jobId) => {
    console.log('🔍 [API] Getting job by ID:', jobId);
    const response = await api.get(`/api/jobs/${jobId}`);
    console.log('✅ [API] Job retrieved:', response.data);
    return response.data;
  },

  getJobBySlug: async (slug) => {
    console.log('🔍 [API] Getting job by slug:', slug);
    const response = await api.get(`/api/jobs/${slug}`);
    console.log('✅ [API] Job retrieved by slug:', response.data);
    return response.data;
  },

  createJob: async (jobData) => {
    console.log('💼 [API] Creating job:', jobData);
    const response = await api.post('/api/jobs', jobData);
    console.log('✅ [API] Job created:', response.data);
    return response.data;
  },

  updateJob: async (jobId, jobData) => {
    console.log('📝 [API] Updating job:', jobId, jobData);
    const response = await api.put(`/api/jobs/${jobId}`, jobData);
    console.log('✅ [API] Job updated:', response.data);
    return response.data;
  },

  // ✅ NEW: Delete job function - PERMANENT DELETE
  deleteJob: async (jobId) => {
    try {
      console.log('🗑️ [API] Deleting job:', jobId);
      
      const response = await api.delete(`/api/jobs/${jobId}`);
      
      console.log('✅ [API] Job deleted:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ [API] Delete job error:', error);
      
      if (error.response?.data) {
        throw new Error(error.response.data.message || 'Failed to delete job');
      }
      throw new Error('Network error while deleting job');
    }
  },

  applyToJob: async (jobId, applicationData) => {
    console.log('📝 [API] Applying to job:', jobId, applicationData);
    const response = await api.post(`/api/jobs/${jobId}/apply`, applicationData);
    console.log('✅ [API] Application submitted:', response.data);
    return response.data;
  },

  // ✅ CRITICAL FIX: Add the missing getMyJobs function!
  getMyJobs: async (params = {}) => {
    console.log('📋 [API] Getting my jobs with params:', params);
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value && value !== '' && value !== 'all') {
        queryParams.append(key, value);
      }
    });
    
    const response = await api.get(`/api/jobs/my/posted${queryParams.toString() ? `?${queryParams}` : ''}`);
    console.log('✅ [API] My jobs retrieved:', response.data);
    return response.data;
  },

  getMyPostedJobs: async (params = {}) => {
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value && value !== '' && value !== 'all') {
        queryParams.append(key, value);
      }
    });
    
    const response = await api.get(`/api/jobs/my/posted${queryParams.toString() ? `?${queryParams}` : ''}`);
    return response.data;
  },

  getMyApplications: async (params = {}) => {
    console.log('📋 [API] Getting my applications with params:', params);
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value && value !== '' && value !== 'all') {
        queryParams.append(key, value);
      }
    });
    
    const response = await api.get(`/api/jobs/my/applications${queryParams.toString() ? `?${queryParams}` : ''}`);
    console.log('✅ [API] Applications retrieved:', response.data);
    return response.data;
  },

  incrementJobView: async (jobId) => {
    console.log('👁️ [API] Incrementing view count for job:', jobId);
    const response = await api.post(`/api/jobs/${jobId}/increment-view`);
    console.log('✅ [API] View count incremented:', response.data);
    return response.data;
  },

  // ============================================
  // ✅ ENHANCED APPLICATION MANAGEMENT
  // ============================================

  // Get applications for a specific job (for job owners)
  getJobApplications: async (jobId, params = {}) => {
    console.log('📋 [API] Getting applications for job:', jobId, params);
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value && value !== '' && value !== 'all') {
        queryParams.append(key, value);
      }
    });
    
    const response = await api.get(`/api/jobs/${jobId}/applications${queryParams.toString() ? `?${queryParams}` : ''}`);
    console.log('✅ [API] Job applications retrieved:', response.data);
    return response.data;
  },

  // Get all applications received for client's jobs
  getReceivedApplications: async (params = {}) => {
    console.log('📋 [API] Getting received applications with params:', params);
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value && value !== '' && value !== 'all') {
        queryParams.append(key, value);
      }
    });
    
    const response = await api.get(`/api/jobs/applications/received${queryParams.toString() ? `?${queryParams}` : ''}`);
    console.log('✅ [API] Received applications retrieved:', response.data);
    return response.data;
  },

  // ✅ ENHANCED: Update application status (for ACCEPT)
  updateApplicationStatus: async (applicationId, status, message = '') => {
    console.log('🔄 [API] Updating application status:', applicationId, status, message);
    
    const response = await api.patch(`/api/jobs/applications/${applicationId}/status`, {
      status,
      message
    });
    
    console.log('✅ [API] Application status updated:', response.data);
    return response.data;
  },

  // ✅ NEW: DELETE application from database (for REJECT)
  deleteApplication: async (applicationId, message = '') => {
    console.log('🗑️ [API] DELETING application from database:', applicationId, message);
    
    try {
      const response = await api.delete(`/api/jobs/applications/${applicationId}`, {
        data: { message }
      });
      
      console.log('✅ [API] Application PERMANENTLY DELETED:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ [API] Delete application error:', error);
      
      if (error.response?.data) {
        throw new Error(error.response.data.message || 'Failed to delete application');
      }
      throw new Error('Network error while deleting application');
    }
  },

  // ✅ ENHANCED: Withdraw application (for professionals)
  withdrawApplication: async (applicationId) => {
    console.log('🗑️ [API] Withdrawing application:', applicationId);
    
    const response = await api.delete(`/api/jobs/applications/${applicationId}`);
    
    console.log('✅ [API] Application withdrawn:', response.data);
    return response.data;
  },

  // ============================================
  // ✅ ENHANCED MESSAGING ENDPOINTS - COMPLETE FILE UPLOAD FIX
  // ============================================

  // Get user conversations
  getConversations: async (params = {}) => {
    console.log('💬 [API] Getting conversations with params:', params);
    try {
      const response = await api.get('/api/messages/conversations', { params });
      return response.data;
    } catch (error) {
      console.error('❌ [getConversations] Error:', error);
      throw error;
    }
  },

  // Get messages in a conversation
  getMessages: async (conversationId) => {
    console.log('💬 [API] Getting messages for conversation:', conversationId);
    try {
      const response = await api.get(`/api/messages/conversation/${conversationId}`);
      return response.data;
    } catch (error) {
      console.error('❌ [getMessages] Error:', error);
      throw error;
    }
  },

  // ✅ CRITICAL FIX: Send message with EXACT backend structure
  sendMessage: async (messageData) => {
    console.log('💬 [API] Sending message:', messageData);
    try {
      // ✅ PERFECT: Match exact backend expectation
      const requestData = {
        receiverId: messageData.receiverId,
        content: messageData.content,
        messageType: messageData.messageType || 'text',
        conversationId: messageData.conversationId,
        metadata: messageData.metadata || {}
      };
      
      console.log('📤 Request data:', requestData);
      const response = await api.post('/api/messages/send', requestData);
      return response.data;
    } catch (error) {
      console.error('❌ [sendMessage] Error:', error);
      throw error;
    }
  },

  // Create or find conversation
  createOrFindConversation: async (conversationData) => {
    console.log('🔍 [API] Creating/finding conversation:', conversationData);
    try {
      const response = await api.post('/api/messages/conversation', conversationData);
      return response.data;
    } catch (error) {
      console.error('❌ [createOrFindConversation] Error:', error);
      throw error;
    }
  },

  // ✅ NEW: Start conversation with job context
  startConversationWithJob: async (jobId, userId, initialMessage = '') => {
    console.log('💬 [API] Starting conversation with job context:', { jobId, userId, initialMessage });
    const response = await api.post(`/api/jobs/${jobId}/contact/${userId}`, {
      message: initialMessage
    });
    console.log('✅ [API] Job conversation started:', response.data);
    return response.data;
  },

  // ✅ CRITICAL FIX: COMPLETE FILE UPLOAD FUNCTION - MATCHES FRONTEND & BACKEND
  uploadMessageFile: async (formData) => {
    try {
      console.log('📎 [uploadMessageFile] Starting file upload with complete form data...');
      
      // ✅ CRITICAL: Log FormData contents for debugging
      console.log('📋 [uploadMessageFile] FormData contents:');
      for (let [key, value] of formData.entries()) {
        console.log(`  ${key}:`, value instanceof File ? `File(${value.name}, ${value.size} bytes)` : value);
      }
      
      // ✅ CRITICAL: Use proper configuration for file upload
      const config = {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 60000, // 60 second timeout for file uploads
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      };
      
      const response = await api.post('/api/messages/upload', formData, config);
      
      console.log('✅ [uploadMessageFile] File uploaded successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ [uploadMessageFile] Upload failed:', error);
      
      // Enhanced error logging for debugging
      if (error.response) {
        console.error('❌ [uploadMessageFile] Response Error Details:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
          headers: error.response.headers
        });
      } else if (error.request) {
        console.error('❌ [uploadMessageFile] Request Error - No response received:', error.request);
      } else {
        console.error('❌ [uploadMessageFile] General Error:', error.message);
      }
      
      // Re-throw the error for proper handling in the calling component
      throw error;
    }
  },

  // Mark messages as read
  markMessagesAsRead: async (conversationId) => {
    console.log('👁️ [API] Marking messages as read:', conversationId);
    try {
      const response = await api.put(`/api/messages/read/${conversationId}`);
      return response.data;
    } catch (error) {
      console.error('❌ [markMessagesAsRead] Error:', error);
      throw error;
    }
  },

  // ✅ NEW: Get unread message count
  getUnreadCount: async () => {
    console.log('🔔 [API] Getting unread message count');
    try {
      const response = await api.get('/api/messages/unread-count');
      return response.data;
    } catch (error) {
      console.error('❌ [getUnreadCount] Error:', error);
      throw error;
    }
  },

  // Search messages
  searchMessages: async (query, params = {}) => {
    console.log('🔍 [API] Searching messages:', query, params);
    try {
      const searchParams = new URLSearchParams({
        query,
        ...params
      });
      
      const response = await api.get(`/api/messages/search?${searchParams}`);
      return response.data;
    } catch (error) {
      console.error('❌ [searchMessages] Error:', error);
      throw error;
    }
  },

  // Delete message
  deleteMessage: async (messageId) => {
    console.log('🗑️ [API] Deleting message:', messageId);
    try {
      const response = await api.delete(`/api/messages/${messageId}`);
      return response.data;
    } catch (error) {
      console.error('❌ [deleteMessage] Error:', error);
      throw error;
    }
  },

  // Archive conversation
  archiveConversation: async (conversationId) => {
    console.log('📦 [API] Archiving conversation:', conversationId);
    const response = await api.put(`/api/messages/conversation/${conversationId}/archive`);
    console.log('✅ [API] Conversation archived:', response.data);
    return response.data;
  },

  // ✅ NEW: Delete conversation - THE MISSING METHOD!
  deleteConversation: async (conversationId) => {
    console.log('🗑️ [API] Deleting conversation:', conversationId);
    try {
      const response = await api.delete(`/api/messages/conversation/${conversationId}`);
      return response.data;
    } catch (error) {
      console.error('❌ [deleteConversation] Error:', error);
      throw error;
    }
  },

  // ✅ NEW: Unarchive conversation
  unarchiveConversation: async (conversationId) => {
    console.log('📦 [API] Unarchiving conversation:', conversationId);
    const response = await api.put(`/api/messages/conversation/${conversationId}/unarchive`);
    console.log('✅ [API] Conversation unarchived:', response.data);
    return response.data;
  },

  // ============================================
  // PUBLIC USER ENDPOINTS
  // ============================================
  getProfessionals: async (filters = {}) => {
    const queryParams = new URLSearchParams(filters).toString();
    const response = await api.get(`/api/users/professionals${queryParams ? `?${queryParams}` : ''}`);
    return response.data;
  },

  getUserById: async (userId) => {
    console.log('👤 [API] Getting user by ID:', userId);
    const response = await api.get(`/api/users/${userId}`);
    console.log('✅ [API] User retrieved:', response.data);
    return response.data;
  },

  // ============================================
  // ADMIN ENDPOINTS
  // ============================================
  getAllUsers: async (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    const response = await api.get(`/api/users/admin/all-users${queryParams ? `?${queryParams}` : ''}`);
    return response.data;
  },

  getUserStats: async () => {
    const response = await api.get('/api/users/admin/user-stats');
    return response.data;
  },

  updateUserRole: async (userId, role) => {
    const response = await api.put(`/api/users/admin/user/${userId}/role`, { role });
    return response.data;
  },

  deactivateUser: async (userId) => {
    const response = await api.put(`/api/users/admin/user/${userId}/deactivate`);
    return response.data;
  },

  // ============================================
  // PROFILE COMPLETION & VALIDATION
  // ============================================
  getProfileCompletion: async () => {
    console.log('📊 [API] Getting profile completion');
    const response = await api.get('/api/users/profile/completion');
    console.log('✅ [API] Profile completion:', response.data);
    return response.data;
  },

  validatePhoneNumber: async (phoneNumber) => {
    console.log('📱 [API] Validating phone number:', phoneNumber);
    const response = await api.post('/api/users/profile/validate-phone', { phoneNumber });
    console.log('✅ [API] Phone validation result:', response.data);
    return response.data;
  },

  // ============================================
  // SEARCH & FILTER ENDPOINTS
  // ============================================
  searchProfessionals: async (searchQuery, filters = {}) => {
    console.log('🔍 [API] Searching professionals:', searchQuery, filters);
    const params = { 
      search: searchQuery,
      ...filters
    };
    const queryParams = new URLSearchParams(params).toString();
    const response = await api.get(`/api/users/professionals/search${queryParams ? `?${queryParams}` : ''}`);
    console.log('✅ [API] Search results:', response.data);
    return response.data;
  },

  searchJobs: async (searchQuery, filters = {}) => {
    console.log('🔍 [API] Searching jobs:', searchQuery, filters);
    const params = { 
      search: searchQuery,
      ...filters
    };
    const queryParams = new URLSearchParams(params).toString();
    const response = await api.get(`/api/jobs/search${queryParams ? `?${queryParams}` : ''}`);
    console.log('✅ [API] Job search results:', response.data);
    return response.data;
  },

  // ============================================
  // ANALYTICS ENDPOINTS
  // ============================================
  getProfileViews: async () => {
    console.log('👀 [API] Getting profile views');
    const response = await api.get('/api/users/profile/views');
    console.log('✅ [API] Profile views:', response.data);
    return response.data;
  },

  trackProfileView: async (profileId) => {
    console.log('👁️ [API] Tracking profile view:', profileId);
    const response = await api.post(`/api/users/${profileId}/view`);
    console.log('✅ [API] Profile view tracked:', response.data);
    return response.data;
  },

  // ============================================
  // NOTIFICATION ENDPOINTS
  // ============================================
  getNotifications: async () => {
    console.log('🔔 [API] Getting notifications');
    const response = await api.get('/api/notifications');
    console.log('✅ [API] Notifications:', response.data);
    return response.data;
  },

  markNotificationRead: async (notificationId) => {
    console.log('✅ [API] Marking notification as read:', notificationId);
    const response = await api.put(`/api/notifications/${notificationId}/read`);
    console.log('✅ [API] Notification marked as read:', response.data);
    return response.data;
  },

  markAllNotificationsRead: async () => {
    console.log('✅ [API] Marking all notifications as read');
    const response = await api.put('/api/notifications/read-all');
    console.log('✅ [API] All notifications marked as read:', response.data);
    return response.data;
  }
};

// ✅ AUTHENTICATION HELPER FUNCTIONS
export const authHelpers = {
  getCurrentUser: () => {
    const user = localStorage.getItem('wn_user');
    return user ? JSON.parse(user) : null;
  },

  isAuthenticated: () => {
    return !!localStorage.getItem('wn_token');
  },

  isClient: () => {
    const user = authHelpers.getCurrentUser();
    return user?.role === 'client';
  },

  isProfessional: () => {
    const user = authHelpers.getCurrentUser();
    return user?.role === 'professional';
  },

  isAdmin: () => {
    const user = authHelpers.getCurrentUser();
    return user?.role === 'admin';
  },

  logout: () => {
    localStorage.removeItem('wn_token');
    localStorage.removeItem('wn_user');
    window.location.href = '/login';
  },

  getToken: () => {
    return localStorage.getItem('wn_token');
  },

  setAuthData: (token, user) => {
    localStorage.setItem('wn_token', token);
    localStorage.setItem('wn_user', JSON.stringify(user));
  },

  clearAuthData: () => {
    localStorage.removeItem('wn_token');
    localStorage.removeItem('wn_user');
  },

  isTokenExpired: () => {
    const token = authHelpers.getToken();
    if (!token) return true;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      return payload.exp < currentTime;
    } catch (error) {
      console.error('Error checking token expiration:', error);
      return true;
    }
  }
};

// ✅ ENHANCED SOCKET.IO AUTHENTICATION HELPER
export const socketHelpers = {
  canConnectSocket: () => {
    const token = getAuthToken();
    const user = localStorage.getItem('wn_user');
    return !!(token && user);
  },
  
  getSocketToken: () => {
    const token = getAuthToken();
    if (!token) {
      console.error('❌ [socketHelpers] No authentication token available');
      return null;
    }
    console.log('🔌 [socketHelpers] Socket.IO token prepared:', `Bearer ${token.substring(0, 10)}...`);
    return token;
  },
  
  getSocketUser: () => {
    try {
      const userData = localStorage.getItem('wn_user');
      if (!userData) return null;
      
      const user = JSON.parse(userData);
      console.log('✅ [socketHelpers] Socket.IO connection ready for user:', user.name || user._id);
      return user;
    } catch (error) {
      console.error('❌ [socketHelpers] Error parsing user data:', error);
      return null;
    }
  }
};

// Enhanced error handling utility
export const handleApiError = (error, context = '') => {
  console.error(`❌ ${context} Error:`, error);
  
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  
  if (error.response?.status === 404) {
    return 'Resource not found';
  }
  
  if (error.response?.status >= 500) {
    return 'Server error. Please try again later.';
  }
  
  if (error.code === 'NETWORK_ERROR' || !error.response) {
    return 'Network error. Please check your connection.';
  }
  
  return 'An unexpected error occurred';
};

// ✅ MOBILE COMPATIBLE: Network detection utility
export const getNetworkInfo = () => {
  const hostname = window.location.hostname;
  const port = window.location.port;
  const protocol = window.location.protocol;
  
  return {
    hostname,
    port,
    protocol,
    isMobile: hostname !== 'localhost' && hostname !== '127.0.0.1',
    baseUrl: `${protocol}//${hostname}${port ? `:${port}` : ''}`,
    apiBaseUrl: getDevBaseURL(),
    mediaBaseUrl: getDevMediaBaseURL()
  };
};

// ✅ ENHANCED DATE FORMATTING FOR MESSAGES
const formatMessageTime = (date) => {
  if (!date) return 'Invalid Date';
  
  try {
    const messageDate = new Date(date);
    if (isNaN(messageDate.getTime())) return 'Invalid Date';
    
    const now = new Date();
    const isToday = messageDate.toDateString() === now.toDateString();
    
    if (isToday) {
      return messageDate.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    } else {
      return messageDate.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    }
  } catch (error) {
    console.error('❌ Date formatting error:', error);
    return 'Invalid Date';
  }
};

// ✅ ENHANCED UTILITY FUNCTIONS
export const utils = {
  // Format file size
  formatFileSize: (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  // Validate file type
  validateFileType: (file, allowedTypes = ['image/jpeg', 'image/png', 'image/gif']) => {
    return allowedTypes.includes(file.type);
  },

  // Validate file size
  validateFileSize: (file, maxSizeInMB = 5) => {
    const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
    return file.size <= maxSizeInBytes;
  },

  // ✅ Indian phone number validation
  validateIndianPhone: (phoneNumber) => {
    // Remove any non-digit characters
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    
    // Check if it's exactly 10 digits and starts with 6, 7, 8, or 9
    return /^[6-9]\d{9}$/.test(cleanNumber);
  },

  // ✅ Format Indian phone number
  formatIndianPhone: (phoneNumber) => {
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    if (cleanNumber.length === 10) {
      return `${cleanNumber.substring(0, 5)} ${cleanNumber.substring(5)}`;
    }
    return cleanNumber;
  },

  // Generate thumbnail URL
  getThumbnailUrl: (imageUrl, size = 'medium') => {
    if (!imageUrl) return null;
    
    const sizes = {
      small: 150,
      medium: 300,
      large: 600
    };
    
    // For now, just return the original URL
    // In production, you might want to implement server-side thumbnail generation
    return imageUrl;
  },

  // Format date
  formatDate: (date, format = 'short') => {
    if (!date) return '';
    
    const dateObj = new Date(date);
    
    switch (format) {
      case 'short':
        return dateObj.toLocaleDateString();
      case 'long':
        return dateObj.toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
      case 'relative':
        const now = new Date();
        const diffTime = Math.abs(now - dateObj);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) return '1 day ago';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
        return `${Math.ceil(diffDays / 30)} months ago`;
      default:
        return dateObj.toLocaleDateString();
    }
  },

  // ✅ Text truncation
  truncateText: (text, maxLength = 100) => {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  },

  // ✅ Capitalize first letter
  capitalizeFirst: (str) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  },

  // ✅ Generate random ID
  generateId: () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  },

  // ✅ Debounce function
  debounce: (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  // ✅ Local storage helpers
  storage: {
    set: (key, value) => {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (error) {
        console.error('Error saving to localStorage:', error);
      }
    },
    
    get: (key, defaultValue = null) => {
      try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
      } catch (error) {
        console.error('Error reading from localStorage:', error);
        return defaultValue;
      }
    },
    
    remove: (key) => {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.error('Error removing from localStorage:', error);
      }
    },
    
    clear: () => {
      try {
        localStorage.clear();
      } catch (error) {
        console.error('Error clearing localStorage:', error);
      }
    }
  },

  // ✅ Message time formatting
  formatMessageTime
};

// ✅ Form validation helpers
export const validateForm = {
  required: (value) => {
    return value && value.toString().trim() !== '';
  },

  email: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  minLength: (value, length) => {
    return value && value.length >= length;
  },

  maxLength: (value, length) => {
    return !value || value.length <= length;
  },

  indianPhone: (phone) => {
    return utils.validateIndianPhone(phone);
  },

  url: (url) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  },

  year: (year) => {
    const currentYear = new Date().getFullYear();
    const numYear = parseInt(year);
    return numYear >= 1950 && numYear <= currentYear + 10;
  }
};

// ✅ Export api instance as default
export default api;
