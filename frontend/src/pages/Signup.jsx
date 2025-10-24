import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FaEye, FaEyeSlash, FaArrowLeft } from 'react-icons/fa';
import GoogleLogin from '../components/GoogleLogin';
import './Auth.css';
import logo from '../assets/logo.png';

const Signup = () => {
  const [searchParams] = useSearchParams();
  const initialRole = searchParams.get('role') || 'professional';
  
  const [userRole, setUserRole] = useState(initialRole);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreeToTerms: false
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, feedback: '' });

  const { register } = useAuth();
  const navigate = useNavigate();

  // ✅ Load role parameter
  useEffect(() => {
    const roleParam = searchParams.get('role');
    if (roleParam && ['client', 'professional'].includes(roleParam)) {
      setUserRole(roleParam);
    }
  }, [searchParams]);

  // ✅ Google OAuth success handler
  const handleGoogleSignupSuccess = async (result) => {
    console.log('✅ Google signup successful!', result.user.name);
    setMessage('Account created successfully! Redirecting...');
    setTimeout(() => {
      navigate('/', { replace: true });
    }, 1500);
  };

  // ✅ Google OAuth error handler
  const handleGoogleSignupError = (error) => {
    console.error('❌ Google signup error:', error);
    setMessage('Google signup failed: ' + error);
  };

  // ✅ Password strength checker
  const checkPasswordStrength = (password) => {
    if (!password) return { score: 0, feedback: '' };

    let score = 0;
    let feedback = [];

    // Length check
    if (password.length >= 8) score += 1;
    else feedback.push('at least 8 characters');

    // Uppercase check
    if (/[A-Z]/.test(password)) score += 1;
    else feedback.push('uppercase letter');

    // Lowercase check
    if (/[a-z]/.test(password)) score += 1;
    else feedback.push('lowercase letter');

    // Number check
    if (/\d/.test(password)) score += 1;
    else feedback.push('number');

    // Special character check
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1;
    else feedback.push('special character');

    const strengthLevels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
    const strengthLevel = Math.min(Math.floor(score), 4);
    
    return {
      score,
      level: strengthLevels[strengthLevel],
      feedback: feedback.length > 0 ? `Add ${feedback.slice(0, 2).join(', ')}` : 'Strong password!'
    };
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    
    setFormData((prev) => ({ ...prev, [name]: newValue }));
    
    // ✅ Real-time password strength checking
    if (name === 'password') {
      setPasswordStrength(checkPasswordStrength(value));
    }
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    if (message) setMessage('');
  };

  const handleRoleSelect = (role) => {
    setUserRole(role);
    // Update URL without navigation
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set('role', role);
    window.history.replaceState({}, '', `${window.location.pathname}?${newSearchParams}`);
  };

  // ✅ Toggle password visibility
  const togglePasswordVisibility = (field) => {
    if (field === 'password') {
      setShowPassword(!showPassword);
    } else {
      setShowConfirmPassword(!showConfirmPassword);
    }
  };

  // ✅ Enhanced validation
  const validateForm = () => {
    const newErrors = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Full name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    } else if (!/^[a-zA-Z\s]+$/.test(formData.name.trim())) {
      newErrors.name = 'Name should only contain letters and spaces';
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (passwordStrength.score < 2) {
      newErrors.password = 'Password is too weak. Please choose a stronger password.';
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // Terms validation
    if (!formData.agreeToTerms) {
      newErrors.agreeToTerms = 'You must agree to the Terms & Conditions';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    setMessage('');

    try {
      const result = await register({
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
        role: userRole, // ✅ KEEPING EXACT ROLE VALUES: 'professional' or 'client'
        authType: 'manual'
      });

      if (result.success) {
        setMessage('Account created successfully! Redirecting...');
        setFormData({ 
          name: '', 
          email: '', 
          password: '', 
          confirmPassword: '',
          agreeToTerms: false 
        });
        
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 1500);
      } else {
        throw new Error(result.error || 'Registration failed');
      }
      
    } catch (error) {
      setMessage(error.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ✅ UPDATED: Changed "Freelancer" to "Skilled Professional"
  const getRoleDisplayName = (role) => {
    return role === 'professional' ? 'Skilled Professional' : 'Client';
  };

  // ✅ UPDATED: Better description for skilled professionals
  const getRoleDescription = (role) => {
    return role === 'professional' 
      ? 'Finds best work opportunities' 
      : 'Find talented professionals for your business needs';
  };

  // ✅ Get password strength color
  const getPasswordStrengthColor = (score) => {
    const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#16a34a'];
    return colors[Math.min(score, 4)] || colors[0];
  };

  return (
    <div className="auth-container mobile-optimized">
      <div className="auth-card">
        {/* Mobile Back Button */}
        <button 
          className="mobile-back-btn"
          onClick={() => navigate(-1)}
          aria-label="Go back"
        >
          <FaArrowLeft />
        </button>

        <div className="auth-header">
          <div className="logo-placeholder">
            <img src={logo} alt="Sampark Work" className="auth-logo" />
          </div>
          <h2>Create your account</h2>
          <p>Join as a {getRoleDisplayName(userRole).toLowerCase()}</p>
        </div>

        {/* Role Display */}
        <div className="selected-role-display">
          <div className="selected-role-card">
            <div className="selected-role-icon">
              <i className={userRole === 'client' ? 'fas fa-user-tie' : 'fas fa-briefcase'}></i>
            </div>
            <div className="selected-role-info">
              <span className="selected-role-title">
                I'm a {getRoleDisplayName(userRole)}
              </span>
              <span className="selected-role-desc">
                {getRoleDescription(userRole)}
              </span>
            </div>
            <button 
              className="change-role-btn"
              onClick={() => handleRoleSelect(userRole === 'client' ? 'professional' : 'client')} // ✅ Toggle between exact role values
              type="button"
              disabled={loading}
            >
              Change
            </button>
          </div>
        </div>

        {message && (
          <div className={`message ${message.includes('successfully') ? 'success' : 'error'}`}>
            {message}
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          {/* Name Field */}
          <div className="form-group">
            <input
              type="text"
              className={`form-control ${errors.name ? 'error' : ''}`}
              placeholder="Full Name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              disabled={loading}
              required
              autoComplete="name"
            />
            {errors.name && <div className="field-error">{errors.name}</div>}
          </div>

          {/* Email Field */}
          <div className="form-group">
            <input
              type="email"
              className={`form-control ${errors.email ? 'error' : ''}`}
              placeholder="Email Address"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              disabled={loading}
              required
              autoComplete="email"
            />
            {errors.email && <div className="field-error">{errors.email}</div>}
          </div>

          {/* ✅ Enhanced Password Field with Strength Indicator */}
          <div className="form-group password-group">
            <div className="password-input-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                className={`form-control password-input ${errors.password ? 'error' : ''}`}
                placeholder="Password (min. 8 characters)"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                disabled={loading}
                required
                autoComplete="new-password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => togglePasswordVisibility('password')}
                disabled={loading}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            
            {/* ✅ Password Strength Indicator */}
            {formData.password && (
              <div className="password-strength">
                <div className="strength-bar">
                  <div 
                    className="strength-fill"
                    style={{ 
                      width: `${(passwordStrength.score / 5) * 100}%`,
                      backgroundColor: getPasswordStrengthColor(passwordStrength.score)
                    }}
                  ></div>
                </div>
                <div className="strength-text" style={{ color: getPasswordStrengthColor(passwordStrength.score) }}>
                  {passwordStrength.level} - {passwordStrength.feedback}
                </div>
              </div>
            )}
            
            {errors.password && <div className="field-error">{errors.password}</div>}
          </div>

          {/* ✅ Enhanced Confirm Password Field */}
          <div className="form-group password-group">
            <div className="password-input-wrapper">
              <input
                type={showConfirmPassword ? "text" : "password"}
                className={`form-control password-input ${errors.confirmPassword ? 'error' : ''}`}
                placeholder="Confirm Password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                disabled={loading}
                required
                autoComplete="new-password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => togglePasswordVisibility('confirm')}
                disabled={loading}
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            
            {/* ✅ Password Match Indicator */}
            {formData.confirmPassword && formData.password && (
              <div className={`password-match ${formData.password === formData.confirmPassword ? 'match' : 'no-match'}`}>
                {formData.password === formData.confirmPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
              </div>
            )}
            
            {errors.confirmPassword && <div className="field-error">{errors.confirmPassword}</div>}
          </div>

          {/* ✅ CUSTOM CHECKBOX THAT WILL DEFINITELY WORK */}
          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label 
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                cursor: 'pointer',
                fontSize: '14px',
                lineHeight: '1.4',
                color: '#4b5563',
                fontWeight: '400'
              }}
            >
              {/* ✅ HIDDEN REAL CHECKBOX */}
              <input
                type="checkbox"
                name="agreeToTerms"
                checked={formData.agreeToTerms}
                onChange={handleInputChange}
                required
                disabled={loading}
                style={{
                  position: 'absolute',
                  opacity: 0,
                  width: 0,
                  height: 0
                }}
              />
              
              {/* ✅ CUSTOM VISIBLE CHECKBOX */}
              <div
                style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid #d1d5db',
                  borderRadius: '3px',
                  backgroundColor: formData.agreeToTerms ? '#16a34a' : '#ffffff',
                  borderColor: formData.agreeToTerms ? '#16a34a' : '#d1d5db',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: '2px',
                  transition: 'all 0.2s ease'
                }}
              >
                {formData.agreeToTerms && (
                  <div
                    style={{
                      width: '4px',
                      height: '8px',
                      border: 'solid white',
                      borderWidth: '0 2px 2px 0',
                      transform: 'rotate(45deg)',
                      marginTop: '-2px'
                    }}
                  />
                )}
              </div>
              
              {/* ✅ TEXT */}
              <span>
                I agree to the <Link 
                  to="/terms" 
                  target="_blank" 
                  style={{ 
                    color: '#16a34a', 
                    textDecoration: 'none',
                    fontWeight: '500'
                  }}
                  onMouseOver={(e) => e.target.style.textDecoration = 'underline'}
                  onMouseOut={(e) => e.target.style.textDecoration = 'none'}
                >Terms & Conditions</Link> and <Link 
                  to="/privacy" 
                  target="_blank" 
                  style={{ 
                    color: '#16a34a', 
                    textDecoration: 'none',
                    fontWeight: '500'
                  }}
                  onMouseOver={(e) => e.target.style.textDecoration = 'underline'}
                  onMouseOut={(e) => e.target.style.textDecoration = 'none'}
                >Privacy Policy</Link>
              </span>
            </label>
            {errors.agreeToTerms && <div className="field-error">{errors.agreeToTerms}</div>}
          </div>

          <button type="submit" className="btn-auth primary" disabled={loading}>
            {loading ? (
              <>
                <span className="spinner"></span>
                Creating Account...
              </>
            ) : (
              `Create ${getRoleDisplayName(userRole)} Account`
            )}
          </button>
        </form>

        {/* ✅ Divider for Google OAuth */}
        <div className="auth-divider">
          <span>Or sign up with</span>
        </div>

        {/* ✅ Google OAuth Integration */}
        <div className="social-auth">
          <GoogleLogin 
            role={userRole}  
            onSuccess={handleGoogleSignupSuccess}
            onError={handleGoogleSignupError}
            disabled={loading}
          />
        </div>

        <div className="auth-footer">
          Already have an account? <Link to="/login">Log in</Link>
        </div>
      </div>
    </div>
  );
};

export default Signup;
