import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Play, Pause, Volume2, VolumeX, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
import { apiHelpers } from '../services/api';
import { useAuth } from '../context/AuthContext';
import './PopupAdvertisement.css';

const PopupAdvertisement = () => {
  // ✅ CORE STATE
  const [isVisible, setIsVisible] = useState(false);
  const [currentAd, setCurrentAd] = useState(null);
  const [allPopupAds, setAllPopupAds] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  
  // ✅ SMART DIMENSION DETECTION STATE
  const [mediaDimensions, setMediaDimensions] = useState(null);
  const [containerType, setContainerType] = useState('default');
  const [aspectRatio, setAspectRatio] = useState(null);
  
  // ✅ AUTO-CLOSE TIMER STATE
  const [timeRemaining, setTimeRemaining] = useState(15);
  const [showTimer, setShowTimer] = useState(false);
  
  // ✅ NEW: CLOSE STATE CONTROL
  const [isClosing, setIsClosing] = useState(false);
  
  // ✅ VIDEO STATE
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [videoProgress, setVideoProgress] = useState(0);
  
  // ✅ REFS
  const videoRef = useRef(null);
  const timeoutRef = useRef(null);
  const closeBtnRef = useRef(null);
  const progressIntervalRef = useRef(null);
  const imageRef = useRef(null);
  const autoCloseTimerRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  
  // ✅ CONTROL REFS
  const { user, loading: authLoading } = useAuth();
  const hasInitialized = useRef(false);
  const impressionTracked = useRef(new Set());
  const lastUserState = useRef(null);
  const isProcessingImpression = useRef(false);
  const hasFetchedAds = useRef(false);
  
  // ✅ INSTANT 1-SECOND POPUP DELAYS
  const POPUP_DELAYS = {
    NEW_VISITOR: 1000,
    RETURNING_VISITOR: 1000,
    NEW_LOGIN: 1000,
    EXISTING_USER: 1000
  };

  // ✅ ENHANCED: Multiple URL strategies for better image loading
  const getImageUrls = useCallback((ad) => {
    if (!ad?.mediaUrl) return [];
    
    const originalUrl = ad.mediaUrl;
    const urls = [];
    
    // Strategy 1: If already complete URL, use as-is
    if (originalUrl.startsWith('http://') || originalUrl.startsWith('https://')) {
      urls.push(originalUrl);
    }
    
    // Strategy 2: Environment-based construction
    const isLocalhost = window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1';
    
    const baseUrl = isLocalhost 
      ? 'http://localhost:5000'
      : 'https://samparkwork-backend.onrender.com';
    
    // Multiple path variations
    const pathVariations = [];
    
    // Clean the original URL
    let cleanPath = originalUrl;
    if (cleanPath.startsWith('/')) cleanPath = cleanPath.substring(1);
    
    // Different path constructions
    pathVariations.push(cleanPath);
    pathVariations.push(`uploads/${cleanPath}`);
    pathVariations.push(cleanPath.replace('uploads/', 'uploads/'));
    pathVariations.push(`uploads/advertisements/images/${cleanPath.split('/').pop()}`);
    
    // Create full URLs for each variation
    pathVariations.forEach(path => {
      if (!urls.includes(`${baseUrl}/${path}`)) {
        urls.push(`${baseUrl}/${path}`);
      }
    });
    
    console.log('🔗 [PopupAd] Generated image URLs:', urls);
    return urls;
  }, []);

  // ✅ ENHANCED: Smart dimension analysis
  const analyzeMediaDimensions = useCallback((width, height, mediaType = 'image') => {
    console.log(`📐 [PopupAd] Analyzing dimensions: ${width}x${height} (${mediaType})`);
    
    if (!width || !height) {
      console.warn('⚠️ [PopupAd] Invalid dimensions');
      return;
    }
    
    const ratio = width / height;
    
    // Determine container type
    let type = 'default';
    
    if (mediaType === 'video') {
      type = 'video';
    } else if (ratio > 1.5) {
      type = 'landscape'; // Wide images
    } else if (ratio < 0.75) {
      type = 'portrait';  // Tall images like your poster
    } else {
      type = 'square';    // Roughly square images
    }
    
    console.log(`🎯 [PopupAd] Container type determined: ${type} (ratio: ${ratio.toFixed(2)})`);
    
    setMediaDimensions({ width, height });
    setAspectRatio(ratio);
    setContainerType(type);
  }, []);

  // ✅ ENHANCED: Try multiple image URLs with dimension detection
  const loadImageWithFallbacks = useCallback((ad) => {
    if (!ad) return;
    
    const imageUrls = getImageUrls(ad);
    if (imageUrls.length === 0) {
      setImageError(true);
      setImageLoading(false);
      return;
    }
    
    console.log(`🖼️ [PopupAd] Attempting to load image (attempt ${retryCount + 1})`);
    
    let currentUrlIndex = 0;
    
    const tryNextUrl = () => {
      if (currentUrlIndex >= imageUrls.length) {
        console.error('❌ [PopupAd] All image URLs failed');
        setImageError(true);
        setImageLoading(false);
        return;
      }
      
      const currentUrl = imageUrls[currentUrlIndex];
      console.log(`🔄 [PopupAd] Trying URL ${currentUrlIndex + 1}/${imageUrls.length}:`, currentUrl);
      
      if (imageRef.current) {
        imageRef.current.src = currentUrl;
      }
      
      currentUrlIndex++;
    };
    
    // Start with first URL
    tryNextUrl();
    
    // Set up error handler to try next URL
    if (imageRef.current) {
      imageRef.current.onload = () => {
        console.log('✅ [PopupAd] Image loaded successfully:', imageRef.current.src);
        
        // ✅ CRITICAL: Analyze dimensions when image loads
        const naturalWidth = imageRef.current.naturalWidth;
        const naturalHeight = imageRef.current.naturalHeight;
        
        console.log(`📏 [PopupAd] Natural dimensions: ${naturalWidth}x${naturalHeight}`);
        
        analyzeMediaDimensions(naturalWidth, naturalHeight, 'image');
        
        setImageError(false);
        setImageLoading(false);
        setRetryCount(0);
      };
      
      imageRef.current.onerror = () => {
        console.warn(`⚠️ [PopupAd] URL ${currentUrlIndex}/${imageUrls.length} failed`);
        setTimeout(tryNextUrl, 100);
      };
    }
  }, [getImageUrls, retryCount, analyzeMediaDimensions]);

  // ✅ VIDEO dimension detection
  const handleVideoLoad = useCallback((video) => {
    if (video && video.videoWidth && video.videoHeight) {
      console.log(`🎥 [PopupAd] Video dimensions: ${video.videoWidth}x${video.videoHeight}`);
      analyzeMediaDimensions(video.videoWidth, video.videoHeight, 'video');
    }
  }, [analyzeMediaDimensions]);

  // ✅ FIXED: SAFE EVENT HANDLING - NO MORE ERRORS
  const safeStopPropagation = (event) => {
    if (!event) return;
    
    try {
      if (typeof event.preventDefault === 'function') {
        event.preventDefault();
      }
      if (typeof event.stopPropagation === 'function') {
        event.stopPropagation();
      }
      // ✅ SAFE CHECK FOR stopImmediatePropagation
      if (typeof event.stopImmediatePropagation === 'function') {
        event.stopImmediatePropagation();
      }
    } catch (error) {
      console.warn('[PopupAd] Event handling error (safely handled):', error);
    }
  };

  // ✅ FIXED: Perfect single-click close with safe event handling
  const closePopup = useCallback((event) => {
    // ✅ CRITICAL: Prevent double execution
    if (isClosing) {
      console.log('🚫 [PopupAd] Already closing, ignoring duplicate call');
      return;
    }
    
    // ✅ SAFE event handling - no more errors
    safeStopPropagation(event);
    
    console.log('🚪 [PopupAd] Closing popup (single-click)');
    setIsClosing(true);
    
    // ✅ Immediate visual feedback
    setIsVisible(false);
    
    // ✅ Reset all states
    setImageError(false);
    setImageLoading(true);
    setRetryCount(0);
    setTimeRemaining(15);
    setShowTimer(false);
    
    // ✅ Reset dimension state
    setMediaDimensions(null);
    setContainerType('default');
    setAspectRatio(null);
    
    const now = Date.now();
    if (user) {
      sessionStorage.setItem('user_popup_shown', 'true');
      sessionStorage.setItem('user_popup_timestamp', now.toString());
    } else {
      sessionStorage.setItem('visitor_popup_shown', 'true');
      sessionStorage.setItem('visitor_popup_timestamp', now.toString());
    }
    
    if (videoRef.current && !videoRef.current.paused) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
    
    // ✅ Clean up all timers
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    if (autoCloseTimerRef.current) {
      clearTimeout(autoCloseTimerRef.current);
    }
    
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }
    
    // ✅ ENHANCED: Clean up after animation
    setTimeout(() => {
      setCurrentAd(null);
      setAllPopupAds([]);
      setCurrentIndex(0);
      setVideoProgress(0);
      setIsClosing(false); // Reset closing state
    }, 300); // Reduced from 500ms for faster cleanup
  }, [user, isClosing]);

  // ✅ FIXED: Handle ad click with safe event management
  const handleAdClick = useCallback(async (event) => {
    if (!currentAd || isClosing) return;
    
    // ✅ SAFE event handling
    safeStopPropagation(event);
    
    console.log('👆 [PopupAd] Ad clicked:', currentAd.title);
    
    try {
      if (apiHelpers?.trackPopupClick) {
        await apiHelpers.trackPopupClick(currentAd._id);
      }
    } catch (error) {
      console.error('❌ [PopupAd] Error tracking click:', error);
    }
    
    if (currentAd.link) {
      try {
        const link = currentAd.link.startsWith('http') 
          ? currentAd.link 
          : `https://${currentAd.link}`;
        
        window.open(link, '_blank', 'noopener,noreferrer');
      } catch (error) {
        console.error('❌ [PopupAd] Error opening link:', error);
      }
    }
    
    // ✅ Close after opening link
    setTimeout(() => closePopup(event), 100);
  }, [currentAd, closePopup, isClosing]);

  // ✅ ENHANCED: Overlay click handler
  const handleOverlayClick = useCallback((event) => {
    // ✅ Only close if clicking directly on overlay (not on content)
    if (event.target === event.currentTarget && !isClosing) {
      closePopup(event);
    }
  }, [closePopup, isClosing]);

  // ✅ IMPRESSION TRACKING
  const trackImpression = useCallback(async (ad) => {
    const adId = ad?._id;
    
    if (!adId || 
        impressionTracked.current.has(adId) || 
        isProcessingImpression.current) {
      return;
    }
    
    try {
      isProcessingImpression.current = true;
      impressionTracked.current.add(adId);
      
      if (apiHelpers?.trackPopupImpression) {
        await apiHelpers.trackPopupImpression(adId);
        console.log('✅ [PopupAd] Impression tracked for:', ad.title);
      }
    } catch (error) {
      console.error('❌ [PopupAd] Error tracking impression:', error);
      impressionTracked.current.delete(adId);
    } finally {
      isProcessingImpression.current = false;
    }
  }, []);

  // ✅ SESSION CHECK
  const shouldShowPopup = useCallback(() => {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    
    if (user) {
      const userShown = sessionStorage.getItem('user_popup_shown');
      const userTimestamp = sessionStorage.getItem('user_popup_timestamp');
      
      if (!userShown) return true;
      
      if (userTimestamp && (now - parseInt(userTimestamp)) > oneHour) {
        sessionStorage.removeItem('user_popup_shown');
        sessionStorage.removeItem('user_popup_timestamp');
        return true;
      }
      
      return false;
    } else {
      const visitorShown = sessionStorage.getItem('visitor_popup_shown');
      const visitorTimestamp = sessionStorage.getItem('visitor_popup_timestamp');
      
      if (!visitorShown) return true;
      
      if (visitorTimestamp && (now - parseInt(visitorTimestamp)) > oneHour) {
        sessionStorage.removeRemoveItem('visitor_popup_shown');
        sessionStorage.removeItem('visitor_popup_timestamp');
        return true;
      }
      
      return false;
    }
  }, [user]);

  // ✅ FETCH AND SHOW POPUP
  const fetchAndShowPopup = useCallback(async () => {
    if (hasFetchedAds.current) return;
    
    try {
      console.log('🎪 [PopupAd] Starting popup fetch process...');
      
      if (!shouldShowPopup()) {
        console.log('🚫 [PopupAd] Popup blocked by session check');
        return;
      }
      
      hasFetchedAds.current = true;
      
      const popupAds = await Promise.race([
        apiHelpers.getPopupAdvertisements(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('API timeout')), 10000)
        )
      ]);
      
      console.log(`📥 [PopupAd] Received ${popupAds?.length || 0} popup ads`);
      
      if (!popupAds || popupAds.length === 0) {
        console.log('⚠️ [PopupAd] No popup ads available');
        return;
      }

      const activeAds = popupAds
        .filter(ad => ad.isActive === true)
        .sort((a, b) => {
          if (a.featured && !b.featured) return -1;
          if (!a.featured && b.featured) return 1;
          return new Date(b.createdAt) - new Date(a.createdAt);
        });
      
      if (activeAds.length === 0) {
        console.log('⚠️ [PopupAd] No active popup ads found');
        return;
      }

      console.log(`✅ [PopupAd] Found ${activeAds.length} active ads`);
      
      setAllPopupAds(activeAds);
      setCurrentIndex(0);
      setCurrentAd(activeAds[0]);
      setImageError(false);
      setImageLoading(true);
      setRetryCount(0);
      setIsClosing(false); // ✅ Reset closing state
      
      // ✅ Reset dimension state for new ad
      setMediaDimensions(null);
      setContainerType('default');
      setAspectRatio(null);
      
      // ✅ All delays now 1 second
      let delay = POPUP_DELAYS.NEW_VISITOR;
      
      if (user) {
        const loginTimestamp = sessionStorage.getItem('fresh_login_timestamp');
        const now = Date.now();
        
        if (loginTimestamp && (now - parseInt(loginTimestamp)) < 30000) {
          delay = POPUP_DELAYS.NEW_LOGIN;
        } else {
          delay = POPUP_DELAYS.EXISTING_USER;
        }
      } else {
        const hasVisited = localStorage.getItem('has_visited_before');
        if (hasVisited) {
          delay = POPUP_DELAYS.RETURNING_VISITOR;
        } else {
          localStorage.setItem('has_visited_before', 'true');
          delay = POPUP_DELAYS.NEW_VISITOR;
        }
      }
      
      console.log(`⏰ [PopupAd] Showing popup in ${delay}ms`);
      
      timeoutRef.current = setTimeout(() => {
        console.log('🎪 [PopupAd] SHOWING POPUP NOW!');
        setIsVisible(true);
        
        // ✅ Load media immediately
        setTimeout(() => {
          if (activeAds[0].mediaType === 'video') {
            setContainerType('video');
          } else {
            loadImageWithFallbacks(activeAds[0]);
          }
        }, 100);
        
        // ✅ Track impression sooner
        setTimeout(() => {
          trackImpression(activeAds[0]);
        }, 500);
      }, delay);
      
    } catch (error) {
      console.error('❌ [PopupAd] Error in popup process:', error);
      hasFetchedAds.current = false;
    }
  }, [shouldShowPopup, trackImpression, user, loadImageWithFallbacks]);

  // ✅ RETRY IMAGE LOADING
  const retryImageLoad = useCallback(() => {
    if (retryCount < 3 && currentAd) {
      console.log(`🔄 [PopupAd] Retrying image load (${retryCount + 1}/3)`);
      setRetryCount(prev => prev + 1);
      setImageError(false);
      setImageLoading(true);
      
      // Reset dimension state for retry
      setMediaDimensions(null);
      setContainerType('default');
      setAspectRatio(null);
      
      setTimeout(() => {
        loadImageWithFallbacks(currentAd);
      }, 500);
    }
  }, [currentAd, loadImageWithFallbacks, retryCount]);

  // ✅ OPTIMIZED: Faster initialization
  useEffect(() => {
    if (authLoading || hasInitialized.current) return;

    console.log('🚀 [PopupAd] INITIALIZING POPUP SYSTEM');
    hasInitialized.current = true;
    lastUserState.current = user;

    const initTimer = setTimeout(fetchAndShowPopup, 500);
    return () => clearTimeout(initTimer);
  }, [authLoading, user, fetchAndShowPopup]);

  // ✅ DETECT FRESH LOGIN
  useEffect(() => {
    if (!authLoading && user && lastUserState.current === null) {
      console.log('🔥 [PopupAd] FRESH LOGIN DETECTED!');
      
      sessionStorage.setItem('fresh_login_timestamp', Date.now().toString());
      hasInitialized.current = false;
      hasFetchedAds.current = false;
      
      sessionStorage.removeItem('user_popup_shown');
      sessionStorage.removeItem('user_popup_timestamp');
    }
    
    if (!authLoading) {
      lastUserState.current = user;
    }
  }, [user, authLoading]);

  // ✅ LOAD MEDIA WHEN AD CHANGES
  useEffect(() => {
    if (currentAd && isVisible) {
      setImageLoading(true);
      setImageError(false);
      setRetryCount(0);
      
      // Reset dimension state
      setMediaDimensions(null);
      setContainerType('default');
      setAspectRatio(null);
      
      if (currentAd.mediaType === 'video') {
        setContainerType('video');
        setImageLoading(false);
      } else {
        loadImageWithFallbacks(currentAd);
      }
    }
  }, [currentAd, isVisible, loadImageWithFallbacks]);

  // ✅ 15-second auto-close with timer
  useEffect(() => {
    if (!isVisible) return;

    console.log('⏰ [PopupAd] Starting 15-second auto-close timer');
    
    // Set initial timer state
    setTimeRemaining(15);
    setShowTimer(false);
    
    // Show timer in last 5 seconds
    const showTimerTimeout = setTimeout(() => {
      setShowTimer(true);
    }, 10000);
    
    // Countdown interval for timer display
    countdownIntervalRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(countdownIntervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    // ✅ 15-second auto-close timer
    autoCloseTimerRef.current = setTimeout(() => {
      console.log('⏰ [PopupAd] Auto-closing after 15 seconds');
      closePopup();
    }, 15000);
    
    return () => {
      clearTimeout(showTimerTimeout);
      clearTimeout(autoCloseTimerRef.current);
      clearInterval(countdownIntervalRef.current);
    };
  }, [isVisible, closePopup]);

  // ✅ KEYBOARD CONTROLS
  useEffect(() => {
    if (!isVisible) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        closePopup(e);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, closePopup]);

  // ✅ CLEANUP
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, []);

  // Don't render if no ad
  if (!currentAd) return null;

  return (
    <div 
      className={`popup-advertisement-overlay ${isVisible ? 'visible' : ''} ${isClosing ? 'closing' : ''}`}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="popup-ad-title"
    >
      <div 
        className={`popup-advertisement-container ${containerType}`}
        onClick={(e) => {
          // ✅ SAFE event management
          safeStopPropagation(e);
        }}
        style={{
          '--aspect-ratio': aspectRatio || 'auto',
          '--media-width': mediaDimensions?.width || 'auto',
          '--media-height': mediaDimensions?.height || 'auto'
        }}
      >
        {/* ✅ FIXED: Close Button with SAFE event handling - NO MORE ERRORS */}
        <button
          ref={closeBtnRef}
          className="popup-close-btn"
          onClick={(e) => {
            console.log('🔴 [PopupAd] Close button clicked!');
            safeStopPropagation(e); // ✅ SAFE - NO MORE ERRORS
            closePopup(e);
          }}
          onMouseDown={(e) => {
            console.log('🔴 [PopupAd] Close button mouseDown!');
            safeStopPropagation(e);
          }}
          aria-label="Close advertisement"
          type="button"
        >
          <X size={20} />
        </button>

        {/* ✅ Auto-close timer (shown in last 5 seconds) */}
        {showTimer && timeRemaining > 0 && (
          <div className="popup-timer-badge">
            Auto-close in {timeRemaining}s
          </div>
        )}

        {/* ✅ FIXED: Main Content with safe event handling */}
        <div 
          className={`popup-ad-content ${currentAd.link ? 'clickable' : ''}`}
          onClick={currentAd.link ? handleAdClick : undefined}
          onMouseDown={(e) => {
            // ✅ Allow click-through but prevent conflicts
            if (!currentAd.link) {
              safeStopPropagation(e);
            }
          }}
        >
          {/* ✅ MEDIA SECTION WITH PERFECT IMAGE DISPLAY */}
          <div className={`popup-ad-media ${containerType}`}>
            {currentAd.mediaType === 'video' ? (
              <div className="popup-video-container">
                <video
                  ref={videoRef}
                  src={getImageUrls(currentAd)[0]}
                  muted={isMuted}
                  loop
                  playsInline
                  className="popup-video"
                  onLoadedMetadata={(e) => {
                    console.log('🎥 [PopupAd] Video metadata loaded');
                    handleVideoLoad(e.target);
                  }}
                  onCanPlay={() => {
                    console.log('🎥 [PopupAd] Video can play');
                    if (!isPlaying) {
                      videoRef.current?.play()
                        .then(() => setIsPlaying(true))
                        .catch(error => console.warn('Video autoplay blocked:', error));
                    }
                  }}
                />
              </div>
            ) : (
              <>
                {/* Loading State */}
                {imageLoading && !imageError && (
                  <div className="popup-image-loading">
                    <div className="loading-gradient">
                      <div className="loading-content">
                        <div className="loading-spinner">
                          <div className="spinner-ring"></div>
                        </div>
                        <div className="loading-text">Loading image...</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ✅ PERFECT: Image with smart object-fit for full display */}
                <img
                  ref={imageRef}
                  alt={currentAd.title}
                  className={`popup-image ${containerType}`}
                  style={{
                    width: '100%',
                    height: '100%',
                    // ✅ CRITICAL: Smart object-fit - contain for portraits, cover for others
                    objectFit: containerType === 'portrait' ? 'contain' : 'cover',
                    objectPosition: 'center',
                    display: (!imageLoading && !imageError) ? 'block' : 'none'
                  }}
                />

                {/* Error State with Retry */}
                {imageError && (
                  <div className="popup-image-error">
                    <div className="error-gradient">
                      <div className="error-content">
                        <div className="error-icon">
                          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                            <line x1="8" y1="21" x2="16" y2="21"/>
                            <line x1="12" y1="17" x2="12" y2="21"/>
                          </svg>
                        </div>
                        <div className="error-title">
                          {currentAd.title}
                        </div>
                        <div className="error-subtitle">
                          Advertisement
                        </div>
                        <div className="error-message">
                          Image not available
                        </div>
                        {retryCount < 3 && (
                          <button 
                            className="retry-btn"
                            onClick={(e) => {
                              safeStopPropagation(e);
                              retryImageLoad();
                            }}
                            onMouseDown={(e) => safeStopPropagation(e)}
                            type="button"
                          >
                            Try Again ({3 - retryCount} left)
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Info Section */}
          <div className="popup-ad-info">
            <h3 id="popup-ad-title" className="popup-ad-title">
              {currentAd.title}
            </h3>
            
            {currentAd.content && (
              <p className="popup-ad-description">
                {currentAd.content}
              </p>
            )}
            
            {currentAd.link && (
              <button 
                className="popup-cta-btn"
                onClick={handleAdClick}
                onMouseDown={(e) => safeStopPropagation(e)}
                type="button"
              >
                <ExternalLink size={16} />
                Learn More
              </button>
            )}
          </div>
        </div>

        {/* Brand Badge */}
        <div className="popup-brand-badge">Ad</div>
      </div>
    </div>
  );
};

export default PopupAdvertisement;
