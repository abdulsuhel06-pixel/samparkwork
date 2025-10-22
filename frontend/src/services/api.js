import axios from 'axios';

// ✅ FIXED: Production-ready configuration
const isDevelopment = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

const API_BASE_URL = isDevelopment 
  ? 'http://localhost:5000'
  : 'https://samparkwork-backend.onrender.com'; // ✅ FIXED: Always use production URL

const SOCKET_URL = isDevelopment 
  ? 'ws://localhost:5000'
  : 'wss://samparkwork-backend.onrender.com';

// ✅ ENHANCED DEBUG LOGGING
console.log('🚀 API Configuration:', {
  isDevelopment,
  hostname: typeof window !== 'undefined' ? window.location.hostname : 'unknown',
  apiBaseURL: API_BASE_URL,
  socketURL: SOCKET_URL,
  environment: import.meta.env.VITE_NODE_ENV || 'production',
});

// ✅ AXIOS INSTANCE
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ✅ CRITICAL FIX: Helper function to get auth token with CORRECT key
const getAuthToken = () => {
  return localStorage.getItem('wn_token'); // ✅ FIXED: Use wn_token (underscore)
};

// ✅ CRITICAL FIX: Request interceptor to add token with CORRECT key
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('wn_token'); // ✅ FIXED: Use wn_token (underscore)
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    console.log(`🔄 API Request: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
    return config;
  },
  (error) => {
    console.error('❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// ✅ CRITICAL FIX: Response interceptor for error handling with CORRECT key
api.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error(`❌ API Error: ${error.response?.status} ${error.config?.url}`, error.response?.data);
    
    if (error.response?.status === 401) {
      localStorage.removeItem('wn_token'); // ✅ FIXED: Use wn_token (underscore)
      localStorage.removeItem('wn_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ✅ FIXED: Clean URL generation function that handles Windows backslashes
export const getImageUrl = (imagePath) => {
  if (!imagePath) return null;
  
  console.log('🖼️ getImageUrl - Input:', imagePath);
  
  // If already a complete URL, clean it and return
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    // ✅ CRITICAL FIX: Clean up Windows backslashes in URLs
    const cleanUrl = imagePath.replace(/\\/g, '/').replace(/\/+/g, '/');
    const finalUrl = cleanUrl.replace('http:/', 'http://').replace('https:/', 'https://');
    console.log('🖼️ getImageUrl - Cleaned URL:', finalUrl);
    return finalUrl;
  }
  
  // Remove leading slash if present
  const cleanPath = imagePath.startsWith('/') ? imagePath.substring(1) : imagePath;
  const finalUrl = `${API_BASE_URL}/${cleanPath}`;
  
  console.log('🖼️ getImageUrl - Generated URL:', finalUrl);
  return finalUrl;
};

// ✅ FIXED: Media URL helper that handles Windows backslashes properly
export const getMediaUrl = (mediaPath) => {
  if (!mediaPath) return null;
  
  console.log('🎥 getMediaUrl - Input:', mediaPath);
  
  // If already a complete URL, clean it and return
  if (mediaPath.startsWith('http://') || mediaPath.startsWith('https://')) {
    // ✅ CRITICAL FIX: Clean up Windows backslashes and double slashes in URLs
    let cleanUrl = mediaPath
      .replace(/\\/g, '/') // Convert backslashes to forward slashes
      .replace(/\/+/g, '/') // Replace multiple slashes with single slash
      .replace('http:/', 'http://') // Fix http protocol
      .replace('https:/', 'https://'); // Fix https protocol
    
    // ✅ ADDITIONAL FIX: Remove duplicate uploads/ paths
    if (cleanUrl.includes('/uploads/uploads/')) {
      cleanUrl = cleanUrl.replace('/uploads/uploads/', '/uploads/');
    }
    
    console.log('🎥 getMediaUrl - Cleaned URL:', cleanUrl);
    return cleanUrl;
  }
  
  // Remove leading slash if present
  let cleanPath = mediaPath.startsWith('/') ? mediaPath.substring(1) : mediaPath;
  
  // Ensure uploads/ prefix exists only once
  if (!cleanPath.startsWith('uploads/')) {
    cleanPath = `uploads/${cleanPath}`;
  }
  
  const finalUrl = `${API_BASE_URL}/${cleanPath}`;
  
  console.log('🎥 getMediaUrl - Generated URL:', finalUrl);
  return finalUrl;
};

// ✅ ENHANCED NETWORK INFO HELPER
export const getNetworkInfo = () => {
  const hostname = window.location.hostname;
  const port = window.location.port;
  const protocol = window.location.protocol;
  
  return {
    hostname,
    port,
    protocol,
    isDevelopment,
    isMobile: hostname !== 'localhost' && hostname !== '127.0.0.1',
    baseUrl: `${protocol}//${hostname}${port ? ':' + port : ''}`,
    apiBaseUrl: API_BASE_URL,
    mediaBaseUrl: API_BASE_URL
  };
};

// ✅ ALL YOUR EXISTING API HELPERS (keeping exactly as they are)
export const apiHelpers = {
  // AUTH ENDPOINTS
  login: async (credentials) => {
    console.log('🔐 API: Login request with', { email: credentials.email });
    const response = await api.post('/api/auth/login', credentials);
    console.log('✅ API: Login response', response.data);
    return response.data;
  },
  
  register: async (userData) => {
    console.log('📝 API: Register request');
    const response = await api.post('/api/auth/signup', userData);
    console.log('✅ API: Register response', response.data);
    return response.data;
  },
  
  getMe: async () => {
    console.log('👤 API: Get current user request');
    const response = await api.get('/api/auth/me');
    console.log('✅ API: Get current user response', response.data);
    return response.data;
  },
  
  verifyToken: async () => {
    const response = await api.post('/api/auth/verify-token');
    return response.data;
  },

  // USER PROFILE ENDPOINTS
  getProfile: async () => {
    console.log('📋 API: Getting user profile...');
    const response = await api.get('/api/users/profile');
    console.log('✅ API: Profile response received');
    return response.data;
  },
  
  updateProfile: async (profileData) => {
    console.log('🔄 API: STARTING PROFILE UPDATE');
    console.log('📊 API: Raw profile data received:', profileData);
    
    // Convert nested objects to dot notation for backend
    const formattedData = { ...profileData };
    
    // If contact data is provided as an object, convert to dot notation
    if (profileData.contact && typeof profileData.contact === 'object') {
      console.log('📞 API: Processing contact data:', profileData.contact);
      Object.keys(profileData.contact).forEach(key => {
        if (key === 'socials' && typeof profileData.contact.socials === 'object') {
          Object.keys(profileData.contact.socials).forEach(socialKey => {
            formattedData[`contact.socials.${socialKey}`] = profileData.contact.socials[socialKey];
          });
        } else {
          formattedData[`contact.${key}`] = profileData.contact[key];
        }
      });
      delete formattedData.contact;
    }
    
    console.log('📤 API: Formatted profile data being sent to backend:', formattedData);
    
    const response = await api.put('/api/users/profile', formattedData);
    console.log('✅ API: Raw backend response received:', response.data);
    
    console.log('🎉 API: PROFILE UPDATE COMPLETED');
    return response.data;
  },

  // FILE UPLOAD ENDPOINTS
  uploadAvatar: async (file) => {
    console.log('📸 API: Uploading avatar:', file.name);
    const formData = new FormData();
    formData.append('avatar', file);
    const response = await api.post('/api/users/profile/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    console.log('✅ API: Avatar uploaded:', response.data);
    return response.data;
  },

  uploadPortfolio: async (file, portfolioData) => {
    console.log('💼 API: Uploading portfolio:', file.name, portfolioData);
    const formData = new FormData();
    formData.append('portfolioFile', file);
    
    Object.keys(portfolioData).forEach(key => {
      if (portfolioData[key] !== undefined && portfolioData[key] !== null) {
        formData.append(key, portfolioData[key]);
      }
    });
    
    const response = await api.post('/api/users/profile/portfolio', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    console.log('✅ API: Portfolio uploaded:', response.data);
    return response.data;
  },

  uploadCertificate: async (file, certificateData) => {
    console.log('🏆 API: Uploading certificate:', file?.name, certificateData);
    const formData = new FormData();
    if (file) {
      formData.append('certificate', file);
    }
    
    Object.keys(certificateData).forEach(key => {
      if (certificateData[key] !== undefined && certificateData[key] !== null) {
        formData.append(key, certificateData[key]);
      }
    });
    
    const response = await api.post('/api/users/profile/certificate', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    console.log('✅ API: Certificate uploaded:', response.data);
    return response.data;
  },

  uploadCompanyImage: async (file) => {
    console.log('🏢 API: Uploading company image:', file.name);
    const formData = new FormData();
    formData.append('companyImage', file);
    const response = await api.post('/api/users/profile/company-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    console.log('✅ API: Company image uploaded:', response.data);
    return response.data;
  },

  // DELETE ENDPOINTS
  deleteCertificate: async (certId) => {
    console.log('🗑️ API: Deleting certificate:', certId);
    const response = await api.delete(`/api/users/profile/certificate/${certId}`);
    console.log('✅ API: Certificate deleted:', response.data);
    return response.data;
  },

  deletePortfolioItem: async (itemId) => {
    console.log('🗑️ API: Deleting portfolio item:', itemId);
    const response = await api.delete(`/api/users/profile/portfolio/${itemId}`);
    console.log('✅ API: Portfolio item deleted:', response.data);
    return response.data;
  },

  deleteAvatar: async () => {
    console.log('🗑️ API: Deleting avatar');
    const response = await api.delete('/api/users/profile/avatar');
    console.log('✅ API: Avatar deleted:', response.data);
    return response.data;
  },

  deleteCompanyImage: async () => {
    console.log('🗑️ API: Deleting company image');
    const response = await api.delete('/api/users/profile/company-image');
    console.log('✅ API: Company image deleted:', response.data);
    return response.data;
  },

  // EDUCATION & EXPERIENCE ENDPOINTS
  addEducation: async (educationData) => {
    console.log('🎓 API: Adding education:', educationData);
    const response = await api.post('/api/users/profile/education', educationData);
    console.log('✅ API: Education added:', response.data);
    return response.data;
  },

  updateEducation: async (educationId, educationData) => {
    console.log('✏️ API: Updating education:', educationId, educationData);
    const response = await api.put(`/api/users/profile/education/${educationId}`, educationData);
    console.log('✅ API: Education updated:', response.data);
    return response.data;
  },

  deleteEducation: async (educationId) => {
    console.log('🗑️ API: Deleting education:', educationId);
    const response = await api.delete(`/api/users/profile/education/${educationId}`);
    console.log('✅ API: Education deleted:', response.data);
    return response.data;
  },

  addExperience: async (experienceData) => {
    console.log('💼 API: Adding experience:', experienceData);
    const response = await api.post('/api/users/profile/experience', experienceData);
    console.log('✅ API: Experience added:', response.data);
    return response.data;
  },

  updateExperience: async (experienceId, experienceData) => {
    console.log('✏️ API: Updating experience:', experienceId, experienceData);
    const response = await api.put(`/api/users/profile/experience/${experienceId}`, experienceData);
    console.log('✅ API: Experience updated:', response.data);
    return response.data;
  },

  deleteExperience: async (experienceId) => {
    console.log('🗑️ API: Deleting experience:', experienceId);
    const response = await api.delete(`/api/users/profile/experience/${experienceId}`);
    console.log('✅ API: Experience deleted:', response.data);
    return response.data;
  },

  validateAddress: async (address) => {
    console.log('📍 API: Validating address:', address);
    const response = await api.post('/api/users/profile/validate-address', { address });
    console.log('✅ API: Address validated:', response.data);
    return response.data;
  },

  // CATEGORY ENDPOINTS
  getFeaturedCategories: async () => {
    console.log('⭐ API: Getting featured categories');
    const response = await api.get('/api/categories/featured');
    console.log('✅ API: Featured categories response:', response.data);
    return response.data;
  },

  getCategories: async (params = {}) => {
    console.log('📂 API: Getting categories with params:', params);
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value);
      }
    });
    const response = await api.get(`/api/categories${queryParams.toString() ? '?' + queryParams : ''}`);
    console.log('✅ API: Categories response:', response.data);
    return response.data;
  },

  // ADVERTISEMENT ENDPOINTS
  getAdvertisements: async (params = {}) => {
    console.log('📺 API: Getting advertisements with params:', params);
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value);
      }
    });
    const response = await api.get(`/api/advertisements${queryParams.toString() ? '?' + queryParams : ''}`);
    console.log('✅ API: Advertisements response:', response.data);
    return response.data;
  },

  trackAdClick: async (adId) => {
    console.log('👆 API: Tracking ad click:', adId);
    const response = await api.post(`/api/advertisements/${adId}/click`);
    console.log('✅ API: Ad click tracked:', response.data);
    return response.data;
  },

  // JOB MANAGEMENT ENDPOINTS
  getJobs: async (params = {}) => {
    console.log('💼 API: Getting jobs with params:', params);
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value && value !== '' && value !== 'all') {
        queryParams.append(key, value);
      }
    });
    const response = await api.get(`/api/jobs${queryParams.toString() ? '?' + queryParams : ''}`);
    console.log('✅ API: Jobs response:', response.data);
    return response.data;
  },

  getJobsWithCategorySearch: async (params = {}) => {
    try {
      console.log('🔍 API: Enhanced job search with params:', params);
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value && value !== '' && value !== 'all') {
          queryParams.append(key, value);
        }
      });
      
      if (params.categorySearch) {
        queryParams.delete('category');
        queryParams.append('categorySearch', params.categorySearch);
      }
      
      const url = `/api/jobs/search${queryParams.toString() ? '?' + queryParams : ''}`;
      console.log('🔗 API: Category search URL:', `${API_BASE_URL}${url}`);
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      console.error('❌ API: Enhanced job search failed:', error);
      if (error.response?.status === 404) {
        console.log('🔄 API: Search endpoint not found, falling back to regular getJobs...');
        return await apiHelpers.getJobs(params);
      }
      throw error;
    }
  },

  getRecentJobs: async () => {
    console.log('🆕 API: Getting recent jobs');
    const response = await api.get('/api/jobs/recent');
    console.log('✅ API: Recent jobs response:', response.data);
    return response.data;
  },

  getJobCategories: async () => {
    console.log('📂 API: Getting job categories');
    const response = await api.get('/api/jobs/categories');
    console.log('✅ API: Job categories response:', response.data);
    return response.data;
  },

  getJobById: async (jobId) => {
    console.log('🆔 API: Getting job by ID:', jobId);
    const response = await api.get(`/api/jobs/${jobId}`);
    console.log('✅ API: Job retrieved:', response.data);
    return response.data;
  },

  getJobBySlug: async (slug) => {
    console.log('🔗 API: Getting job by slug:', slug);
    const response = await api.get(`/api/jobs/slug/${slug}`);
    console.log('✅ API: Job retrieved by slug:', response.data);
    return response.data;
  },

  createJob: async (jobData) => {
    console.log('➕ API: Creating job:', jobData);
    const response = await api.post('/api/jobs', jobData);
    console.log('✅ API: Job created:', response.data);
    return response.data;
  },

  updateJob: async (jobId, jobData) => {
    console.log('✏️ API: Updating job:', jobId, jobData);
    const response = await api.put(`/api/jobs/${jobId}`, jobData);
    console.log('✅ API: Job updated:', response.data);
    return response.data;
  },

  deleteJob: async (jobId) => {
    try {
      console.log('🗑️ API: Deleting job:', jobId);
      const response = await api.delete(`/api/jobs/${jobId}`);
      console.log('✅ API: Job deleted:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ API: Delete job error:', error);
      if (error.response?.data) {
        throw new Error(error.response.data.message || 'Failed to delete job');
      }
      throw new Error('Network error while deleting job');
    }
  },

  applyToJob: async (jobId, applicationData) => {
    console.log('📤 API: Applying to job:', jobId, applicationData);
    const response = await api.post(`/api/jobs/${jobId}/apply`, applicationData);
    console.log('✅ API: Application submitted:', response.data);
    return response.data;
  },

  getMyJobs: async (params = {}) => {
    console.log('👤 API: Getting my jobs with params:', params);
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value && value !== '' && value !== 'all') {
        queryParams.append(key, value);
      }
    });
    const response = await api.get(`/api/jobs/my/posted${queryParams.toString() ? '?' + queryParams : ''}`);
    console.log('✅ API: My jobs retrieved:', response.data);
    return response.data;
  },

  getMyPostedJobs: async (params = {}) => {
    console.log('📋 API: Getting my posted jobs with params:', params);
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value && value !== '' && value !== 'all') {
        queryParams.append(key, value);
      }
    });
    const response = await api.get(`/api/jobs/my/posted${queryParams.toString() ? '?' + queryParams : ''}`);
    console.log('✅ API: My posted jobs retrieved:', response.data);
    return response.data;
  },

  getMyApplications: async (params = {}) => {
    console.log('📝 API: Getting my applications with params:', params);
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value && value !== '' && value !== 'all') {
        queryParams.append(key, value);
      }
    });
    const response = await api.get(`/api/jobs/my/applications${queryParams.toString() ? '?' + queryParams : ''}`);
    console.log('✅ API: Applications retrieved:', response.data);
    return response.data;
  },

  incrementJobView: async (jobId) => {
    console.log('👁️ API: Incrementing view count for job:', jobId);
    const response = await api.post(`/api/jobs/${jobId}/increment-view`);
    console.log('✅ API: View count incremented:', response.data);
    return response.data;
  },

  // APPLICATION MANAGEMENT
  getJobApplications: async (jobId, params = {}) => {
    console.log('📋 API: Getting applications for job:', jobId, params);
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value && value !== '' && value !== 'all') {
        queryParams.append(key, value);
      }
    });
    const response = await api.get(`/api/jobs/${jobId}/applications${queryParams.toString() ? '?' + queryParams : ''}`);
    console.log('✅ API: Job applications retrieved:', response.data);
    return response.data;
  },

  getReceivedApplications: async (params = {}) => {
    console.log('📥 API: Getting received applications with params:', params);
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value && value !== '' && value !== 'all') {
        queryParams.append(key, value);
      }
    });
    const response = await api.get(`/api/jobs/applications/received${queryParams.toString() ? '?' + queryParams : ''}`);
    console.log('✅ API: Received applications retrieved:', response.data);
    return response.data;
  },

  updateApplicationStatus: async (applicationId, status, message) => {
    console.log('🔄 API: Updating application status:', applicationId, status, message);
    const response = await api.patch(`/api/jobs/applications/${applicationId}/status`, { status, message });
    console.log('✅ API: Application status updated:', response.data);
    return response.data;
  },

  deleteApplication: async (applicationId, message) => {
    console.log('🗑️ API: DELETING application from database:', applicationId, message);
    try {
      const response = await api.delete(`/api/jobs/applications/${applicationId}`, {
        data: { message }
      });
      console.log('✅ API: Application PERMANENTLY DELETED:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ API: Delete application error:', error);
      if (error.response?.data) {
        throw new Error(error.response.data.message || 'Failed to delete application');
      }
      throw new Error('Network error while deleting application');
    }
  },

  withdrawApplication: async (applicationId) => {
    console.log('⏪ API: Withdrawing application:', applicationId);
    const response = await api.delete(`/api/jobs/applications/${applicationId}`);
    console.log('✅ API: Application withdrawn:', response.data);
    return response.data;
  },

  // MESSAGING ENDPOINTS
  getConversations: async (params = {}) => {
    console.log('💬 API: Getting conversations with params:', params);
    try {
      const response = await api.get('/api/messages/conversations', { params });
      console.log('✅ API: Conversations response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ getConversations Error:', error);
      throw error;
    }
  },

  getMessages: async (conversationId) => {
    console.log('📨 API: Getting messages for conversation:', conversationId);
    try {
      const response = await api.get(`/api/messages/conversation/${conversationId}`);
      console.log('✅ API: Messages response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ getMessages Error:', error);
      throw error;
    }
  },

  sendMessage: async (messageData) => {
    console.log('📤 API: Sending message:', messageData);
    try {
      const requestData = {
        receiverId: messageData.receiverId,
        content: messageData.content,
        messageType: messageData.messageType || 'text',
        conversationId: messageData.conversationId,
        metadata: messageData.metadata
      };
      
      console.log('📋 Request data:', requestData);
      const response = await api.post('/api/messages/send', requestData);
      console.log('✅ API: Message sent response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ sendMessage Error:', error);
      throw error;
    }
  },

  createOrFindConversation: async (conversationData) => {
    console.log('🔍 API: Creating/finding conversation:', conversationData);
    try {
      const response = await api.post('/api/messages/conversation', conversationData);
      console.log('✅ API: Conversation response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ createOrFindConversation Error:', error);
      throw error;
    }
  },

  startConversationWithJob: async (jobId, userId, initialMessage) => {
    console.log('💼 API: Starting conversation with job context:', jobId, userId, initialMessage);
    const response = await api.post(`/api/jobs/${jobId}/contact/${userId}`, {
      message: initialMessage
    });
    console.log('✅ API: Job conversation started:', response.data);
    return response.data;
  },

  uploadMessageFile: async (formData) => {
    try {
      console.log('📎 uploadMessageFile: Starting file upload with complete form data...');
      
      console.log('📋 uploadMessageFile: FormData contents:');
      for (let [key, value] of formData.entries()) {
        console.log(key, value instanceof File ? `File(${value.name}, ${value.size} bytes)` : value);
      }
      
      const config = {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 60000,
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      };
      
      const response = await api.post('/api/messages/upload', formData, config);
      console.log('✅ uploadMessageFile: File uploaded successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ uploadMessageFile: Upload failed:', error);
      
      if (error.response) {
        console.error('📋 uploadMessageFile: Response Error Details:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
          headers: error.response.headers
        });
      } else if (error.request) {
        console.error('🌐 uploadMessageFile: Request Error - No response received:', error.request);
      } else {
        console.error('⚠️ uploadMessageFile: General Error:', error.message);
      }
      
      throw error;
    }
  },

  markMessagesAsRead: async (conversationId) => {
    console.log('✅ API: Marking messages as read:', conversationId);
    try {
      const response = await api.put(`/api/messages/read/${conversationId}`);
      console.log('✅ API: Messages marked as read:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ markMessagesAsRead Error:', error);
      throw error;
    }
  },

  getUnreadCount: async () => {
    console.log('📊 API: Getting unread message count');
    try {
      const response = await api.get('/api/messages/unread-count');
      console.log('✅ API: Unread count response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ getUnreadCount Error:', error);
      throw error;
    }
  },

  searchMessages: async (query, params = {}) => {
    console.log('🔍 API: Searching messages:', query, params);
    try {
      const searchParams = new URLSearchParams({ query, ...params });
      const response = await api.get(`/api/messages/search?${searchParams}`);
      console.log('✅ API: Message search response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ searchMessages Error:', error);
      throw error;
    }
  },

  deleteMessage: async (messageId) => {
    console.log('🗑️ API: Deleting message:', messageId);
    try {
      const response = await api.delete(`/api/messages/${messageId}`);
      console.log('✅ API: Message deleted:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ deleteMessage Error:', error);
      throw error;
    }
  },

  archiveConversation: async (conversationId) => {
    console.log('📁 API: Archiving conversation:', conversationId);
    const response = await api.put(`/api/messages/conversation/${conversationId}/archive`);
    console.log('✅ API: Conversation archived:', response.data);
    return response.data;
  },

  deleteConversation: async (conversationId) => {
    console.log('🗑️ API: Deleting conversation:', conversationId);
    try {
      const response = await api.delete(`/api/messages/conversation/${conversationId}`);
      console.log('✅ API: Conversation deleted:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ deleteConversation Error:', error);
      throw error;
    }
  },

  unarchiveConversation: async (conversationId) => {
    console.log('📂 API: Unarchiving conversation:', conversationId);
    const response = await api.put(`/api/messages/conversation/${conversationId}/unarchive`);
    console.log('✅ API: Conversation unarchived:', response.data);
    return response.data;
  },

  // PUBLIC USER ENDPOINTS
  getProfessionals: async (filters = {}) => {
    console.log('👥 API: Getting professionals with filters:', filters);
    const queryParams = new URLSearchParams(filters);
    const response = await api.get(`/api/users/professionals${queryParams.toString() ? '?' + queryParams : ''}`);
    console.log('✅ API: Professionals response:', response.data);
    return response.data;
  },

  getUserById: async (userId) => {
    console.log('🆔 API: Getting user by ID:', userId);
    const response = await api.get(`/api/users/${userId}`);
    console.log('✅ API: User retrieved:', response.data);
    return response.data;
  },

  // ADMIN ENDPOINTS
  getAllUsers: async (params = {}) => {
    console.log('👨‍💼 API: Getting all users (admin):', params);
    const queryParams = new URLSearchParams(params);
    const response = await api.get(`/api/users/admin/all-users${queryParams.toString() ? '?' + queryParams : ''}`);
    console.log('✅ API: All users response:', response.data);
    return response.data;
  },

  getUserStats: async () => {
    console.log('📊 API: Getting user stats');
    const response = await api.get('/api/users/admin/user-stats');
    console.log('✅ API: User stats response:', response.data);
    return response.data;
  },

  updateUserRole: async (userId, role) => {
    console.log('🔄 API: Updating user role:', userId, role);
    const response = await api.put(`/api/users/admin/user/${userId}/role`, { role });
    console.log('✅ API: User role updated:', response.data);
    return response.data;
  },

  deactivateUser: async (userId) => {
    console.log('❌ API: Deactivating user:', userId);
    const response = await api.put(`/api/users/admin/user/${userId}/deactivate`);
    console.log('✅ API: User deactivated:', response.data);
    return response.data;
  },

  // PROFILE COMPLETION & VALIDATION
  getProfileCompletion: async () => {
    console.log('📊 API: Getting profile completion');
    const response = await api.get('/api/users/profile/completion');
    console.log('✅ API: Profile completion:', response.data);
    return response.data;
  },

  validatePhoneNumber: async (phoneNumber) => {
    console.log('📞 API: Validating phone number:', phoneNumber);
    const response = await api.post('/api/users/profile/validate-phone', { phoneNumber });
    console.log('✅ API: Phone validation result:', response.data);
    return response.data;
  },

  // SEARCH & FILTER ENDPOINTS
  searchProfessionals: async (searchQuery, filters = {}) => {
    console.log('🔍 API: Searching professionals:', searchQuery, filters);
    const params = { search: searchQuery, ...filters };
    const queryParams = new URLSearchParams(params);
    const response = await api.get(`/api/users/professionals/search${queryParams.toString() ? '?' + queryParams : ''}`);
    console.log('✅ API: Search results:', response.data);
    return response.data;
  },

  searchJobs: async (searchQuery, filters = {}) => {
    console.log('🔍 API: Searching jobs:', searchQuery, filters);
    const params = { search: searchQuery, ...filters };
    const queryParams = new URLSearchParams(params);
    const response = await api.get(`/api/jobs/search${queryParams.toString() ? '?' + queryParams : ''}`);
    console.log('✅ API: Job search results:', response.data);
    return response.data;
  },

  // ANALYTICS ENDPOINTS
  getProfileViews: async () => {
    console.log('👁️ API: Getting profile views');
    const response = await api.get('/api/users/profile/views');
    console.log('✅ API: Profile views:', response.data);
    return response.data;
  },

  trackProfileView: async (profileId) => {
    console.log('👁️ API: Tracking profile view:', profileId);
    const response = await api.post(`/api/users/profile/${profileId}/view`);
    console.log('✅ API: Profile view tracked:', response.data);
    return response.data;
  },

  // NOTIFICATION ENDPOINTS
  getNotifications: async () => {
    console.log('🔔 API: Getting notifications');
    const response = await api.get('/api/notifications');
    console.log('✅ API: Notifications:', response.data);
    return response.data;
  },

  markNotificationRead: async (notificationId) => {
    console.log('✅ API: Marking notification as read:', notificationId);
    const response = await api.put(`/api/notifications/${notificationId}/read`);
    console.log('✅ API: Notification marked as read:', response.data);
    return response.data;
  },

  markAllNotificationsRead: async () => {
    console.log('✅ API: Marking all notifications as read');
    const response = await api.put('/api/notifications/read-all');
    console.log('✅ API: All notifications marked as read:', response.data);
    return response.data;
  }
};

// ✅ CRITICAL FIX: AUTHENTICATION HELPER FUNCTIONS with CORRECT token key
export const authHelpers = {
  getCurrentUser: () => {
    const user = localStorage.getItem('wn_user'); // ✅ Keep wn_user as is
    return user ? JSON.parse(user) : null;
  },

  isAuthenticated: () => {
    return !!localStorage.getItem('wn_token'); // ✅ FIXED: Use wn_token
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
    localStorage.removeItem('wn_token'); // ✅ FIXED: Use wn_token
    localStorage.removeItem('wn_user');
    window.location.href = '/login';
  },

  getToken: () => {
    return localStorage.getItem('wn_token'); // ✅ FIXED: Use wn_token
  },

  setAuthData: (token, user) => {
    localStorage.setItem('wn_token', token); // ✅ FIXED: Use wn_token
    localStorage.setItem('wn_user', JSON.stringify(user));
  },

  clearAuthData: () => {
    localStorage.removeItem('wn_token'); // ✅ FIXED: Use wn_token
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

// ✅ SOCKET.IO HELPER FUNCTIONS with CORRECT token key
export const socketHelpers = {
  canConnectSocket: () => {
    const token = getAuthToken();
    const user = localStorage.getItem('wn_user');
    return !!(token && user);
  },

  getSocketToken: () => {
    const token = getAuthToken();
    if (!token) {
      console.error('🚫 socketHelpers: No authentication token available');
      return null;
    }
    console.log('🔌 socketHelpers: Socket.IO token prepared:', 'Bearer ' + token.substring(0, 10) + '...');
    return token;
  },

  getSocketUser: () => {
    try {
      const userData = localStorage.getItem('wn_user');
      if (!userData) return null;
      
      const user = JSON.parse(userData);
      console.log('👤 socketHelpers: Socket.IO connection ready for user:', user.name, user._id);
      return user;
    } catch (error) {
      console.error('❌ socketHelpers: Error parsing user data:', error);
      return null;
    }
  },

  getSocketURL: () => {
    return SOCKET_URL;
  }
};

// ✅ ENHANCED ERROR HANDLING with better login context
export const handleApiError = (error, context = 'API') => {
  console.error(`❌ ${context} Error:`, error);
  
  // Handle specific 404 error for login
  if (error.response?.status === 404 && context === 'Login') {
    return {
      type: 'not_found',
      message: 'Login endpoint not found. Please check if the backend is running correctly.',
      details: 'The API endpoint /api/auth/login was not found on the server.'
    };
  }
  
  if (error.response?.data?.message) {
    return {
      type: 'api_error',
      message: error.response.data.message,
      details: error.response.data.error || 'Server returned an error.'
    };
  }
  
  if (error.response?.status === 404) {
    return {
      type: 'not_found',
      message: 'Resource not found',
      details: 'The requested resource could not be found on the server.'
    };
  }
  
  if (error.response?.status === 401) {
    return {
      type: 'auth',
      message: 'Authentication failed',
      details: 'Please check your credentials and try again.'
    };
  }
  
  if (error.response?.status === 403) {
    return {
      type: 'forbidden',
      message: 'Access denied',
      details: 'You do not have permission to access this resource.'
    };
  }
  
  if (error.response?.status === 422) {
    return {
      type: 'validation',
      message: 'Validation failed',
      details: error.response.data?.errors?.map(err => err.message).join(', ') || 'Please check your input data.'
    };
  }
  
  if (error.response?.status === 500) {
    return {
      type: 'server_error',
      message: 'Server error. Please try again later.',
      details: 'Internal server error occurred.'
    };
  }
  
  if (error.code === 'NETWORK_ERROR' || !error.response) {
    return {
      type: 'network_error',
      message: 'Network error. Please check your connection.',
      details: 'Could not connect to the server.'
    };
  }
  
  if (error.code === 'ECONNABORTED') {
    return {
      type: 'timeout',
      message: 'Request timeout. Please try again.',
      details: 'The request took too long to complete.'
    };
  }
  
  return {
    type: 'unknown_error',
    message: 'An unexpected error occurred',
    details: error.message || 'Unknown error'
  };
};

// ✅ UTILITY FUNCTIONS (ALL YOUR EXISTING FUNCTIONS PRESERVED)
export const utils = {
  formatFileSize: (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  validateFileType: (file, allowedTypes = ['image/jpeg', 'image/png', 'image/gif']) => {
    return allowedTypes.includes(file.type);
  },

  validateFileSize: (file, maxSizeInMB = 5) => {
    const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
    return file.size <= maxSizeInBytes;
  },

  validateIndianPhone: (phoneNumber) => {
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    return /^[6-9]\d{9}$/.test(cleanNumber);
  },

  formatIndianPhone: (phoneNumber) => {
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    if (cleanNumber.length === 10) {
      return cleanNumber.substring(0, 5) + ' ' + cleanNumber.substring(5);
    }
    return cleanNumber;
  },

  getThumbnailUrl: (imageUrl, size = 'medium') => {
    if (!imageUrl) return null;
    return imageUrl;
  },

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

  truncateText: (text, maxLength = 100) => {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  },

  capitalizeFirst: (str) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  },

  generateId: () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  },

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

  formatMessageTime: (date) => {
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
      console.error('Date formatting error:', error);
      return 'Invalid Date';
    }
  }
};

// ✅ FORM VALIDATION HELPERS (ALL YOUR EXISTING FUNCTIONS PRESERVED)
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

// ✅ Export API instance as default
export default api;

// ✅ EXPORT BASE URLS FOR OTHER COMPONENTS
export { API_BASE_URL, SOCKET_URL };
