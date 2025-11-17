import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, AlertCircle, Play, Pause, Volume2, VolumeX, Maximize } from 'lucide-react';
import api, { getMediaUrl, getNetworkInfo } from '../services/api';
import './AdvertisementShowcase.css';

// ✅ CUSTOM VIDEO PLAYER with Admin Dashboard-style controls
const VideoPlayer = React.memo(({ src, poster, title }) => {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [error, setError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && src && !error) {
      setIsLoading(true);
      setError(false);
      
      const video = videoRef.current;
      video.muted = true;
      
      const handleCanPlay = () => {
        setIsLoading(false);
        setDuration(video.duration);
        console.log('✅ Video ready to play:', src);
      };

      const handleError = (e) => {
        console.error('❌ Video failed to load:', src);
        setError(true);
        setIsLoading(false);
      };

      const handleLoadStart = () => {
        console.log('🎥 Video loading started:', src);
        setIsLoading(true);
        setError(false);
      };

      const handleTimeUpdate = () => {
        setCurrentTime(video.currentTime);
        setProgress((video.currentTime / video.duration) * 100 || 0);
      };

      const handleEnded = () => {
        setIsPlaying(false);
        setProgress(0);
        setCurrentTime(0);
      };

      video.addEventListener('canplay', handleCanPlay);
      video.addEventListener('error', handleError);
      video.addEventListener('loadstart', handleLoadStart);
      video.addEventListener('timeupdate', handleTimeUpdate);
      video.addEventListener('ended', handleEnded);
      
      return () => {
        video.removeEventListener('canplay', handleCanPlay);
        video.removeEventListener('error', handleError);
        video.removeEventListener('loadstart', handleLoadStart);
        video.removeEventListener('timeupdate', handleTimeUpdate);
        video.removeEventListener('ended', handleEnded);
      };
    }
  }, [src, error]);

  useEffect(() => {
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    } else {
      setShowControls(true);
    }

    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [isPlaying]);

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  };

  const togglePlayPause = useCallback(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play()
          .then(() => {
            setIsPlaying(true);
            console.log('✅ Video play successful');
          })
          .catch(err => {
            console.error('❌ Video play failed:', err);
            setError(true);
          });
      }
    }
  }, [isPlaying]);

  const toggleMute = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  }, [isMuted]);

  const toggleFullscreen = useCallback(() => {
    if (videoRef.current) {
      if (!document.fullscreenElement) {
        videoRef.current.requestFullscreen().catch(err => {
          console.error('❌ Fullscreen error:', err);
        });
      } else {
        document.exitFullscreen();
      }
    }
  }, []);

  const handleProgressClick = useCallback((e) => {
    if (videoRef.current) {
      const rect = e.currentTarget.getBoundingClientRect();
      const pos = (e.clientX - rect.left) / rect.width;
      const newTime = pos * duration;
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
      setProgress(pos * 100);
    }
  }, [duration]);

  const formatTime = (seconds) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (error) {
    return (
      <div className="video-error">
        <AlertCircle size={48} className="error-icon" />
        <p>Video unavailable</p>
        <small>Failed to load: {title}</small>
      </div>
    );
  }

  return (
    <div 
      className="video-container" 
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
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
        muted={isMuted}
        loop
        playsInline
        preload="metadata"
        className="ad-video"
        style={{ display: isLoading ? 'none' : 'block' }}
        onClick={togglePlayPause}
      />

      {/* ✅ CUSTOM VIDEO CONTROLS */}
      {!isLoading && (
        <div className={`custom-video-controls ${showControls || !isPlaying ? 'visible' : 'hidden'}`}>
          {/* Play/Pause Overlay Button */}
          {!isPlaying && (
            <div className="video-overlay-center" onClick={togglePlayPause}>
              <div className="play-button-large">
                <Play size={48} />
              </div>
            </div>
          )}

          {/* Bottom Control Bar */}
          <div className="video-controls-bar">
            {/* Progress Bar */}
            <div className="video-progress-container" onClick={handleProgressClick}>
              <div className="video-progress-bar">
                <div 
                  className="video-progress-fill" 
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Control Buttons */}
            <div className="video-controls-buttons">
              <div className="controls-left">
                <button 
                  className="control-btn" 
                  onClick={togglePlayPause}
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                </button>

                <button 
                  className="control-btn" 
                  onClick={toggleMute}
                  aria-label={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </button>

                <div className="video-time">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </div>
              </div>

              <div className="controls-right">
                <button 
                  className="control-btn" 
                  onClick={toggleFullscreen}
                  aria-label="Fullscreen"
                >
                  <Maximize size={20} />
                </button>
              </div>
            </div>
          </div>
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
      
      let adsData = [];
      if (Array.isArray(response.data)) {
        adsData = response.data;
      } else if (response.data.success) {
        adsData = response.data.advertisements || response.data.data || [];
      } else {
        adsData = response.data.advertisements || response.data.data || [];
      }

      adsData = adsData.map((ad, index) => {
        const processedAd = {
          ...ad,
          mediaUrl: getMediaUrl(ad.mediaUrl),
          poster: ad.poster ? getMediaUrl(ad.poster) : null
        };
        
        console.log(`🎬 Advertisement #${index + 1}: "${ad.title}" (${ad.mediaType})`);
        return processedAd;
      });

      setAds(adsData);
      console.log(`✅ Successfully loaded ${adsData.length} advertisements`);
      
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

  useEffect(() => {
    if (ads.length > 1) {
      const startInterval = () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        intervalRef.current = setInterval(() => {
          setCurrentSlide((prev) => (prev + 1) % ads.length);
        }, 10000);
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

  const handleAdClick = useCallback(async (ad) => {
    try {
      await api.post(`/api/advertisements/${ad._id}/click`);
      console.log('✅ Ad click tracked:', ad.title);
      
      if (ad.link) {
        window.open(ad.link, '_blank', 'noopener,noreferrer');
      }
    } catch (error) {
      console.error('❌ Error tracking ad click:', error);
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

  if (loading) {
    return (
      <section className="advertisement-showcase">
        <div className="container">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p className="loading-text">Loading advertisements...</p>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="advertisement-showcase">
        <div className="container">
          <div className="error-container">
            <AlertCircle size={48} className="error-icon" />
            <h3>Unable to Load Advertisements</h3>
            <p>{error}</p>
            <button className="retry-button" onClick={fetchAds}>
              Try Again
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (ads.length === 0) {
    return null;
  }

  const currentAd = ads[currentSlide];

  return (
    <section className="advertisement-showcase">
      <div className="container">
        {/* ✅ NEW: CUSTOMIZABLE TITLE SECTION - Displays title from Admin Dashboard */}
        {currentAd.title && (
          <div className="showcase-header">
            <h2 className="showcase-title">{currentAd.title}</h2>
          </div>
        )}
        
        <div className="carousel-wrapper">
          <div className="carousel-container">
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

            <div 
              className={`ad-display ${currentAd.link && currentAd.mediaType !== 'video' ? 'clickable' : ''}`}
              onClick={() => currentAd.link && currentAd.mediaType !== 'video' && handleAdClick(currentAd)}
            >
              <div className="ad-media">
                {currentAd.mediaType === 'video' ? (
                  <VideoPlayer 
                    key={`${currentAd._id}-${currentSlide}`}
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
                    />
                  </div>
                )}
              </div>
              
              {/* ✅ NO OVERLAY on video - title is above, not inside */}
            </div>
          </div>

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
