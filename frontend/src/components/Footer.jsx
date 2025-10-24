import React from 'react';
import { FaFacebookF, FaTwitter, FaInstagram, FaLinkedinIn, FaEnvelope, FaPhoneAlt, FaMapMarkerAlt } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import logo from '../assets/logo.png';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="simple-footer">
      <div className="footer-container">
        
        {/* Main Footer Content */}
        <div className="footer-main">
          
          {/* Brand Section */}
          <div className="footer-brand-section">
            <Link to="/" className="footer-brand">
              <img src={logo} alt="Sampark Work" className="footer-logo" />
              <span className="brand-name">Sampark Work</span>
            </Link>
            <p className="footer-tagline">
              Connect with top talent and bring your projects to life. Your trusted platform for jewellery and textile professionals.
            </p>
          </div>

          {/* Links Section - Quick Links and Support in One Row on Mobile */}
          <div className="footer-links-section">
            <div className="footer-column">
              <h5>Quick Links</h5>
              <ul>
                <li><Link to="/find-jobs">Find Jobs</Link></li>
                <li><Link to="/find-talents">Find Talents</Link></li>
                <li><Link to="/categories">Categories</Link></li>
                <li><Link to="/about">About Us</Link></li>
              </ul>
            </div>

            <div className="footer-column">
              <h5>Support</h5>
              <ul>
                <li><Link to="/help">Help Center</Link></li>
                <li><Link to="/contact">Contact Us</Link></li>
                <li><Link to="/trust-safety">Trust & Safety</Link></li>
                <li><Link to="/community">Community</Link></li>
              </ul>
            </div>
          </div>

          {/* Contact Info */}
          <div className="footer-contact-section">
            <div className="contact-info">
              <div className="contact-item">
                <FaEnvelope className="contact-icon" />
                <a href="mailto:skillconnect@gmail.com">skillconnect@gmail.com</a>
              </div>
              <div className="contact-item">
                <FaPhoneAlt className="contact-icon" />
                <a href="tel:+919883359285">+91 9883359285</a>
              </div>
            </div>

            <div className="social-links">
              <a href="#" aria-label="Facebook" rel="noopener noreferrer">
                <FaFacebookF />
              </a>
              <a href="#" aria-label="Twitter" rel="noopener noreferrer">
                <FaTwitter />
              </a>
              <a href="#" aria-label="Instagram" rel="noopener noreferrer">
                <FaInstagram />
              </a>
              <a href="#" aria-label="LinkedIn" rel="noopener noreferrer">
                <FaLinkedinIn />
              </a>
            </div>
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="footer-bottom">
          <div className="copyright">
            © 2024 Sampark Work. All rights reserved.
          </div>
          <div className="legal-links">
            <Link to="/privacy">Privacy Policy</Link>
            <Link to="/terms">Terms of Service</Link>
            <Link to="/cookies">Cookie Policy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
