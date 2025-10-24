import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import GoogleLogin from "../components/GoogleLogin"; // ✅ NEW: Import GoogleLogin component
import "./Auth.css";
import logo from "../assets/logo.png";

const Login = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false,
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  // ✅ Load saved credentials
  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail');
    const savedRememberMe = localStorage.getItem('rememberMe') === 'true';
    
    if (savedEmail && savedRememberMe) {
      setFormData(prev => ({
        ...prev,
        email: savedEmail,
        rememberMe: savedRememberMe
      }));
    }
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    if (error) setError("");
  };

  // ✅ Toggle password visibility
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // ✅ Handle Remember Me functionality
  const handleRememberMe = (email, rememberMe) => {
    if (rememberMe) {
      localStorage.setItem('rememberedEmail', email);
      localStorage.setItem('rememberMe', 'true');
    } else {
      localStorage.removeItem('rememberedEmail');
      localStorage.removeItem('rememberMe');
    }
  };

  // ✅ NEW: Google OAuth success handler
  const handleGoogleLoginSuccess = (result) => {
    console.log('✅ Google login successful!', result.user.name);
    // Redirect to home page after successful login
    navigate('/', { replace: true });
  };

  // ✅ NEW: Google OAuth error handler
  const handleGoogleLoginError = (error) => {
    console.error('❌ Google login error:', error);
    setError('Google login failed: ' + error);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Enhanced validation
    if (!formData.email.trim()) {
      setError("Email is required");
      return;
    }
    
    if (!isValidEmail(formData.email)) {
      setError("Please enter a valid email address");
      return;
    }
    
    if (!formData.password.trim()) {
      setError("Password is required");
      return;
    }
    
    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    setError("");
    setLoading(true);

    try {
      console.log("🔑 Attempting login with:", { email: formData.email.trim() });
      
      const result = await login({
        email: formData.email.trim(),
        password: formData.password.trim()
      });

      console.log("✅ Login result:", result);

      if (result.success) {
        // ✅ Handle Remember Me functionality
        handleRememberMe(formData.email.trim(), formData.rememberMe);
        
        console.log("🎉 Login successful, redirecting to home");
        navigate("/", { replace: true });
      } else {
        console.error("❌ Login failed:", result.error);
        setError(result.error || "Login failed. Please try again.");
      }
    } catch (err) {
      console.error("❌ Login error:", err);
      setError(err.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Email validation helper
  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="logo-placeholder">
            <img src={logo} alt="Sampark Work" className="auth-logo" />
          </div>
          <h2>Welcome Back</h2>
          <p>Sign in to your account to continue</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <input
              type="email"
              className={`form-control ${error && !formData.email ? 'error' : ''}`}
              placeholder="Email Address"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              disabled={loading}
              required
              autoComplete="email"
            />
          </div>

          {/* ✅ Enhanced password field with eye toggle */}
          <div className="form-group password-group">
            <div className="password-input-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                className={`form-control password-input ${error && !formData.password ? 'error' : ''}`}
                placeholder="Password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                disabled={loading}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={togglePasswordVisibility}
                disabled={loading}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          <div className="form-options">
            {/* ✅ Enhanced Remember Me checkbox */}
            <div className="form-check">
              <input
                type="checkbox"
                id="remember"
                name="rememberMe"
                checked={formData.rememberMe}
                onChange={handleInputChange}
                disabled={loading}
                className="custom-checkbox"
              />
              <label htmlFor="remember" className="checkbox-label">
                <span className="checkmark"></span>
                Remember me
              </label>
            </div>
            <Link to="/forgot-password" className="forgot-link">
              Forgot Password?
            </Link>
          </div>

          <button type="submit" className="btn-auth primary" disabled={loading}>
            {loading ? (
              <>
                <span className="spinner"></span>
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        {/* ✅ NEW: Divider for Google OAuth */}
        <div className="auth-divider">
          <span>Or sign in with</span>
        </div>

        {/* ✅ NEW: Google OAuth Integration */}
        <div className="social-auth">
          <GoogleLogin 
            onSuccess={handleGoogleLoginSuccess}
            onError={handleGoogleLoginError}
            disabled={loading}
          />
        </div>

        <div className="auth-footer">
          Don't have an account? <Link to="/signup">Create Account</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
