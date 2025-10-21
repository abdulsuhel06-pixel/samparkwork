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
      badge: 'BEST JOBS',
      badgeColor: 'primary',
      icon: <Briefcase size={24} />,
      title: 'Post Jobs',
      description: 'Looking for skilled professionals? Post your job opening and reach thousands of talented jewellery and textile experts worldwide.',
      buttonText: 'Post Job Now',
      buttonClass: 'btn-primary',
      onClick: handlePostJob,
      iconColor: '#3b82f6'
    },
    {
      id: 'find-jobs',
      badge: 'FOR JOB SEEKERS',
      badgeColor: 'success',
      icon: <Search size={24} />,
      title: 'Find Jobs',
      description: 'Discover opportunities that match your skills. Browse through hundreds of jewellery and textile job openings from top companies.',
      buttonText: 'Search Jobs',
      buttonClass: 'btn-success',
      onClick: handleFindJobs,
      iconColor: '#22c55e'
    },
    {
      id: 'find-professionals',
      badge: 'FOR RECRUITERS',
      badgeColor: 'info',
      icon: <Users size={24} />,
      title: 'Find Professionals',
      description: 'Browse our database of skilled professionals and find the perfect match for your jewellery or textile business needs.',
      buttonText: 'Find Professionals',
      buttonClass: 'btn-info',
      onClick: handleFindProfessionals,
      iconColor: '#8b5cf6'
    }
  ];

  return (
    <section className="job-management-section">
      <div className="container">
        {/* Simple Compact Header */}
        <div className="simple-header">
          <p className="simple-text fw-bold text-black">Get started your journey with our platform</p>
        </div>

        {/* Compact Cards Grid */}
        <div className="cards-grid">
          {jobOptions.map((option, index) => (
            <div key={option.id} className="job-card">
              {/* Badge */}
              <div className={`card-badge badge-${option.badgeColor}`}>
                {option.badge}
              </div>

              {/* Icon */}
              <div className="card-icon-wrapper">
                <div 
                  className="card-icon"
                  style={{ 
                    backgroundColor: `${option.iconColor}15`,
                    color: option.iconColor 
                  }}
                >
                  {option.icon}
                </div>
              </div>

              {/* Content */}
              <div className="card-content">
                <h3 className="card-title">{option.title}</h3>
                <p className="card-description">{option.description}</p>
                
                {/* Action Button */}
                <button 
                  className={`card-button ${option.buttonClass}`}
                  onClick={option.onClick}
                >
                  {option.buttonText}
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default JobManagement;
