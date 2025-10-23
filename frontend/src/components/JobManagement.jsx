import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Briefcase, Search, Users, ArrowRight } from 'lucide-react';
import './JobManagement.css';

const JobManagement = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handlePostJob = () => {
    if (user) {
      if (user.role === 'professional') {
        alert('Professionals cannot post jobs. Please create a client account.');
        return;
      }
      navigate('/post-job');
    } else {
      navigate('/login');
    }
  };

  const handleFindJobs = () => {
    navigate('/find-jobs');
  };

  const handleFindProfessionals = () => {
    navigate('/find-talents');
  };

  const jobOptions = [
    {
      id: 'post-jobs',
      icon: <Briefcase size={24} />,
      title: 'Post Jobs',
      description: 'Looking for skilled professionals? Post your job opening and reach thousands of talented jewellery and textile experts worldwide.',
      buttonText: 'Post Job Now',
      buttonClass: 'btn-primary',
      onClick: handlePostJob,
      iconColor: '#3b82f6',
      gradientFrom: '#3b82f6',
      gradientTo: '#1d4ed8'
    },
    {
      id: 'find-jobs',
      icon: <Search size={24} />,
      title: 'Find Jobs',
      description: 'Discover opportunities that match your skills. Browse through hundreds of jewellery and textile job openings from top companies.',
      buttonText: 'Search Jobs',
      buttonClass: 'btn-success',
      onClick: handleFindJobs,
      iconColor: '#22c55e',
      gradientFrom: '#22c55e',
      gradientTo: '#16a34a'
    },
    {
      id: 'find-professionals',
      icon: <Users size={24} />,
      title: 'Find Professionals',
      description: 'Browse our database of skilled professionals and find the perfect match for your jewellery or textile business needs.',
      buttonText: 'Find Professionals',
      buttonClass: 'btn-info',
      onClick: handleFindProfessionals,
      iconColor: '#06b6d4',
      gradientFrom: '#06b6d4',
      gradientTo: '#0891b2'
    }
  ];

  return (
    <section className="job-management-section">
      <div className="container">
        {/* Compact Attractive Header */}
        <div className="attractive-header">
          <h2 className="section-title">Get started your journey with our platform</h2>
        </div>

        {/* Attractive Cards Grid */}
        <div className="cards-grid">
          {jobOptions.map((option) => (
            <div key={option.id} className="job-card attractive-card">
              
              {/* Gradient Background Decoration */}
              <div 
                className="card-gradient-bg"
                style={{
                  background: `linear-gradient(135deg, ${option.gradientFrom}15 0%, ${option.gradientTo}10 100%)`
                }}
              ></div>

              {/* Attractive Icon */}
              <div className="card-icon-wrapper">
                <div 
                  className="card-icon attractive-icon"
                  style={{ 
                    backgroundColor: `${option.iconColor}15`,
                    color: option.iconColor,
                    boxShadow: `0 8px 25px ${option.iconColor}20`
                  }}
                >
                  {option.icon}
                  <div 
                    className="icon-glow"
                    style={{ background: `${option.iconColor}30` }}
                  ></div>
                </div>
              </div>

              {/* Attractive Content */}
              <div className="card-content">
                <h3 className="card-title attractive-title">{option.title}</h3>
                <p className="card-description">{option.description}</p>
                
                {/* Attractive Button */}
                <button 
                  className={`card-button attractive-button ${option.buttonClass}`}
                  onClick={option.onClick}
                  style={{
                    background: `linear-gradient(135deg, ${option.gradientFrom} 0%, ${option.gradientTo} 100%)`,
                    boxShadow: `0 4px 15px ${option.iconColor}25`
                  }}
                >
                  <span className="button-text">{option.buttonText}</span>
                  <div className="button-icon">
                    <ArrowRight size={16} />
                  </div>
                </button>
              </div>

              {/* Subtle Hover Effect Border */}
              <div 
                className="card-hover-border"
                style={{ background: `linear-gradient(135deg, ${option.gradientFrom}, ${option.gradientTo})` }}
              ></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default JobManagement;
