import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Play, AlertCircle } from 'lucide-react';
import api, { getMediaUrl, getNetworkInfo } from '../services/api';
import './AdvertisementShowcase.css';

// ✅ MOBILE COMPATIBLE VIDEO PLAYER with comprehensive error handling
const VideoPlayer = React.memo(({ src, poster, title }) => {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (videoRef.current && src && !error) {
      setIsLoading(true);
      setError(false);
      
      const video = videoRef.current;
      
      const handleCanPlay = () => {
        setIsLoading(false);
        console.log('✅ Video ready to play:', src);
        
        // ✅ MOBILE COMPATIBLE: Enhanced autoplay handling
        const playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              setIsPlaying(true);
              console.log('✅ Video autoplay successful');
            })
            .catch(error => {
              console.warn('⚠️ Video autoplay blocked by browser policy (normal on mobile)');
              setIsPlaying(false);
            });
        }
      };

      const handleError = (e) => {
        console.error('❌ Video failed to load:', src);
        console.error('❌ Video error details:', {
          error: e.target.error,
          networkState: e.target.networkState,
          readyState: e.target.readyState,
          src: src,
          networkInfo: getNetworkInfo()
        });
        setError(true);
        setIsLoading(false);
      };

      const handleLoadStart = () => {
        console.log('🎥 Video loading started:', src);
        setIsLoading(true);
        setError(false);
      };

      const handleLoadedData = () => {
        console.log('📊 Video data loaded:', src);
      };

      video.addEventListener('canplay', handleCanPlay);
      video.addEventListener('error', handleError);
      video.addEventListener('loadstart', handleLoadStart);
      video.addEventListener('loadeddata', handleLoadedData);
      
      return () => {
        video.removeEventListener('canplay', handleCanPlay);
        video.removeEventListener('error', handleError);
        video.removeEventListener('loadstart', handleLoadStart);
        video.removeEventListener('loadeddata', handleLoadedData);
      };
    }
  }, [src, error]);

  const handlePlayClick = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.play()
        .then(() => {
          setIsPlaying(true);
          console.log('✅ Manual video play successful');
        })
        .catch(err => {
          console.error('❌ Manual video play failed:', err);
          setError(true);
        });
    }
  }, []);

  if (error) {
    return (
      <div className="video-error">
        <AlertCircle size={48} className="error-icon" />
        <p>Video unavailable</p>
        <small>Failed to load: {title}</small>
        <small>Network: {getNetworkInfo().isMobile ? 'Mobile' : 'Desktop'}</small>
        <small>URL: {src}</small>
      </div>
    );
  }

  return (
    <div className="video-container">
      {isLoading && (
        <div className="video-loading">
          <div className="loading-spinner"></div>
          <p>Loading video...</p>
        </div>
      )}
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        muted
        loop
        playsInline  // ✅ CRITICAL for mobile compatibility
        controls
        preload="metadata"  // ✅ MOBILE OPTIMIZED: Faster loading
        className="ad-video"
        style={{ display: isLoading ? 'none' : 'block' }}
        onLoadStart={() => console.log('🎥 Video element loading:', src)}
        onCanPlay={() => console.log('✅ Video element can play:', src)}
        onError={(e) => {
          console.error('❌ Video element error:', e);
          console.error('❌ Video src causing error:', src);
        }}
      />
      {!isPlaying && !isLoading && (
        <div className="video-overlay" onClick={handlePlayClick}>
          <div className="play-button">
            <Play size={24} />
          </div>
          <span className="play-text">Tap to play</span>
        </div>
      )}
    </div>
  );
});

VideoPlayer.displayName = 'VideoPlayer';

const AdvertisementShowcase = () => {
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const intervalRef = useRef(null);

  // ✅ OPTIMIZATION: Memoize the fetchAds function
  const fetchAds = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🎬 Fetching advertisements from API...', getNetworkInfo());
      
      const response = await api.get('/api/advertisements', {
        params: {
          placement: 'homepage',
          isActive: 'true'
        }
      });
      
      console.log('📊 Advertisement API Response:', {
        status: response.status,
        dataType: typeof response.data,
        isArray: Array.isArray(response.data),
        count: Array.isArray(response.data) ? response.data.length : 'N/A'
      });
      
      let adsData = [];
      if (Array.isArray(response.data)) {
        adsData = response.data;
      } else if (response.data.success) {
        adsData = response.data.advertisements || response.data.data || [];
      } else {
        adsData = response.data.advertisements || response.data.data || [];
      }

      // ✅ CRITICAL FIX: Process media URLs with enhanced debugging
      console.log('🔍 Processing advertisements for HTTPS compatibility:');
      adsData = adsData.map((ad, index) => {
        // ✅ FIXED: Use getMediaUrl helper for HTTPS compatibility
        const processedAd = {
          ...ad,
          mediaUrl: getMediaUrl(ad.mediaUrl),
          poster: ad.poster ? getMediaUrl(ad.poster) : null
        };
        
        console.log(`  🎬 Advertisement #${index + 1}: "${ad.title}"`);
        console.log(`     Type: ${ad.mediaType}`);
        console.log(`     Original URL: ${ad.mediaUrl}`);
        console.log(`     Processed URL: ${processedAd.mediaUrl}`);
        console.log(`     HTTPS Check: ${processedAd.mediaUrl?.startsWith('https://') ? '✅' : '❌'}`);
        console.log(`     Network: ${getNetworkInfo().isMobile ? 'Mobile' : 'Desktop'}`);
        
        return processedAd;
      });

      setAds(adsData);
      console.log(`✅ Successfully loaded ${adsData.length} advertisements with HTTPS URLs`);
      
    } catch (error) {
      console.error('❌ Failed to fetch advertisements:', error);
      
      let errorMessage = "Failed to load advertisements.";
      
      if (error.response?.status === 404) {
        errorMessage = "No advertisements found.";
      } else if (error.response?.status >= 500) {
        errorMessage = "Server error. Please try again later.";
      } else if (error.code === 'NETWORK_ERROR' || !error.response) {
        errorMessage = "Network error. Please check your connection.";
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      setError(errorMessage);
      setAds([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAds();
  }, [fetchAds]);

  // ✅ OPTIMIZATION: Better interval management
  useEffect(() => {
    if (ads.length > 1) {
      const startInterval = () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        intervalRef.current = setInterval(() => {
          setCurrentSlide((prev) => (prev + 1) % ads.length);
        }, 10000); // 10 seconds per slide
      };

      startInterval();

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    }
  }, [ads.length]);

  // ✅ OPTIMIZATION: Memoize handlers
  const handleAdClick = useCallback(async (ad) => {
    try {
      // Track click
      await api.post(`/api/advertisements/${ad._id}/click`);
      console.log('✅ Ad click tracked:', ad.title);
      
      // Open link if exists
      if (ad.link) {
        window.open(ad.link, '_blank', 'noopener,noreferrer');
      }
    } catch (error) {
      console.error('❌ Error tracking ad click:', error);
      // Still open link even if tracking fails
      if (ad.link) {
        window.open(ad.link, '_blank', 'noopener,noreferrer');
      }
    }
  }, []);

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % ads.length);
  }, [ads.length]);

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + ads.length) % ads.length);
  }, [ads.length]);

  const goToSlide = useCallback((index) => {
    setCurrentSlide(index);
  }, []);

  // Loading state
  if (loading) {
    return (
      <section className="advertisement-showcase">
        <div className="container">
          <div className="showcase-header">
            <h2 className="showcase-title">Advertisements</h2>
          </div>
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p className="loading-text">Loading advertisements...</p>
            <small className="network-info">
              {getNetworkInfo().isMobile ? '📱 Mobile Network' : '💻 Desktop'}
            </small>
          </div>
        </div>
      </section>
    );
  }

  // Error state
  if (error) {
    return (
      <section className="advertisement-showcase">
        <div className="container">
          <div className="showcase-header">
            <h2 className="showcase-title">Advertisements</h2>
          </div>
          <div className="error-container">
            <AlertCircle size={48} className="error-icon" />
            <h3>Unable to Load Advertisements</h3>
            <p>{error}</p>
            <small className="network-info">
              Network: {getNetworkInfo().isMobile ? '📱 Mobile' : '💻 Desktop'} | 
              IP: {getNetworkInfo().hostname}
            </small>
            <button className="retry-button" onClick={fetchAds}>
              Try Again
            </button>
          </div>
        </div>
      </section>
    );
  }

  // No ads state 
  if (ads.length === 0) {
    return null;
  }

  const currentAd = ads[currentSlide];

  return (
    <section className="advertisement-showcase">
      <div className="container">
        <div className="showcase-header">
          <h2 className="showcase-title">Watch how to Signup and update your Profile</h2>
        </div>

        <div className="carousel-wrapper">
          <div className="carousel-container">
            {/* Navigation arrows */}
            {ads.length > 1 && (
              <>
                <button 
                  className="carousel-btn prev-btn" 
                  onClick={prevSlide}
                  aria-label="Previous advertisement"
                >
                  <ChevronLeft size={20} />
                </button>
                
                <button 
                  className="carousel-btn next-btn" 
                  onClick={nextSlide}
                  aria-label="Next advertisement"
                >
                  <ChevronRight size={20} />
                </button>
              </>
            )}

            {/* Advertisement display */}
            <div 
              className={`ad-display ${currentAd.link ? 'clickable' : ''}`}
              onClick={() => currentAd.link && handleAdClick(currentAd)}
            >
              <div className="ad-media">
                {currentAd.mediaType === 'video' ? (
                  <VideoPlayer 
                    key={`${currentAd._id}-${currentSlide}`} // Force re-render on slide change
                    src={currentAd.mediaUrl} 
                    poster={currentAd.poster}
                    title={currentAd.title}
                  />
                ) : (
                  <div className="image-container">
                    <img 
                      src={currentAd.mediaUrl} 
                      alt={currentAd.title || 'Advertisement'}
                      className="ad-image"
                      loading="lazy"
                      onLoad={() => console.log('✅ Ad image loaded successfully:', currentAd.title, currentAd.mediaUrl)}
                      onError={(e) => {
                        console.error('❌ Ad image failed to load:', currentAd.title);
                        console.error('❌ Failed URL:', currentAd.mediaUrl);
                        console.error('❌ Network info:', getNetworkInfo());
                        e.target.style.display = 'none';
                        const placeholder = e.target.parentNode.querySelector('.image-placeholder');
                        if (placeholder) placeholder.style.display = 'flex';
                      }}
                    />
                    <div className="image-placeholder" style={{ display: 'none' }}>
                      <AlertCircle size={48} />
                      <span>Image unavailable</span>
                      <small>{currentAd.mediaUrl}</small>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Content overlay */}
              <div className="ad-overlay">
                <div className="ad-content">
                  <h3 className="ad-title">{currentAd.title}</h3>
                  <p className="ad-description">{currentAd.content}</p>
                  {currentAd.link && (
                    <button 
                      className="ad-cta"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAdClick(currentAd);
                      }}
                    >
                      Learn More →
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Slide indicators */}
          {ads.length > 1 && (
            <div className="carousel-indicators">
              {ads.map((_, index) => (
                <button
                  key={index}
                  className={`indicator ${index === currentSlide ? 'active' : ''}`}
                  onClick={() => goToSlide(index)}
                  aria-label={`Go to advertisement ${index + 1}`}
                />
              ))}
            </div>
          )}

          {/* Progress bar */}
          {ads.length > 1 && (
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ 
                  width: `${((currentSlide + 1) / ads.length) * 100}%` 
                }}
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default AdvertisementShowcase;
