import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Gem, 
  Scissors,
  Mail,
  ArrowRight,
  Target,
  Eye,
  Heart,
  Users
} from 'lucide-react';
import './About.css';

const About = () => {
  const navigate = useNavigate();

  const team = [
    {
      name: 'Sk Rajab Ali',
      role: 'Founder & CEO',
      bio: 'Visionary entrepreneur passionate about connecting traditional craftsmanship with modern technology.'
    },
    {
      name: 'Abdul Suhel',
      role: 'Software Engineer & CTO',
      bio: 'Tech innovator building scalable solutions for the artisan community.'
    }
  ];

  // ✅ Navigation handlers
  const handleGetStarted = () => {
    navigate('/register');
  };

  const handleJoinNow = () => {
    navigate('/register');
  };

  return (
    <div className="about-page">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="container">
          <div className="hero-content">
            <div className="hero-badge">
             
            </div>
            <h1 className="hero-title">
              Connecting Skilled Professionals with Opportunities
            </h1>
            
            <button className="cta-button" onClick={handleGetStarted}>
              Get Started
              <ArrowRight size={16} />
            </button>
          </div>
          
          <div className="hero-visual">
            
             
            
          </div>
        </div>
      </section>

      {/* Our Story */}
      <section className="story-section">
        <div className="container">
          <div className="section-header">
            <h2>Our Story</h2>
            <p>Bridging traditional craftsmanship with modern opportunities</p>
          </div>
          
          <div className="story-content">
            <div className="story-text">
              <h3>Building a Better Future for Artisans</h3>
              <p>
                We created this platform to help skilled professionals in the jewellery 
                and textile industries find meaningful work opportunities. Our mission is 
                to connect talented artisans with clients who value quality craftsmanship.
              </p>
              <p>
                Through technology, we're making it easier for professionals to showcase 
                their skills, build their careers, and grow their businesses while 
                preserving the rich heritage of Indian craftsmanship.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Mission Vision Values */}
      <section className="values-section">
        <div className="container">
          <div className="values-grid">
            <div className="value-card">
              <div className="value-icon">
                <Target size={24} />
              </div>
              <h3>Our Mission</h3>
              <p>
                To empower skilled artisans by connecting them with opportunities 
                that match their expertise and passion.
              </p>
            </div>

            <div className="value-card">
              <div className="value-icon">
                <Eye size={24} />
              </div>
              <h3>Our Vision</h3>
              <p>
                To become the leading platform for artisan services, preserving 
                traditional craftsmanship for future generations.
              </p>
            </div>

            <div className="value-card">
              <div className="value-icon">
                <Heart size={24} />
              </div>
              <h3>Our Values</h3>
              <p>
                Trust, quality, innovation, and community are at the heart 
                of everything we do.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="team-section">
        <div className="container">
          <div className="section-header">
            <h2>Meet Our Team</h2>
            <p>The people behind the platform</p>
          </div>

          <div className="team-grid">
            {team.map((member, index) => (
              <div key={index} className="team-card">
                <div className="member-avatar">
                  <Users size={40} />
                </div>
                <div className="member-info">
                  <h3>{member.name}</h3>
                  <p className="member-role">{member.role}</p>
                  <p className="member-bio">{member.bio}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="contact-section">
        <div className="container">
          <div className="contact-content">
            <h2>Ready to Get Started?</h2>
            <p>
              Join our community of skilled professionals and discover new opportunities.
            </p>
            <div className="contact-actions">
              <button className="cta-button primary" onClick={handleJoinNow}>
                Join Now
                <ArrowRight size={16} />
              </button>
              <a href="samparkconnect08@gmail.com" className="contact-link">
                <Mail size={16} />
                Get in Touch
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;
