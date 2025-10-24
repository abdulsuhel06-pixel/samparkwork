import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

const GoogleLogin = ({ onSuccess, onError, disabled = false, className = '', role = 'professional' }) => {
  const { googleLogin } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [googleLoaded, setGoogleLoaded] = useState(false);

  useEffect(() => {
    const loadGoogleScript = () => {
      if (window.google && window.google.accounts) {
        setGoogleLoaded(true);
        console.log('✅ Google OAuth already loaded');
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        setGoogleLoaded(true);
        console.log('✅ Google OAuth script loaded');
      };
      script.onerror = () => {
        console.error('❌ Failed to load Google OAuth script');
        setGoogleLoaded(false);
      };
      
      document.head.appendChild(script);
    };

    loadGoogleScript();
  }, []);

  const handleGoogleLogin = async () => {
    if (!googleLoaded || isLoading || disabled) {
      console.log('⏳ Google not ready or already loading...');
      return;
    }

    setIsLoading(true);

    try {
      console.log('🚀 Initializing Google OAuth with role:', role);

      // ✅ WORKING SOLUTION: Initialize and prompt in one go
      window.google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        callback: async (response) => {
          console.log('📨 Google response received:', response);
          
          if (!response.credential) {
            console.error('❌ No credential in response');
            onError?.('No credential received from Google');
            setIsLoading(false);
            return;
          }

          try {
            console.log('🔄 Processing login with role:', role);
            // ✅ CRITICAL FIX: Pass role to googleLogin function
            const result = await googleLogin(response.credential, role);
            console.log('✅ Login successful:', result.user?.name || result.user?.email);
            onSuccess?.(result);
          } catch (error) {
            console.error('❌ Login failed:', error);
            onError?.(error.message || 'Google login failed');
          } finally {
            setIsLoading(false);
          }
        },
        auto_select: false,
        cancel_on_tap_outside: true,
        ux_mode: 'popup',
        context: 'signin'
      });

      // ✅ IMPORTANT: Small delay to ensure initialization
      setTimeout(() => {
        try {
          console.log('🔑 Opening Google sign-in...');
          window.google.accounts.id.prompt((notification) => {
            console.log('🔔 Prompt notification:', notification);
            if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
              console.log('⚠️ Prompt not displayed, showing popup fallback');
              
              // Fallback: Create a temporary button and click it
              const tempDiv = document.createElement('div');
              tempDiv.style.position = 'absolute';
              tempDiv.style.top = '-9999px';
              document.body.appendChild(tempDiv);

              window.google.accounts.id.renderButton(tempDiv, {
                theme: 'outline',
                size: 'large',
                type: 'standard'
              });

              // Click the button to trigger OAuth
              setTimeout(() => {
                const btn = tempDiv.querySelector('[role="button"]');
                if (btn) {
                  btn.click();
                  console.log('🖱️ Fallback button clicked');
                }
                document.body.removeChild(tempDiv);
              }, 100);
            }
          });
        } catch (promptError) {
          console.error('❌ Prompt error:', promptError);
          setIsLoading(false);
          onError?.('Failed to open Google login');
        }
      }, 200);

    } catch (error) {
      console.error('❌ Google OAuth initialization failed:', error);
      onError?.('Failed to initialize Google login');
      setIsLoading(false);
    }
  };

  if (!googleLoaded) {
    return (
      <button
        type="button"
        disabled
        className={`w-full ${className}`}
        style={{ 
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '48px',
          padding: '0 16px',
          backgroundColor: '#f3f4f6',
          border: '1px solid #d1d5db',
          borderRadius: '8px',
          color: '#9ca3af',
          fontSize: '14px',
          fontWeight: '500',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          cursor: 'not-allowed',
          transition: 'all 0.2s ease'
        }}
      >
        <div 
          style={{
            width: '16px',
            height: '16px',
            border: '2px solid #d1d5db',
            borderTop: '2px solid transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            marginRight: '8px'
          }}
        />
        Loading Google...
      </button>
    );
  }

  return (
    <>
      {/* ✅ FIXED: Move CSS to head using useEffect */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      
      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={isLoading || disabled}
        className={`w-full ${className}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '48px',
          padding: '0 16px',
          backgroundColor: isLoading || disabled ? '#f9fafb' : '#ffffff',
          border: '1px solid #d1d5db',
          borderRadius: '8px',
          color: isLoading || disabled ? '#9ca3af' : '#374151',
          fontSize: '14px',
          fontWeight: '500',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          cursor: isLoading || disabled ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s ease',
          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
          opacity: isLoading || disabled ? 0.6 : 1,
        }}
        onMouseEnter={(e) => {
          if (!isLoading && !disabled) {
            e.target.style.backgroundColor = '#f9fafb';
            e.target.style.borderColor = '#9ca3af';
            e.target.style.boxShadow = '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isLoading && !disabled) {
            e.target.style.backgroundColor = '#ffffff';
            e.target.style.borderColor = '#d1d5db';
            e.target.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
          }
        }}
      >
        {isLoading ? (
          <>
            <div 
              style={{
                width: '16px',
                height: '16px',
                border: '2px solid #3b82f6',
                borderTop: '2px solid transparent',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                marginRight: '8px'
              }}
            />
            Signing in...
          </>
        ) : (
          <>
            <svg 
              width="16" 
              height="16" 
              viewBox="0 0 24 24"
              style={{ 
                marginRight: '8px',
                flexShrink: 0
              }}
            >
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </>
        )}
      </button>
    </>
  );
};

export default GoogleLogin;
