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
          
          {/* Hero Headlines - Only Title, No Subtitle */}
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
          </header>

          {/* Call-to-Action - Only Get Started Free Button */}
          <div className="hero-actions">
            <Link to="/signup" className="primary-cta">
              <span className="cta-icon"></span>
              <span>Get Started Free</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
