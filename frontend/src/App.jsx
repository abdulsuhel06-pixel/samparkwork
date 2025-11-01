import React from 'react';
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext.jsx";
import Navbar from "./components/Navbar.jsx";
import Footer from "./components/Footer.jsx";
import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
import FindJobs from "./pages/FindJobs.jsx";
import JobDetail from "./pages/JobDetail.jsx";
import PostJob from "./pages/PostJob.jsx";
import { useAuth } from "./context/AuthContext.jsx";
import Bids from "./pages/Bids.jsx";
import Messages from "./pages/Messages.jsx";
import FreelancerList from "./pages/FreelancerList.jsx";
import FreelancerProfile from "./pages/FreelancerProfile.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import FindFreelancer from "./pages/FindFreelancer.jsx";
import Category from "./pages/CategoryPage.jsx";
import About from "./pages/About.jsx";
import RoleBasedProfile from './components/RoleBasedProfile.jsx';
import Applications from './pages/Applications.jsx';
// ✅ NEW: Import ForgotPassword component
import ForgotPassword from './pages/ForgotPassword.jsx';
import TermsConditions from './pages/TermsConditions.jsx';
import PrivacyPolicy from './pages/PrivacyPolicy.jsx';
import Notifications from './pages/Notifications.jsx';

const Protected = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '60vh',
        fontSize: '1.1rem',
        color: '#64748b'
      }}>
        <div>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid #e2e8f0',
            borderTop: '3px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }}></div>
          Loading your profile...
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  return children;
};

const ClientProtected = ({ children }) => {
  const { user, loading, canPostJobs } = useAuth();

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '60vh' 
      }}>
        Loading...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!canPostJobs()) {
    return <Navigate to="/find-jobs" replace />;
  }

  return children;
};

const AdminProtected = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '60vh' 
      }}>
        Loading...
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return children;
};

const AppContent = () => {
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        
        {/* Job Routes */}
        <Route path="/find-jobs" element={<FindJobs />} />
        <Route path="/jobs" element={<Navigate to="/find-jobs" replace />} />
        <Route path="/job/:slug" element={<JobDetail />} />
        <Route path="/jobs/:id" element={<JobDetail />} />
        
        {/* Protected Job Posting - Only Clients/Admins */}
        <Route path="/post-job" element={<ClientProtected><PostJob /></ClientProtected>} />
        
        {/* Freelancer Routes */}
        <Route path="/find-talents" element={<FindFreelancer />} />
        <Route path="/find-freelancers" element={<FindFreelancer />} />
        <Route path="/freelancers" element={<FreelancerList />} />
        <Route path="/freelancers/:id" element={<FreelancerProfile />} />
        
        {/* ✅ NEW: User Profile Viewing Routes (for messaging system) */}
        <Route path="/user/:userId" element={<RoleBasedProfile />} />
        <Route path="/users/:userId" element={<RoleBasedProfile />} />
        <Route path="/profile/:userId" element={<RoleBasedProfile />} />
        
        {/* Authentication Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        {/* ✅ NEW: Forgot Password Route */}
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ForgotPassword />} />
        
        {/* Protected User Routes */}
        <Route path="/bids" element={<Protected><Bids /></Protected>} />
        
        {/* ✅ ENHANCED: Messages Routes with conversation support */}
        <Route path="/messages" element={<Protected><Messages /></Protected>} />
        <Route path="/messages/:conversationId" element={<Protected><Messages /></Protected>} />
        <Route path="/chat" element={<Protected><Messages /></Protected>} />
        <Route path="/chat/:conversationId" element={<Protected><Messages /></Protected>} />
        
        {/* Profile Routes */}
        <Route path="/profile" element={<Protected><RoleBasedProfile /></Protected>} />
        <Route path="/dashboard" element={<Protected><RoleBasedProfile /></Protected>} />
        
        {/* ✅ ENHANCED: Applications Routes with messaging integration */}
        <Route path="/applications" element={<Protected><Applications /></Protected>} />
        <Route path="/my-applications" element={<Protected><Applications /></Protected>} />
        <Route path="/job-applications" element={<Protected><Applications /></Protected>} />
        
        {/* ✅ NEW: Job Management Routes for Clients */}
        <Route path="/manage-jobs" element={<ClientProtected><Applications /></ClientProtected>} />
        <Route path="/posted-jobs" element={<ClientProtected><Applications /></ClientProtected>} />
        <Route path="/my-jobs" element={<ClientProtected><Applications /></ClientProtected>} />
        
        {/* Admin Routes */}
        <Route path="/admin" element={<AdminProtected><AdminDashboard /></AdminProtected>} />
        <Route path="/admin/dashboard" element={<AdminProtected><AdminDashboard /></AdminProtected>} />
        
        {/* Other Routes */}
        <Route path="/categories" element={<Category />} />
        <Route path="/category/:categoryId" element={<Category />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<About />} />
        <Route path="/help" element={<About />} />
        
        {/* ✅ NEW: Messaging Integration Routes */}
        <Route path="/start-conversation" element={<Protected><Messages /></Protected>} />
        <Route path="/new-message" element={<Protected><Messages /></Protected>} />
        
        {/* ✅ NEW: Professional Discovery Routes */}
        <Route path="/professionals" element={<FreelancerList />} />
        <Route path="/professionals/:id" element={<FreelancerProfile />} />
        <Route path="/talents" element={<FreelancerList />} />
        <Route path="/talents/:id" element={<FreelancerProfile />} />
        
        {/* ✅ NEW: Additional helpful redirects */}
        <Route path="/signup-professional" element={<Signup />} />
        <Route path="/signup-client" element={<Signup />} />
        <Route path="/register" element={<Signup />} />
        <Route path="/sign-in" element={<Login />} />
        <Route path="/sign-up" element={<Signup />} />

        {/* Add these routes to your existing routes */}
<Route path="/terms" element={<TermsConditions />} />
<Route path="/privacy" element={<PrivacyPolicy />} />
<Route path="/terms-conditions" element={<TermsConditions />} />
<Route path="/privacy-policy" element={<PrivacyPolicy />} />
<Route path="/terms-and-conditions" element={<TermsConditions />} />
<Route path="/notifications" element={<Notifications />} />
        
        {/* Catch-all Redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      
      {isHomePage && <Footer />}
      
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        /* ✅ NEW: Messaging system styles */
        .messaging-notification {
          position: fixed;
          top: 20px;
          right: 20px;
          background: #10b981;
          color: white;
          padding: 12px 20px;
          border-radius: 8px;
          font-weight: 500;
          z-index: 10000;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          animation: slideIn 0.3s ease;
        }
        
        .messaging-notification.error {
          background: #ef4444;
        }
        
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
        
        /* ✅ Enhanced loading states */
        .route-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 60vh;
          flex-direction: column;
          gap: 16px;
        }
        
        .route-loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #e2e8f0;
          border-top: 3px solid #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        
        .route-loading-text {
          font-size: 1.1rem;
          color: #64748b;
          text-align: center;
        }
        
        /* ✅ Mobile-first responsive design */
        @media (max-width: 768px) {
          .messaging-notification {
            left: 20px;
            right: 20px;
            top: 10px;
          }
          
          .route-loading {
            min-height: 50vh;
            padding: 20px;
          }
        }
      `}</style>
    </>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
