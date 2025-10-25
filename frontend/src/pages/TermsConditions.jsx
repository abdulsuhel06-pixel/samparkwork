import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaPrint, FaDownload, FaExternalLinkAlt } from 'react-icons/fa';
import './LegalPages.css';

const TermsConditions = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('');

  useEffect(() => {
    // Set page title
    document.title = 'Terms & Conditions - SamparkWork';
    
    // Scroll to top on component mount
    window.scrollTo(0, 0);

    // Handle section scrolling
    const handleScroll = () => {
      const sections = document.querySelectorAll('.legal-section[data-section]');
      let currentSection = '';

      sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.offsetHeight;
        if (window.scrollY >= sectionTop - 100 && window.scrollY < sectionTop + sectionHeight - 100) {
          currentSection = section.getAttribute('data-section');
        }
      });

      setActiveSection(currentSection);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    // Create a downloadable text version
    const element = document.createElement('a');
    const text = document.querySelector('.legal-content').innerText;
    const file = new Blob([text], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = 'SamparkWork-Terms-Conditions.txt';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const tableOfContents = [
    { id: 'acceptance', title: '1. Acceptance of Terms' },
    { id: 'definitions', title: '2. Definitions' },
    { id: 'eligibility', title: '3. User Eligibility' },
    { id: 'accounts', title: '4. User Accounts' },
    { id: 'services', title: '5. Platform Services' },
    { id: 'professional-obligations', title: '6. Professional Obligations' },
    { id: 'client-obligations', title: '7. Client Obligations' },
    { id: 'payments', title: '8. Payments & Fees' },
    { id: 'intellectual-property', title: '9. Intellectual Property' },
    { id: 'prohibited-conduct', title: '10. Prohibited Conduct' },
    { id: 'dispute-resolution', title: '11. Dispute Resolution' },
    { id: 'liability', title: '12. Limitation of Liability' },
    { id: 'termination', title: '13. Account Termination' },
    { id: 'privacy', title: '14. Privacy & Data Protection' },
    { id: 'compliance', title: '15. Legal Compliance' },
    { id: 'modifications', title: '16. Modifications' },
    { id: 'contact', title: '17. Contact Information' }
  ];

  return (
    <div className="legal-page">
      {/* Mobile Back Button */}
      <button 
        className="legal-back-btn"
        onClick={() => navigate(-1)}
        aria-label="Go back"
      >
        <FaArrowLeft />
      </button>

      {/* Header */}
      <div className="legal-header">
        <div className="legal-header-content">
          <h1>Terms & Conditions</h1>
          <p className="legal-subtitle">
            Governing the use of SamparkWork freelance marketplace platform
          </p>
          <div className="legal-meta">
            <span className="legal-effective-date">Effective Date: October 25, 2025</span>
            <span className="legal-last-updated">Last Updated: October 25, 2025</span>
          </div>
          
          {/* Action Buttons */}
          <div className="legal-actions">
            <button onClick={handlePrint} className="legal-action-btn">
              <FaPrint /> Print
            </button>
            <button onClick={handleDownload} className="legal-action-btn">
              <FaDownload /> Download
            </button>
          </div>
        </div>
      </div>

      <div className="legal-container">
        {/* Table of Contents - Desktop */}
        <nav className="legal-toc">
          <h3>Table of Contents</h3>
          <ul>
            {tableOfContents.map(item => (
              <li key={item.id}>
                <button
                  onClick={() => scrollToSection(item.id)}
                  className={activeSection === item.id ? 'active' : ''}
                >
                  {item.title}
                </button>
              </li>
            ))}
          </ul>
          
          <div className="legal-toc-footer">
            <Link to="/privacy" className="legal-cross-link">
              <FaExternalLinkAlt />
              Privacy Policy
            </Link>
          </div>
        </nav>

        {/* Main Content */}
        <main className="legal-content">
          <div className="legal-intro">
            <p>
              Welcome to <strong>SamparkWork</strong>, India's premier freelance marketplace connecting 
              skilled professionals with clients seeking quality services. These Terms and Conditions 
              ("Terms") govern your use of our platform, website, and all related services.
            </p>
            <div className="legal-highlight">
              <strong>Important:</strong> By creating an account or using our services, you agree to be 
              bound by these Terms. Please read them carefully before proceeding.
            </div>
          </div>

          {/* Section 1: Acceptance of Terms */}
          <section id="acceptance" className="legal-section" data-section="acceptance">
            <h2>1. Acceptance of Terms</h2>
            <div className="legal-subsection">
              <p>
                By accessing, browsing, or using the SamparkWork platform ("Platform"), you acknowledge 
                that you have read, understood, and agree to be bound by these Terms, our Privacy Policy, 
                and all applicable laws and regulations.
              </p>
              <p>
                If you do not agree to these Terms, you must not use our Platform. Your continued use 
                of the Platform constitutes acceptance of any modifications to these Terms.
              </p>
              <ul>
                <li>These Terms apply to all users, including professionals, clients, and visitors</li>
                <li>Additional terms may apply to specific services or features</li>
                <li>Local laws and regulations may also apply to your use of the Platform</li>
              </ul>
            </div>
          </section>

          {/* Section 2: Definitions */}
          <section id="definitions" className="legal-section" data-section="definitions">
            <h2>2. Definitions</h2>
            <div className="legal-definitions">
              <div className="definition-item">
                <strong>"Platform"</strong> - The SamparkWork website, mobile applications, and all related services.
              </div>
              <div className="definition-item">
                <strong>"Professional"</strong> - Skilled individuals offering services through the Platform.
              </div>
              <div className="definition-item">
                <strong>"Client"</strong> - Users seeking to hire professionals for specific projects or services.
              </div>
              <div className="definition-item">
                <strong>"Services"</strong> - Work, tasks, or projects offered by professionals to clients.
              </div>
              <div className="definition-item">
                <strong>"Contract"</strong> - Agreement between a professional and client for specific services.
              </div>
              <div className="definition-item">
                <strong>"Content"</strong> - All text, images, videos, data, and other materials on the Platform.
              </div>
            </div>
          </section>

          {/* Section 3: User Eligibility */}
          <section id="eligibility" className="legal-section" data-section="eligibility">
            <h2>3. User Eligibility</h2>
            <div className="legal-subsection">
              <h3>Age and Legal Capacity</h3>
              <p>To use the Platform, you must:</p>
              <ul>
                <li>Be at least 18 years of age</li>
                <li>Have the legal capacity to enter into binding agreements</li>
                <li>Not be prohibited from using the Platform under Indian law</li>
                <li>Provide accurate and complete information during registration</li>
              </ul>

              <h3>Geographic Restrictions</h3>
              <p>
                The Platform is primarily intended for users in India. While international users 
                may access the Platform, all services must comply with Indian laws and regulations.
              </p>

              <h3>Professional Licensing</h3>
              <p>
                Professionals must hold all necessary licenses, permits, or certifications required 
                for their offered services in their jurisdiction.
              </p>
            </div>
          </section>

          {/* Section 4: User Accounts */}
          <section id="accounts" className="legal-section" data-section="accounts">
            <h2>4. User Accounts</h2>
            <div className="legal-subsection">
              <h3>Account Creation</h3>
              <p>When creating an account, you agree to:</p>
              <ul>
                <li>Provide accurate, current, and complete information</li>
                <li>Maintain the security of your account credentials</li>
                <li>Promptly update any changes to your information</li>
                <li>Accept responsibility for all activities under your account</li>
              </ul>

              <h3>Account Verification</h3>
              <p>
                We may require identity verification for certain features or high-value transactions. 
                Verification may include government-issued ID, address proof, or professional certifications.
              </p>

              <h3>Account Security</h3>
              <p>You are responsible for:</p>
              <ul>
                <li>Keeping your password secure and confidential</li>
                <li>Immediately notifying us of unauthorized access</li>
                <li>Using strong, unique passwords</li>
                <li>Enabling two-factor authentication when available</li>
              </ul>
            </div>
          </section>

          {/* Section 5: Platform Services */}
          <section id="services" className="legal-section" data-section="services">
            <h2>5. Platform Services</h2>
            <div className="legal-subsection">
              <h3>Core Services</h3>
              <p>SamparkWork provides:</p>
              <ul>
                <li>A marketplace for connecting professionals and clients</li>
                <li>Communication tools for project coordination</li>
                <li>Secure payment processing systems</li>
                <li>Dispute resolution mechanisms</li>
                <li>Profile and portfolio management tools</li>
                <li>Job posting and application systems</li>
              </ul>

              <h3>Service Availability</h3>
              <p>
                While we strive for continuous availability, the Platform may be temporarily 
                unavailable due to maintenance, updates, or technical issues. We do not guarantee 
                uninterrupted access.
              </p>

              <h3>Third-Party Integration</h3>
              <p>
                The Platform may integrate with third-party services for payments, communications, 
                or other features. Your use of such services is subject to their respective terms and policies.
              </p>
            </div>
          </section>

          {/* Section 6: Professional Obligations */}
          <section id="professional-obligations" className="legal-section" data-section="professional-obligations">
            <h2>6. Professional Obligations</h2>
            <div className="legal-subsection">
              <h3>Service Quality</h3>
              <p>Professionals must:</p>
              <ul>
                <li>Deliver services as described in their proposals</li>
                <li>Maintain professional standards and quality</li>
                <li>Meet agreed-upon deadlines and milestones</li>
                <li>Communicate promptly and professionally with clients</li>
                <li>Provide accurate skill assessments and experience claims</li>
              </ul>

              <h3>Portfolio Accuracy</h3>
              <p>
                All portfolio items, testimonials, and work samples must be authentic and represent 
                your actual work. Misrepresentation may result in account suspension.
              </p>

              <h3>Availability and Communication</h3>
              <p>
                Professionals should maintain reasonable response times and clearly communicate 
                their availability, working hours, and any potential delays.
              </p>
            </div>
          </section>

          {/* Section 7: Client Obligations */}
          <section id="client-obligations" className="legal-section" data-section="client-obligations">
            <h2>7. Client Obligations</h2>
            <div className="legal-subsection">
              <h3>Project Requirements</h3>
              <p>Clients must:</p>
              <ul>
                <li>Provide clear, detailed project requirements</li>
                <li>Supply necessary materials and access promptly</li>
                <li>Respond to professional inquiries in a timely manner</li>
                <li>Make payments according to agreed terms</li>
                <li>Provide constructive feedback and approval processes</li>
              </ul>

              <h3>Intellectual Property</h3>
              <p>
                Clients must ensure they have the right to use any materials, content, or intellectual 
                property they provide to professionals for project completion.
              </p>

              <h3>Respectful Communication</h3>
              <p>
                All communications with professionals must be respectful, professional, and free 
                from discrimination, harassment, or inappropriate content.
              </p>
            </div>
          </section>

          {/* Section 8: Payments & Fees */}
          <section id="payments" className="legal-section" data-section="payments">
            <h2>8. Payments & Fees</h2>
            <div className="legal-subsection">
              <h3>Payment Processing</h3>
              <p>
                All payments are processed through secure third-party payment processors. 
                The Platform acts as an intermediary to facilitate transactions between users.
              </p>

              <h3>Service Fees</h3>
              <p>SamparkWork charges the following fees:</p>
              <ul>
                <li>Professional service fee: 10% of project value</li>
                <li>Client payment processing fee: 2.9% + ₹2 per transaction</li>
                <li>Additional fees may apply for premium features</li>
              </ul>

              <h3>Payment Terms</h3>
              <p>Standard payment terms:</p>
              <ul>
                <li>Milestone-based payments for projects over ₹10,000</li>
                <li>Payment release upon client approval or 7-day auto-release</li>
                <li>Refunds subject to dispute resolution process</li>
                <li>Currency: Indian Rupees (INR) unless otherwise specified</li>
              </ul>

              <h3>Tax Obligations</h3>
              <p>
                Users are responsible for all applicable taxes, including GST, income tax, 
                and any local taxes related to their earnings or payments on the Platform.
              </p>
            </div>
          </section>

          {/* Section 9: Intellectual Property */}
          <section id="intellectual-property" className="legal-section" data-section="intellectual-property">
            <h2>9. Intellectual Property</h2>
            <div className="legal-subsection">
              <h3>Platform Content</h3>
              <p>
                The Platform, including its design, features, logos, and proprietary content, 
                is owned by SamparkWork and protected by intellectual property laws.
              </p>

              <h3>User-Generated Content</h3>
              <p>
                Users retain ownership of their original content but grant SamparkWork a license to:
              </p>
              <ul>
                <li>Display content on the Platform</li>
                <li>Use content for marketing and promotional purposes</li>
                <li>Make technical modifications for Platform functionality</li>
              </ul>

              <h3>Work Product Ownership</h3>
              <p>
                Unless otherwise specified in the contract, completed work becomes the property 
                of the client upon full payment, while professionals retain the right to showcase 
                the work in their portfolio.
              </p>

              <h3>Copyright Infringement</h3>
              <p>
                We respond to legitimate copyright infringement notices in accordance with 
                Indian copyright law. Repeat infringers may have their accounts terminated.
              </p>
            </div>
          </section>

          {/* Section 10: Prohibited Conduct */}
          <section id="prohibited-conduct" className="legal-section" data-section="prohibited-conduct">
            <h2>10. Prohibited Conduct</h2>
            <div className="legal-subsection">
              <h3>Platform Misuse</h3>
              <p>Users must not:</p>
              <ul>
                <li>Circumvent Platform fees by conducting transactions outside the Platform</li>
                <li>Create multiple accounts to manipulate ratings or circumvent restrictions</li>
                <li>Use automated systems or bots to interact with the Platform</li>
                <li>Attempt to gain unauthorized access to other user accounts</li>
                <li>Reverse engineer or attempt to extract source code</li>
              </ul>

              <h3>Content Restrictions</h3>
              <p>Prohibited content includes:</p>
              <ul>
                <li>Discriminatory, harassing, or offensive material</li>
                <li>Copyrighted content without proper authorization</li>
                <li>Misleading or fraudulent information</li>
                <li>Adult content or services</li>
                <li>Illegal goods or services</li>
              </ul>

              <h3>Professional Misconduct</h3>
              <ul>
                <li>Misrepresenting skills, experience, or qualifications</li>
                <li>Failing to deliver agreed-upon services</li>
                <li>Soliciting clients outside the Platform</li>
                <li>Plagiarizing or submitting non-original work</li>
              </ul>
            </div>
          </section>

          {/* Section 11: Dispute Resolution */}
          <section id="dispute-resolution" className="legal-section" data-section="dispute-resolution">
            <h2>11. Dispute Resolution</h2>
            <div className="legal-subsection">
              <h3>Internal Resolution</h3>
              <p>
                We encourage users to resolve disputes through direct communication. Our platform 
                provides mediation services to help reach mutually acceptable solutions.
              </p>

              <h3>Formal Dispute Process</h3>
              <p>If internal resolution fails:</p>
              <ul>
                <li>Either party may file a formal dispute within 30 days</li>
                <li>We will review evidence and facilitate resolution</li>
                <li>Decisions may include refunds, project completion, or other remedies</li>
                <li>Our decision is binding unless overturned by legal proceedings</li>
              </ul>

              <h3>Arbitration</h3>
              <p>
                Disputes not resolved through our internal process may be subject to binding 
                arbitration under Indian Arbitration and Conciliation Act, 2015, conducted in New Delhi.
              </p>

              <h3>Legal Action</h3>
              <p>
                Users retain the right to pursue legal remedies through appropriate Indian courts, 
                with jurisdiction in New Delhi, India.
              </p>
            </div>
          </section>

          {/* Section 12: Limitation of Liability */}
          <section id="liability" className="legal-section" data-section="liability">
            <h2>12. Limitation of Liability</h2>
            <div className="legal-subsection">
              <h3>Platform Role</h3>
              <p>
                SamparkWork serves as a marketplace facilitator and is not responsible for the quality, 
                safety, legality, or delivery of services provided by professionals.
              </p>

              <h3>Liability Limits</h3>
              <p>Our liability is limited to:</p>
              <ul>
                <li>The total fees paid to SamparkWork in the 12 months preceding the claim</li>
                <li>Direct damages only; no consequential or indirect damages</li>
                <li>Good faith efforts to facilitate dispute resolution</li>
              </ul>

              <h3>User Responsibility</h3>
              <p>
                Users are responsible for their own actions, decisions, and the consequences of 
                their use of the Platform. We strongly recommend due diligence when engaging with other users.
              </p>

              <h3>Force Majeure</h3>
              <p>
                We are not liable for delays or failures due to circumstances beyond our reasonable 
                control, including natural disasters, government actions, or technical infrastructure issues.
              </p>
            </div>
          </section>

          {/* Section 13: Account Termination */}
          <section id="termination" className="legal-section" data-section="termination">
            <h2>13. Account Termination</h2>
            <div className="legal-subsection">
              <h3>Voluntary Termination</h3>
              <p>
                Users may close their accounts at any time by contacting support. Account closure 
                does not affect existing contractual obligations or completed transactions.
              </p>

              <h3>Involuntary Termination</h3>
              <p>We may suspend or terminate accounts for:</p>
              <ul>
                <li>Violation of these Terms or Platform policies</li>
                <li>Fraudulent or illegal activity</li>
                <li>Repeated disputes or poor performance ratings</li>
                <li>Extended inactivity (12+ months)</li>
                <li>Non-payment of fees or chargebacks</li>
              </ul>

              <h3>Effect of Termination</h3>
              <p>Upon termination:</p>
              <ul>
                <li>Access to the Platform is immediately revoked</li>
                <li>Outstanding payments will be processed according to existing agreements</li>
                <li>User data will be handled according to our Privacy Policy</li>
                <li>Some provisions of these Terms will survive termination</li>
              </ul>
            </div>
          </section>

          {/* Section 14: Privacy & Data Protection */}
          <section id="privacy" className="legal-section" data-section="privacy">
            <h2>14. Privacy & Data Protection</h2>
            <div className="legal-subsection">
              <h3>Data Collection and Use</h3>
              <p>
                Our collection and use of personal information is governed by our Privacy Policy, 
                which forms an integral part of these Terms.
              </p>

              <h3>Data Security</h3>
              <p>
                We implement appropriate technical and organizational measures to protect user data, 
                but cannot guarantee absolute security against all threats.
              </p>

              <h3>Cross-Border Data Transfer</h3>
              <p>
                User data may be processed and stored in servers located outside India, subject 
                to appropriate safeguards and applicable data protection laws.
              </p>
            </div>
          </section>

          {/* Section 15: Legal Compliance */}
          <section id="compliance" className="legal-section" data-section="compliance">
            <h2>15. Legal Compliance</h2>
            <div className="legal-subsection">
              <h3>Governing Law</h3>
              <p>
                These Terms are governed by the laws of India, without regard to conflict of law principles.
              </p>

              <h3>Regulatory Compliance</h3>
              <p>Operations comply with:</p>
              <ul>
                <li>Information Technology Act, 2000</li>
                <li>Consumer Protection Act, 2019</li>
                <li>Goods and Services Tax Act, 2017</li>
                <li>Payment and Settlement Systems Act, 2007</li>
                <li>Other applicable Indian laws and regulations</li>
              </ul>

              <h3>International Users</h3>
              <p>
                International users must comply with both Indian law and their local jurisdiction's 
                laws regarding online services and cross-border transactions.
              </p>
            </div>
          </section>

          {/* Section 16: Modifications */}
          <section id="modifications" className="legal-section" data-section="modifications">
            <h2>16. Modifications to Terms</h2>
            <div className="legal-subsection">
              <h3>Right to Modify</h3>
              <p>
                We reserve the right to modify these Terms at any time to reflect changes in our 
                services, legal requirements, or business practices.
              </p>

              <h3>Notification Process</h3>
              <p>Material changes will be communicated through:</p>
              <ul>
                <li>Email notification to registered users</li>
                <li>Prominent notice on the Platform</li>
                <li>In-app notifications for mobile users</li>
                <li>30-day advance notice for significant changes</li>
              </ul>

              <h3>Continued Use</h3>
              <p>
                Continued use of the Platform after modifications constitutes acceptance of the updated Terms. 
                Users who disagree with changes may terminate their accounts.
              </p>
            </div>
          </section>

          {/* Section 17: Contact Information */}
          <section id="contact" className="legal-section" data-section="contact">
            <h2>17. Contact Information</h2>
            <div className="legal-subsection">
              <h3>Customer Support</h3>
              <div className="contact-info">
                <p><strong>Email:</strong> support@samparkwork.in</p>
                <p><strong>Phone:</strong> +91-XXXX-XXXX-XX (Business Hours: 9 AM - 6 PM IST)</p>
                <p><strong>Address:</strong> [Your Business Address], India</p>
              </div>

              <h3>Legal Inquiries</h3>
              <div className="contact-info">
                <p><strong>Legal Email:</strong> legal@samparkwork.in</p>
                <p><strong>Copyright Agent:</strong> copyright@samparkwork.in</p>
              </div>

              <h3>Business Hours</h3>
              <p>
                Our support team is available Monday through Friday, 9:00 AM to 6:00 PM IST. 
                We aim to respond to all inquiries within 24-48 hours during business days.
              </p>
            </div>
          </section>

          {/* Footer */}
          <div className="legal-footer">
            <p>
              <strong>Document Version:</strong> 1.0 | <strong>Effective Date:</strong> October 25, 2025
            </p>
            <p>
              For questions about these Terms & Conditions, please contact our support team at 
              <a href="mailto:support@samparkwork.in"> support@samparkwork.in</a>
            </p>
            <div className="legal-footer-links">
              <Link to="/privacy">Privacy Policy</Link>
              <span>•</span>
              <Link to="/about">About Us</Link>
              <span>•</span>
              <Link to="/">Back to SamparkWork</Link>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default TermsConditions;
