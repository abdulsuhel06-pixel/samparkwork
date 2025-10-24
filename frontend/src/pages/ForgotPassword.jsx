import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaEnvelope, FaKey, FaEye, FaEyeSlash, FaArrowLeft, FaCheckCircle } from 'react-icons/fa';
import { MdEmail, MdLock } from 'react-icons/md';
import { BsShieldCheck } from 'react-icons/bs';
import { apiHelpers } from '../services/api';
import './Auth.css';
import logo from '../assets/logo.png';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1); // 1: Email, 2: Code, 3: New Password
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // ✅ CRITICAL FIX: Store resetToken from backend response
  const [resetToken, setResetToken] = useState('');

  // ✅ Clear error when user types
  const handleInputChange = (setter) => (e) => {
    setter(e.target.value);
    if (error) setError('');
  };

  // ✅ Step 1: Send Reset Code
  const handleSendCode = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    if (!isValidEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      // ✅ FIXED: Capture resetToken from API response
      const response = await apiHelpers.forgotPasswordRequest(email.trim());
      console.log('✅ Forgot password response:', response);
      
      // Store the resetToken from the response
      if (response.data && response.data.resetToken) {
        setResetToken(response.data.resetToken);
        console.log('✅ Reset token stored:', response.data.resetToken.substring(0, 8) + '...');
      }
      
      setSuccess('Reset code sent to your email! Please check your inbox.');
      setTimeout(() => {
        setCurrentStep(2);
        setSuccess('');
      }, 2000);
    } catch (error) {
      console.error('❌ Send code error:', error);
      setError(error.response?.data?.message || 'Failed to send reset code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ✅ Step 2: Verify Reset Code - FIXED
  const handleVerifyCode = async (e) => {
    e.preventDefault();
    if (!code.trim() || code.length !== 6) {
      setError('Please enter the 6-digit code from your email');
      return;
    }

    if (!resetToken) {
      setError('Reset session expired. Please start over.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // ✅ FIXED: Send all required parameters including resetToken
      const requestData = {
        email: email.trim(),
        code: code.trim(),
        resetToken: resetToken
      };
      
      console.log('🔄 Verifying code with data:', { 
        email: requestData.email, 
        code: requestData.code, 
        resetToken: requestData.resetToken.substring(0, 8) + '...' 
      });
      
      await apiHelpers.verifyResetCode(requestData.email, requestData.code, requestData.resetToken);
      setSuccess('Code verified successfully!');
      setTimeout(() => {
        setCurrentStep(3);
        setSuccess('');
      }, 1500);
    } catch (error) {
      console.error('❌ Verify code error:', error);
      setError(error.response?.data?.message || 'Invalid or expired code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ✅ Step 3: Reset Password - FIXED
  const handleResetPassword = async (e) => {
    e.preventDefault();
    
    if (!newPassword || newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!resetToken) {
      setError('Reset session expired. Please start over.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // ✅ FIXED: Send correct parameters (email, newPassword, resetToken)
      const requestData = {
        email: email.trim(),
        newPassword: newPassword,
        resetToken: resetToken
      };
      
      console.log('🔄 Resetting password with data:', { 
        email: requestData.email, 
        resetToken: requestData.resetToken.substring(0, 8) + '...' 
      });
      
      await apiHelpers.resetPassword(requestData.email, requestData.newPassword, requestData.resetToken);
      setSuccess('Password reset successful! Redirecting to login...');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (error) {
      console.error('❌ Reset password error:', error);
      setError(error.response?.data?.message || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ✅ Email validation helper
  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // ✅ Get step title and description
  const getStepInfo = () => {
    switch (currentStep) {
      case 1:
        return {
          title: 'Reset Password',
          description: "Don't worry! Enter your email and we'll send you a reset code."
        };
      case 2:
        return {
          title: 'Verify Email',
          description: 'Enter the 6-digit code we sent to your email.'
        };
      case 3:
        return {
          title: 'New Password',
          description: 'Choose a strong password for your account.'
        };
      default:
        return { title: '', description: '' };
    }
  };

  const stepInfo = getStepInfo();

  // ✅ Render Current Step Content
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <form onSubmit={handleSendCode} className="auth-form">
            <div className="form-group">
              <input
                type="email"
                className={`form-control ${error && !email ? 'error' : ''}`}
                placeholder="Email Address"
                value={email}
                onChange={handleInputChange(setEmail)}
                disabled={loading}
                required
                autoComplete="email"
              />
            </div>

            <button type="submit" className="btn-auth primary" disabled={loading}>
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Sending Code...
                </>
              ) : (
                <>
                  <FaEnvelope />
                  Send Reset Code
                </>
              )}
            </button>
          </form>
        );

      case 2:
        return (
          <form onSubmit={handleVerifyCode} className="auth-form">
            <div className="form-group">
              <input
                type="text"
                className={`form-control code-input ${error && code.length !== 6 ? 'error' : ''}`}
                placeholder="Enter 6-digit code"
                value={code}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  if (value.length <= 6) {
                    setCode(value);
                    if (error) setError('');
                  }
                }}
                disabled={loading}
                required
                maxLength={6}
                style={{ textAlign: 'center', fontSize: '1.2rem', letterSpacing: '0.2rem' }}
              />
              <small className="form-helper">
                Code sent to <strong>{email}</strong>
              </small>
            </div>

            <button 
              type="submit" 
              className="btn-auth primary" 
              disabled={loading || code.length !== 6}
            >
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Verifying...
                </>
              ) : (
                <>
                  <FaCheckCircle />
                  Verify Code
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="btn-auth secondary"
            >
              <FaArrowLeft />
              Back to Email
            </button>
          </form>
        );

      case 3:
        return (
          <form onSubmit={handleResetPassword} className="auth-form">
            <div className="form-group password-group">
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  className={`form-control password-input ${error && !newPassword ? 'error' : ''}`}
                  placeholder="New Password"
                  value={newPassword}
                  onChange={handleInputChange(setNewPassword)}
                  disabled={loading}
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>

            <div className="form-group password-group">
              <div className="password-input-wrapper">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  className={`form-control password-input ${error && newPassword !== confirmPassword ? 'error' : ''}`}
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={handleInputChange(setConfirmPassword)}
                  disabled={loading}
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={loading}
                >
                  {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn-auth primary" disabled={loading}>
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Resetting Password...
                </>
              ) : (
                <>
                  <FaKey />
                  Reset Password
                </>
              )}
            </button>
          </form>
        );

      default:
        return null;
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="logo-placeholder">
            <img src={logo} alt="Sampark Work" className="auth-logo" />
          </div>
          <h2>{stepInfo.title}</h2>
          <p>{stepInfo.description}</p>
        </div>

        {/* ✅ Beautiful Progress Steps */}
        <div className="progress-steps">
          <div className="steps-container">
            {[1, 2, 3].map((step) => (
              <React.Fragment key={step}>
                <div className={`step ${
                  step < currentStep 
                    ? 'completed' 
                    : step === currentStep 
                    ? 'active' 
                    : 'pending'
                }`}>
                  {step < currentStep ? (
                    <FaCheckCircle className="step-icon" />
                  ) : (
                    <span className="step-number">{step}</span>
                  )}
                </div>
                {step < 3 && <div className={`step-line ${step < currentStep ? 'completed' : ''}`} />}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Error Message */}
        {error && <div className="error-message">{error}</div>}

        {/* Success Message */}
        {success && <div className="success-message">{success}</div>}

        {/* Current Step Content */}
        {renderStepContent()}

        {/* Back to Login */}
        <div className="auth-footer">
          Remember your password? <Link to="/login">Sign In</Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
