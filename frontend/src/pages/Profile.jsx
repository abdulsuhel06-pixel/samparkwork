import React, { useState, useEffect, useContext } from 'react';
import { api, getImageUrl } from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { 
  User, 
  Edit3, 
  Plus, 
  X, 
  Upload, 
  Eye, 
  Trash2, 
  MapPin, 
  Mail, 
  Phone,
  Briefcase,
  Award,
  GraduationCap,
  Camera
} from 'lucide-react';
import './Profile.css';

const Profile = () => {
  const { user: currentUser, token, updateUser } = useContext(AuthContext);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState({});
  const [uploading, setUploading] = useState({});
  const [isOwnProfile, setIsOwnProfile] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, [token]);

  const fetchProfile = async () => {
    if (!token) {
      setError("Please log in to view profile");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      console.log("🔍 Fetching profile data...");
      const response = await api.get('/api/users/profile');
      
      if (response.data.success || response.data.user || response.data) {
        const profileData = response.data.user || response.data;
        console.log("✅ Profile data loaded:", profileData);
        
        setProfile(profileData);
        setIsOwnProfile(currentUser && (currentUser._id === profileData._id || currentUser.id === profileData._id));
        
        if (updateUser) {
          updateUser(profileData);
        }
      } else {
        setError("Failed to load profile data");
      }
    } catch (error) {
      console.error('❌ Error fetching profile:', error);
      
      if (error.response?.status === 401) {
        setError("Authentication required. Please log in again.");
        localStorage.removeItem('wn_token');
        window.location.href = '/login';
        return;
      }
      
      if (error.response?.status === 404) {
        setError("Profile not found");
      } else {
        setError("Failed to load profile. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file, type, data = {}) => {
    if (!isOwnProfile) {
      alert("You can only upload to your own profile");
      return;
    }

    if (!file) {
      alert("Please select a file to upload");
      return;
    }

    const formDataUpload = new FormData();
    
    if (type === 'avatar') {
      formDataUpload.append('avatar', file);
    } else if (type === 'certificate') {
      formDataUpload.append('certificate', file);
    } else if (type === 'portfolio') {
      formDataUpload.append('portfolioFile', file);
    }
    
    Object.keys(data).forEach(key => {
      if (data[key] !== undefined && data[key] !== null && data[key] !== '') {
        formDataUpload.append(key, data[key]);
      }
    });

    setUploading(prev => ({ ...prev, [type]: true }));

    try {
      let endpoint;
      switch(type) {
        case 'avatar':
          endpoint = '/api/users/profile/avatar';
          break;
        case 'certificate':
          endpoint = '/api/users/profile/certificate';
          break;
        case 'portfolio':
          endpoint = '/api/users/profile/portfolio';
          break;
        default:
          throw new Error('Invalid file type');
      }

      const response = await api.post(endpoint, formDataUpload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      console.log(`✅ ${type} upload successful:`, response.data);
      await fetchProfile();
      
      return response.data;
    } catch (error) {
      console.error(`❌ Error uploading ${type}:`, error);
      alert(`Error uploading ${type}: ${error.response?.data?.message || error.message}`);
    } finally {
      setUploading(prev => ({ ...prev, [type]: false }));
    }
  };

  const handleUpdateProfile = async (updateData) => {
    if (!isOwnProfile) {
      alert("You can only edit your own profile");
      return;
    }

    setUploading(prev => ({ ...prev, update: true }));

    try {
      const response = await api.put('/api/users/profile', updateData);
      console.log("✅ Profile updated:", response.data);
      
      await fetchProfile();
      alert("Profile updated successfully!");
    } catch (error) {
      console.error("❌ Profile update failed:", error);
      alert(`Error updating profile: ${error.response?.data?.message || error.message}`);
    } finally {
      setUploading(prev => ({ ...prev, update: false }));
    }
  };

  const handleDelete = async (type, itemId, itemName) => {
    if (!isOwnProfile || !itemId) return;

    if (!window.confirm(`Are you sure you want to delete "${itemName}"?`)) {
      return;
    }

    const deleteKey = `delete_${type}_${itemId}`;
    setUploading(prev => ({ ...prev, [deleteKey]: true }));

    try {
      await api.delete(`/api/users/profile/${type}/${itemId}`);
      await fetchProfile();
      alert(`${type === 'certificate' ? 'Certificate' : 'Portfolio item'} deleted successfully!`);
    } catch (error) {
      console.error(`❌ Delete ${type} failed:`, error);
      alert(`Error deleting ${type}: ${error.response?.data?.message || error.message}`);
    } finally {
      setUploading(prev => ({ ...prev, [deleteKey]: false }));
    }
  };

  if (loading) {
    return (
      <div className="profile-loading">
        <div className="loading-spinner"></div>
        <p>Loading your profile...</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="profile-error">
        <div className="error-content">
          <h3>{error || "Profile not found"}</h3>
          <button onClick={fetchProfile} className="retry-btn">
            Retry Loading
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-container">
      {/* Mobile-First Profile Header */}
      <div className="profile-header">
        <div className="avatar-section">
          <div className="avatar-container">
            {profile.avatar || profile.avatarUrl ? (
              <img 
                src={profile.avatarUrl || getImageUrl(profile.avatar, 'avatars')}
                alt={profile.name || 'Profile Avatar'}
                className="profile-avatar"
                onError={(e) => {
                  e.target.style.display = 'none';
                  const wrapper = e.target.parentNode;
                  const placeholder = wrapper.querySelector('.avatar-placeholder');
                  if (placeholder) placeholder.style.display = 'flex';
                }}
              />
            ) : null}
            
            <div 
              className="avatar-placeholder" 
              style={{ 
                display: (!profile.avatar && !profile.avatarUrl) ? 'flex' : 'none'
              }}
            >
              <User size={32} />
            </div>
            
            {isOwnProfile && (
              <label className="avatar-upload-btn">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) handleFileUpload(file, 'avatar');
                  }}
                  style={{ display: 'none' }}
                  disabled={uploading.avatar}
                />
                <Camera size={16} />
                {uploading.avatar ? 'Uploading...' : 'Change Photo'}
              </label>
            )}
          </div>
        </div>

        <div className="header-info">
          <h1 className="profile-name">{profile.name || 'User Name'}</h1>
          {profile.title && (
            <h2 className="profile-title">{profile.title}</h2>
          )}
          {profile.category && (
            <div className="profile-category">
              <Briefcase size={14} />
              {profile.category}
            </div>
          )}
        </div>
      </div>

      {/* Profile Content Sections */}
      <div className="profile-content">
        {/* Basic Information */}
        <div className="profile-section">
          <div className="section-header">
            <h3>
              <User size={18} />
              Basic Information
            </h3>
            {isOwnProfile && (
              <button 
                className="edit-btn"
                onClick={() => setEditing(prev => ({ ...prev, basicInfo: true }))}
              >
                <Edit3 size={16} />
                Edit
              </button>
            )}
          </div>
          
          <div className="info-grid">
            <div className="info-item">
              <label>Full Name:</label>
              <span>{profile.name || 'Not provided'}</span>
            </div>
            
            <div className="info-item">
              <label>Email:</label>
              <span>{profile.email || 'Not provided'}</span>
            </div>
            
            <div className="info-item">
              <label>Role:</label>
              <span className="role-badge">{profile.role || 'User'}</span>
            </div>
            
            {profile.bio && (
              <div className="info-item full-width">
                <label>Bio:</label>
                <p className="bio-text">{profile.bio}</p>
              </div>
            )}
          </div>

          {editing.basicInfo && (
            <BasicInfoForm
              profile={profile}
              onSubmit={async (data) => {
                await handleUpdateProfile(data);
                setEditing(prev => ({ ...prev, basicInfo: false }));
              }}
              onCancel={() => setEditing(prev => ({ ...prev, basicInfo: false }))}
              uploading={uploading.update}
            />
          )}
        </div>

        {/* Skills Section */}
        <div className="profile-section">
          <div className="section-header">
            <h3>
              <Award size={18} />
              Skills
            </h3>
            {isOwnProfile && (
              <button 
                className="edit-btn"
                onClick={() => setEditing(prev => ({ ...prev, skills: true }))}
              >
                <Edit3 size={16} />
                Edit
              </button>
            )}
          </div>
          
          <div className="skills-container">
            {profile.skills && profile.skills.length > 0 ? (
              profile.skills.map((skill, index) => (
                <span key={index} className="skill-tag">{skill}</span>
              ))
            ) : (
              <p className="empty-text">No skills added yet</p>
            )}
          </div>

          {editing.skills && (
            <SkillsForm
              skills={profile.skills || []}
              onSubmit={async (skills) => {
                await handleUpdateProfile({ skills });
                setEditing(prev => ({ ...prev, skills: false }));
              }}
              onCancel={() => setEditing(prev => ({ ...prev, skills: false }))}
              uploading={uploading.update}
            />
          )}
        </div>

        {/* Contact Information */}
        <div className="profile-section">
          <div className="section-header">
            <h3>
              <Mail size={18} />
              Contact Information
            </h3>
            {isOwnProfile && (
              <button 
                className="edit-btn"
                onClick={() => setEditing(prev => ({ ...prev, contact: true }))}
              >
                <Edit3 size={16} />
                Edit
              </button>
            )}
          </div>
          
          <div className="contact-info">
            {profile.contact && Object.keys(profile.contact).some(key => 
              key === 'socials' ? 
              (profile.contact.socials && Object.keys(profile.contact.socials).some(social => profile.contact.socials[social])) : 
              profile.contact[key]
            ) ? (
              <>
                {profile.contact.phone && (
                  <div className="contact-item">
                    <Phone size={16} />
                    <span>{profile.contact.phone}</span>
                  </div>
                )}
                
                {profile.contact.address && (
                  <div className="contact-item">
                    <MapPin size={16} />
                    <span>{profile.contact.address}</span>
                  </div>
                )}
              </>
            ) : (
              <p className="empty-text">No contact information added yet</p>
            )}
          </div>

          {editing.contact && (
            <ContactForm
              contact={profile.contact || {}}
              onSubmit={async (contact) => {
                await handleUpdateProfile({ contact });
                setEditing(prev => ({ ...prev, contact: false }));
              }}
              onCancel={() => setEditing(prev => ({ ...prev, contact: false }))}
              uploading={uploading.update}
            />
          )}
        </div>

        {/* Certificates Section */}
        <div className="profile-section">
          <div className="section-header">
            <h3>
              <GraduationCap size={18} />
              Certificates
            </h3>
            {isOwnProfile && (
              <button 
                className="add-btn"
                onClick={() => setEditing(prev => ({ ...prev, addCertificate: true }))}
              >
                <Plus size={16} />
                Add Certificate
              </button>
            )}
          </div>
          
          <div className="certificates-grid">
            {profile.certificates && profile.certificates.length > 0 ? (
              profile.certificates.map((cert, index) => {
                const certId = cert._id || cert.id || `cert-${index}`;
                const certImageUrl = getImageUrl(cert.filename || cert.url, 'certificates');
                
                return (
                  <div key={certId} className="certificate-card">
                    <div className="certificate-header">
                      <h4>{cert.name}</h4>
                      {isOwnProfile && (
                        <button 
                          className="delete-btn"
                          onClick={() => handleDelete('certificate', certId, cert.name)}
                          disabled={uploading[`delete_certificate_${certId}`]}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                    <p className="certificate-org">{cert.issuingOrg || 'Certificate Authority'}</p>
                    {cert.issueDate && (
                      <p className="certificate-date">
                        Issued: {new Date(cert.issueDate).toLocaleDateString()}
                      </p>
                    )}
                    {certImageUrl && (
                      <a 
                        href={certImageUrl}
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="view-certificate-btn"
                      >
                        <Eye size={16} />
                        View Certificate
                      </a>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="empty-state">
                <GraduationCap size={48} className="empty-icon" />
                <h4>No certificates added yet</h4>
                <p>Add your professional certificates to showcase your expertise</p>
              </div>
            )}
          </div>

          {editing.addCertificate && (
            <CertificateForm
              onSubmit={async (data, file) => {
                await handleFileUpload(file, 'certificate', data);
                setEditing(prev => ({ ...prev, addCertificate: false }));
              }}
              onCancel={() => setEditing(prev => ({ ...prev, addCertificate: false }))}
              uploading={uploading.certificate}
            />
          )}
        </div>

        {/* Portfolio Section */}
        <div className="profile-section">
          <div className="section-header">
            <h3>
              <Briefcase size={18} />
              Portfolio
            </h3>
            {isOwnProfile && (
              <button 
                className="add-btn"
                onClick={() => setEditing(prev => ({ ...prev, addPortfolio: true }))}
              >
                <Plus size={16} />
                Add Portfolio Item
              </button>
            )}
          </div>
          
          <div className="portfolio-grid">
            {profile.portfolio && profile.portfolio.length > 0 ? (
              profile.portfolio.map((item, index) => {
                const itemId = item._id || item.id || `item-${index}`;
                const portfolioImageUrl = getImageUrl(item.filename || item.url, 'portfolio');
                
                return (
                  <div key={itemId} className="portfolio-card">
                    <div className="portfolio-image-container">
                      {portfolioImageUrl ? (
                        <img 
                          src={portfolioImageUrl}
                          alt={item.title || 'Portfolio Item'}
                          className="portfolio-image"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            const container = e.target.parentNode;
                            const placeholder = container.querySelector('.portfolio-placeholder');
                            if (placeholder) placeholder.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      
                      <div 
                        className="portfolio-placeholder" 
                        style={{ display: !portfolioImageUrl ? 'flex' : 'none' }}
                      >
                        <Briefcase size={24} />
                        <p>Image not available</p>
                      </div>

                      <div className="portfolio-overlay">
                        <button 
                          onClick={() => {
                            if (portfolioImageUrl) {
                              window.open(portfolioImageUrl, '_blank');
                            }
                          }}
                          className="portfolio-view-btn"
                        >
                          <Eye size={16} />
                        </button>
                        {isOwnProfile && (
                          <button 
                            onClick={() => handleDelete('portfolio', itemId, item.title)}
                            disabled={uploading[`delete_portfolio_${itemId}`]}
                            className="portfolio-delete-btn"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <div className="portfolio-details">
                      <h4>{item.title || 'Untitled Project'}</h4>
                      {item.description && <p>{item.description}</p>}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="empty-state">
                <Briefcase size={48} className="empty-icon" />
                <h4>No portfolio items yet</h4>
                <p>Showcase your best work by adding portfolio items</p>
              </div>
            )}
          </div>

          {editing.addPortfolio && (
            <PortfolioForm
              onSubmit={async (data, file) => {
                await handleFileUpload(file, 'portfolio', data);
                setEditing(prev => ({ ...prev, addPortfolio: false }));
              }}
              onCancel={() => setEditing(prev => ({ ...prev, addPortfolio: false }))}
              uploading={uploading.portfolio}
            />
          )}
        </div>
      </div>
    </div>
  );
};

// Form Components

const BasicInfoForm = ({ profile, onSubmit, onCancel, uploading }) => {
  const [formData, setFormData] = useState({
    name: profile.name || '',
    title: profile.title || '',
    category: profile.category || '',
    bio: profile.bio || ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="modal-header">
            <h4>Edit Basic Information</h4>
            <button type="button" onClick={onCancel} className="close-btn">
              <X size={20} />
            </button>
          </div>
          
          <div className="form-content">
            <div className="form-group">
              <label>Full Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Your full name"
                required
              />
            </div>

            <div className="form-group">
              <label>Professional Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., CAD Designer, Jewelry Designer"
              />
            </div>

            <div className="form-group">
              <label>Category</label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                placeholder="e.g., CAD Design"
              />
            </div>

            <div className="form-group">
              <label>Bio</label>
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                placeholder="Tell us about yourself..."
                rows="4"
              />
            </div>
          </div>

          <div className="form-actions">
            <button type="button" onClick={onCancel} disabled={uploading} className="cancel-btn">
              Cancel
            </button>
            <button type="submit" disabled={uploading} className="submit-btn">
              {uploading ? 'Updating...' : 'Update Information'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const SkillsForm = ({ skills, onSubmit, onCancel, uploading }) => {
  const [skillList, setSkillList] = useState(skills);
  const [newSkill, setNewSkill] = useState('');

  const addSkill = () => {
    if (newSkill.trim() && !skillList.includes(newSkill.trim())) {
      setSkillList([...skillList, newSkill.trim()]);
      setNewSkill('');
    }
  };

  const removeSkill = (index) => {
    setSkillList(skillList.filter((_, i) => i !== index));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(skillList);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="modal-header">
            <h4>Edit Skills</h4>
            <button type="button" onClick={onCancel} className="close-btn">
              <X size={20} />
            </button>
          </div>
          
          <div className="form-content">
            <div className="form-group">
              <label>Add New Skill</label>
              <div className="skill-input-group">
                <input
                  type="text"
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  placeholder="Enter a skill"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                />
                <button type="button" onClick={addSkill} className="add-skill-btn">
                  <Plus size={16} />
                </button>
              </div>
            </div>

            <div className="skills-list">
              {skillList.map((skill, index) => (
                <div key={index} className="skill-item">
                  <span>{skill}</span>
                  <button 
                    type="button" 
                    onClick={() => removeSkill(index)}
                    className="remove-skill-btn"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="form-actions">
            <button type="button" onClick={onCancel} disabled={uploading} className="cancel-btn">
              Cancel
            </button>
            <button type="submit" disabled={uploading} className="submit-btn">
              {uploading ? 'Updating...' : 'Update Skills'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const ContactForm = ({ contact, onSubmit, onCancel, uploading }) => {
  const [formData, setFormData] = useState({
    phone: contact.phone || '',
    address: contact.address || ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="modal-header">
            <h4>Edit Contact Information</h4>
            <button type="button" onClick={onCancel} className="close-btn">
              <X size={20} />
            </button>
          </div>
          
          <div className="form-content">
            <div className="form-group">
              <label>Phone Number</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="Your phone number"
              />
            </div>

            <div className="form-group">
              <label>Address</label>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Your address"
                rows="3"
              />
            </div>
          </div>

          <div className="form-actions">
            <button type="button" onClick={onCancel} disabled={uploading} className="cancel-btn">
              Cancel
            </button>
            <button type="submit" disabled={uploading} className="submit-btn">
              {uploading ? 'Updating...' : 'Update Contact'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const CertificateForm = ({ onSubmit, onCancel, uploading }) => {
  const [formData, setFormData] = useState({ name: '', issuingOrg: '', issueDate: '' });
  const [file, setFile] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Certificate name is required');
      return;
    }
    if (!file) {
      alert('Please select a certificate file');
      return;
    }
    onSubmit(formData, file);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="modal-header">
            <h4>Add Certificate</h4>
            <button type="button" onClick={onCancel} className="close-btn">
              <X size={20} />
            </button>
          </div>
          
          <div className="form-content">
            <div className="form-group">
              <label>Certificate Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., CAD Designer Certificate"
                required
              />
            </div>

            <div className="form-group">
              <label>Issuing Organization</label>
              <input
                type="text"
                value={formData.issuingOrg}
                onChange={(e) => setFormData(prev => ({ ...prev, issuingOrg: e.target.value }))}
                placeholder="e.g., Autodesk, SolidWorks"
              />
            </div>

            <div className="form-group">
              <label>Issue Date</label>
              <input
                type="date"
                value={formData.issueDate}
                onChange={(e) => setFormData(prev => ({ ...prev, issueDate: e.target.value }))}
              />
            </div>

            <div className="form-group">
              <label>Certificate File * (PDF, JPG, PNG)</label>
              <div className="file-input-wrapper">
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setFile(e.target.files[0])}
                  required
                />
                <small>Max file size: 10MB</small>
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button type="button" onClick={onCancel} disabled={uploading} className="cancel-btn">
              Cancel
            </button>
            <button type="submit" disabled={uploading} className="submit-btn">
              {uploading ? 'Adding...' : 'Add Certificate'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const PortfolioForm = ({ onSubmit, onCancel, uploading }) => {
  const [formData, setFormData] = useState({ title: '', description: '' });
  const [file, setFile] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      alert('Portfolio title is required');
      return;
    }
    if (!file) {
      alert('Please select an image file');
      return;
    }
    onSubmit(formData, file);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="modal-header">
            <h4>Add Portfolio Item</h4>
            <button type="button" onClick={onCancel} className="close-btn">
              <X size={20} />
            </button>
          </div>
          
          <div className="form-content">
            <div className="form-group">
              <label>Project Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Custom CAD Design Project"
                required
              />
            </div>

            <div className="form-group">
              <label>Project Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe your project..."
                rows="4"
              />
            </div>

            <div className="form-group">
              <label>Project Image/Video * (JPG, PNG, GIF, MP4)</label>
              <div className="file-input-wrapper">
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.gif,.mp4"
                  onChange={(e) => setFile(e.target.files[0])}
                  required
                />
                <small>Max file size: 20MB</small>
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button type="button" onClick={onCancel} disabled={uploading} className="cancel-btn">
              Cancel
            </button>
            <button type="submit" disabled={uploading} className="submit-btn">
              {uploading ? 'Adding...' : 'Add to Portfolio'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Profile;
