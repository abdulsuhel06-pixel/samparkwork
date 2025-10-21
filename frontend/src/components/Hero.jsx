import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './Hero.css';

// Import banner images from assets
import desktopBannerImage from '../assets/hero-banner-desktop.png';
import mobileBannerImage from '../assets/hero-banner-mobile.png';

// Enhanced device detection hook
const useDeviceDetection = () => {
  const [device, setDevice] = useState('desktop');
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width <= 768) {
        setDevice('mobile');
      } else if (width <= 1024) {
        setDevice('tablet');
      } else {
        setDevice('desktop');
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return device;
};

const Hero = () => {
  const device = useDeviceDetection();

  // Device-specific banner selection
  const getBannerImage = () => {
    return device === 'mobile' ? mobileBannerImage : desktopBannerImage;
  };

  return (
    <section className={`modern-hero-section ${device}-hero`}>
      {/* Background with Device Optimization */}
      <div className="hero-background-container">
        <img 
          src={getBannerImage()} 
          alt="Professional jewellery and textile craftspeople at work" 
          className="hero-background-image"
          loading="eager"
        />
        <div className="hero-background-overlay"></div>
      </div>

      <div className="hero-content-wrapper">
        <div className="hero-content-container">
          
          {/* Hero Headlines */}
          <header className="hero-header">
            <h1 className="hero-main-title">
              {device === 'mobile' ? (
                <>
                  Find Skilled <span className="title-accent">Jewellery & Textile</span> Professionals & Discover Jobs
                </>
              ) : (
                <>
                  Find Skilled <span className="title-accent">Jewellery & Textile</span>
                  <br />
                  Professionals & Discover Jobs
                </>
              )}
            </h1>
            <p className="hero-description">
              {device === 'mobile'
                ? "Connecting companies with talented professionals worldwide. Your perfect opportunity awaits."
                : "Connecting companies with talented jewellery and textile professionals worldwide. Your next opportunity or perfect hire is just a click away."
              }
            </p>
          </header>

          {/* Call-to-Action */}
          <div className="hero-actions">
            <Link to="/find-jobs" className="primary-cta">
              <span className="cta-icon">💼</span>
              <span>Find Jobs</span>
            </Link>
            <div className="secondary-actions">
              <Link to="/find-talents" className="secondary-link">Hire Talent</Link>
              <span className="divider">•</span>
              <Link to="/signup" className="secondary-link">Get Started Free</Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
