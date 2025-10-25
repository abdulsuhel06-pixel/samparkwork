import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaPrint, FaDownload, FaExternalLinkAlt, FaShieldAlt } from 'react-icons/fa';
import './LegalPages.css';

const PrivacyPolicy = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('');

  useEffect(() => {
    // Set page title
    document.title = 'Privacy Policy - SamparkWork';
    
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
    element.download = 'SamparkWork-Privacy-Policy.txt';
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
    { id: 'introduction', title: '1. Introduction' },
    { id: 'information-collected', title: '2. Information We Collect' },
    { id: 'how-we-use', title: '3. How We Use Information' },
    { id: 'information-sharing', title: '4. Information Sharing' },
    { id: 'data-security', title: '5. Data Security' },
    { id: 'cookies', title: '6. Cookies & Tracking' },
    { id: 'user-rights', title: '7. Your Rights & Choices' },
    { id: 'data-retention', title: '8. Data Retention' },
    { id: 'international-transfers', title: '9. International Transfers' },
    { id: 'childrens-privacy', title: '10. Children\'s Privacy' },
    { id: 'third-party-services', title: '11. Third-Party Services' },
    { id: 'changes', title: '12. Policy Changes' },
    { id: 'contact-privacy', title: '13. Contact Us' }
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
          <div className="privacy-header-icon">
            <FaShieldAlt />
          </div>
          <h1>Privacy Policy</h1>
          <p className="legal-subtitle">
            How we collect, use, and protect your personal information on SamparkWork
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
            <Link to="/terms" className="legal-cross-link">
              <FaExternalLinkAlt />
              Terms & Conditions
            </Link>
          </div>
        </nav>

        {/* Main Content */}
        <main className="legal-content">
          <div className="legal-intro">
            <p>
              At <strong>SamparkWork</strong>, we are committed to protecting your privacy and maintaining 
              the security of your personal information. This Privacy Policy explains how we collect, 
              use, disclose, and safeguard information when you use our freelance marketplace platform.
            </p>
            <div className="privacy-highlight">
              <strong>Your Privacy Matters:</strong> We follow industry best practices and comply with 
              applicable Indian data protection laws to ensure your information remains secure and private.
            </div>
          </div>

          {/* Section 1: Introduction */}
          <section id="introduction" className="legal-section" data-section="introduction">
            <h2>1. Introduction</h2>
            <div className="legal-subsection">
              <p>
                This Privacy Policy applies to all users of the SamparkWork platform, including 
                professionals, clients, and visitors. By using our services, you consent to the 
                collection and use of information as outlined in this policy.
              </p>
              
              <h3>Our Commitment</h3>
              <ul>
                <li>We collect only necessary information to provide our services</li>
                <li>We never sell your personal information to third parties</li>
                <li>We use industry-standard security measures to protect your data</li>
                <li>We provide you with control over your personal information</li>
                <li>We are transparent about our data practices</li>
              </ul>

              <h3>Scope of This Policy</h3>
              <p>
                This policy covers information collected through our website, mobile applications, 
                and all related services. It does not apply to third-party websites or services 
                that may be linked from our platform.
              </p>
            </div>
          </section>

          {/* Section 2: Information We Collect */}
          <section id="information-collected" className="legal-section" data-section="information-collected">
            <h2>2. Information We Collect</h2>
            <div className="legal-subsection">
              <h3>Personal Information</h3>
              <p>When you create an account or use our services, we collect:</p>
              <ul>
                <li><strong>Identity Information:</strong> Name, email address, phone number, profile picture</li>
                <li><strong>Professional Information:</strong> Skills, experience, education, certifications, portfolio samples</li>
                <li><strong>Payment Information:</strong> Bank account details, payment method information (processed securely by third-party providers)</li>
                <li><strong>Verification Documents:</strong> Government ID, address proof, professional licenses (when required)</li>
                <li><strong>Communication Data:</strong> Messages, project discussions, support interactions</li>
              </ul>

              <h3>Automatically Collected Information</h3>
              <p>We automatically collect certain technical information:</p>
              <ul>
                <li><strong>Device Information:</strong> IP address, browser type, operating system, device identifiers</li>
                <li><strong>Usage Data:</strong> Pages visited, time spent, features used, search queries</li>
                <li><strong>Location Data:</strong> General geographic location based on IP address</li>
                <li><strong>Performance Data:</strong> Error logs, crash reports, response times</li>
              </ul>

              <h3>Information from Third Parties</h3>
              <p>We may receive information from:</p>
              <ul>
                <li>Social media platforms (if you choose to connect your accounts)</li>
                <li>Payment processors and financial institutions</li>
                <li>Identity verification services</li>
                <li>Marketing and analytics partners (aggregated, non-personal data)</li>
              </ul>
            </div>
          </section>

          {/* Section 3: How We Use Information */}
          <section id="how-we-use" className="legal-section" data-section="how-we-use">
            <h2>3. How We Use Your Information</h2>
            <div className="legal-subsection">
              <h3>Primary Uses</h3>
              <p>We use your information to:</p>
              <ul>
                <li><strong>Provide Services:</strong> Enable account creation, profile management, and platform functionality</li>
                <li><strong>Facilitate Connections:</strong> Match professionals with relevant clients and projects</li>
                <li><strong>Process Payments:</strong> Handle transactions, invoicing, and financial reporting</li>
                <li><strong>Communication:</strong> Send project updates, system notifications, and support responses</li>
                <li><strong>Security:</strong> Detect fraud, prevent abuse, and maintain platform integrity</li>
              </ul>

              <h3>Secondary Uses</h3>
              <p>With your consent or as permitted by law, we may use information for:</p>
              <ul>
                <li><strong>Personalization:</strong> Customize your experience and improve service recommendations</li>
                <li><strong>Marketing:</strong> Send relevant updates about new features, opportunities, and platform news</li>
                <li><strong>Analytics:</strong> Analyze usage patterns to improve platform performance and user experience</li>
                <li><strong>Research:</strong> Conduct studies to better understand market trends and user needs</li>
              </ul>

              <h3>Legal Basis for Processing</h3>
              <p>We process your information based on:</p>
              <ul>
                <li>Contractual necessity to provide our services</li>
                <li>Legitimate business interests in platform operation and improvement</li>
                <li>Your explicit consent for marketing and optional features</li>
                <li>Legal obligations under Indian and applicable international laws</li>
              </ul>
            </div>
          </section>

          {/* Section 4: Information Sharing */}
          <section id="information-sharing" className="legal-section" data-section="information-sharing">
            <h2>4. Information Sharing and Disclosure</h2>
            <div className="legal-subsection">
              <h3>With Other Users</h3>
              <p>We share certain information to facilitate platform functionality:</p>
              <ul>
                <li>Professional profiles are visible to clients for hiring decisions</li>
                <li>Project communications are shared between relevant parties</li>
                <li>Reviews and ratings are publicly displayed (associated with usernames)</li>
                <li>Basic contact information may be shared after project initiation</li>
              </ul>

              <h3>With Service Providers</h3>
              <p>We work with trusted third-party providers for:</p>
              <ul>
                <li><strong>Payment Processing:</strong> Secure handling of financial transactions</li>
                <li><strong>Cloud Storage:</strong> Reliable data storage and backup services</li>
                <li><strong>Communication Services:</strong> Email delivery and messaging systems</li>
                <li><strong>Analytics:</strong> Understanding platform usage and performance</li>
                <li><strong>Customer Support:</strong> Providing technical assistance and support</li>
              </ul>

              <h3>Legal Requirements</h3>
              <p>We may disclose information when required by law or to:</p>
              <ul>
                <li>Comply with legal processes, court orders, or government requests</li>
                <li>Enforce our Terms of Service and other agreements</li>
                <li>Protect the rights, property, or safety of SamparkWork, users, or others</li>
                <li>Investigate fraud, security issues, or technical problems</li>
              </ul>

              <h3>Business Transfers</h3>
              <p>
                In the event of a merger, acquisition, or sale of assets, user information 
                may be transferred as part of the transaction, subject to applicable privacy protections.
              </p>
            </div>
          </section>

          {/* Section 5: Data Security */}
          <section id="data-security" className="legal-section" data-section="data-security">
            <h2>5. Data Security</h2>
            <div className="legal-subsection">
              <h3>Security Measures</h3>
              <p>We implement comprehensive security measures:</p>
              <ul>
                <li><strong>Encryption:</strong> Data transmission and storage using industry-standard encryption</li>
                <li><strong>Access Controls:</strong> Restricted access to personal information on a need-to-know basis</li>
                <li><strong>Regular Audits:</strong> Security assessments and vulnerability testing</li>
                <li><strong>Secure Infrastructure:</strong> Protected servers and network security measures</li>
                <li><strong>Employee Training:</strong> Regular privacy and security training for all staff</li>
              </ul>

              <h3>Your Role in Security</h3>
              <p>Help us protect your information by:</p>
              <ul>
                <li>Using strong, unique passwords for your account</li>
                <li>Enabling two-factor authentication when available</li>
                <li>Keeping your contact information up to date</li>
                <li>Reporting suspicious activity immediately</li>
                <li>Logging out of shared or public computers</li>
              </ul>

              <h3>Data Breach Response</h3>
              <p>
                In the unlikely event of a data breach, we will promptly notify affected users 
                and relevant authorities as required by law, and take immediate steps to secure 
                the platform and minimize any potential impact.
              </p>
            </div>
          </section>

          {/* Section 6: Cookies & Tracking */}
          <section id="cookies" className="legal-section" data-section="cookies">
            <h2>6. Cookies and Tracking Technologies</h2>
            <div className="legal-subsection">
              <h3>What Are Cookies</h3>
              <p>
                Cookies are small text files stored on your device that help us provide and improve 
                our services. We use both session cookies (which expire when you close your browser) 
                and persistent cookies (which remain on your device).
              </p>

              <h3>Types of Cookies We Use</h3>
              <ul>
                <li><strong>Essential Cookies:</strong> Required for platform functionality, login, and security</li>
                <li><strong>Performance Cookies:</strong> Help us understand how users interact with our platform</li>
                <li><strong>Functional Cookies:</strong> Remember your preferences and personalize your experience</li>
                <li><strong>Marketing Cookies:</strong> Used to deliver relevant advertisements and measure campaign effectiveness</li>
              </ul>

              <h3>Managing Cookies</h3>
              <p>You can control cookies through:</p>
              <ul>
                <li>Your browser settings to block or delete cookies</li>
                <li>Our cookie preference center (accessible in your account settings)</li>
                <li>Third-party opt-out tools for advertising cookies</li>
              </ul>

              <h3>Other Tracking Technologies</h3>
              <p>
                We may also use web beacons, pixel tags, and similar technologies to track 
                email opens, measure advertising effectiveness, and analyze user behavior.
              </p>
            </div>
          </section>

          {/* Section 7: User Rights */}
          <section id="user-rights" className="legal-section" data-section="user-rights">
            <h2>7. Your Rights and Choices</h2>
            <div className="legal-subsection">
              <h3>Access and Control</h3>
              <p>You have the right to:</p>
              <ul>
                <li><strong>Access:</strong> Request a copy of the personal information we hold about you</li>
                <li><strong>Correction:</strong> Update or correct inaccurate personal information</li>
                <li><strong>Deletion:</strong> Request deletion of your personal information (subject to certain limitations)</li>
                <li><strong>Portability:</strong> Obtain your data in a structured, machine-readable format</li>
                <li><strong>Restriction:</strong> Request limitation of how we process your information</li>
              </ul>

              <h3>Communication Preferences</h3>
              <p>You can control communications by:</p>
              <ul>
                <li>Updating your email preferences in account settings</li>
                <li>Unsubscribing from marketing emails using the links provided</li>
                <li>Contacting support to modify notification settings</li>
                <li>Opting out of SMS notifications (where applicable)</li>
              </ul>

              <h3>Account Management</h3>
              <p>Through your account settings, you can:</p>
              <ul>
                <li>Update profile information and preferences</li>
                <li>Control visibility of your profile information</li>
                <li>Download your data</li>
                <li>Deactivate or delete your account</li>
              </ul>

              <h3>How to Exercise Your Rights</h3>
              <p>
                To exercise any of these rights, please contact us at privacy@samparkwork.in 
                or use the privacy controls in your account settings. We will respond to your 
                request within 30 days.
              </p>
            </div>
          </section>

          {/* Section 8: Data Retention */}
          <section id="data-retention" className="legal-section" data-section="data-retention">
            <h2>8. Data Retention</h2>
            <div className="legal-subsection">
              <h3>Retention Periods</h3>
              <p>We retain your information for different periods based on the type of data:</p>
              <ul>
                <li><strong>Account Information:</strong> Until you delete your account, plus up to 7 years for legal compliance</li>
                <li><strong>Transaction Records:</strong> 7 years for financial and tax reporting requirements</li>
                <li><strong>Communication Data:</strong> 3 years or until account deletion</li>
                <li><strong>Usage Analytics:</strong> 2 years in aggregated, anonymized form</li>
                <li><strong>Support Records:</strong> 3 years for quality assurance and training</li>
              </ul>

              <h3>Deletion Process</h3>
              <p>When you delete your account:</p>
              <ul>
                <li>Profile information is immediately removed from public view</li>
                <li>Personal data is deleted within 30 days (except where retention is required by law)</li>
                <li>Some data may be retained in backups for up to 90 days</li>
                <li>Anonymized usage statistics may be retained indefinitely</li>
              </ul>

              <h3>Legal Retention Requirements</h3>
              <p>
                Some information must be retained longer due to legal obligations, including 
                financial records, tax information, and data related to disputes or investigations.
              </p>
            </div>
          </section>

          {/* Section 9: International Transfers */}
          <section id="international-transfers" className="legal-section" data-section="international-transfers">
            <h2>9. International Data Transfers</h2>
            <div className="legal-subsection">
              <h3>Cross-Border Processing</h3>
              <p>
                Your information may be processed and stored in countries other than India, 
                including servers located in secure data centers in the United States, Europe, 
                and other regions where our service providers operate.
              </p>

              <h3>Safeguards</h3>
              <p>When transferring data internationally, we ensure:</p>
              <ul>
                <li>Adequate level of data protection in the destination country</li>
                <li>Standard contractual clauses approved by relevant authorities</li>
                <li>Certification under recognized privacy frameworks</li>
                <li>Other appropriate safeguards as required by law</li>
              </ul>

              <h3>Your Rights</h3>
              <p>
                You have the right to obtain information about international transfers and 
                the safeguards in place. Contact us at privacy@samparkwork.in for more details.
              </p>
            </div>
          </section>

          {/* Section 10: Children's Privacy */}
          <section id="childrens-privacy" className="legal-section" data-section="childrens-privacy">
            <h2>10. Children's Privacy</h2>
            <div className="legal-subsection">
              <h3>Age Requirements</h3>
              <p>
                SamparkWork is intended for users who are at least 18 years old. We do not 
                knowingly collect personal information from children under 18 years of age.
              </p>

              <h3>Parental Notice</h3>
              <p>
                If we become aware that we have collected information from a child under 18 
                without parental consent, we will take steps to delete such information promptly.
              </p>

              <h3>Reporting</h3>
              <p>
                If you believe we have inadvertently collected information from a minor, 
                please contact us immediately at privacy@samparkwork.in.
              </p>
            </div>
          </section>

          {/* Section 11: Third-Party Services */}
          <section id="third-party-services" className="legal-section" data-section="third-party-services">
            <h2>11. Third-Party Services</h2>
            <div className="legal-subsection">
              <h3>Integrated Services</h3>
              <p>Our platform integrates with various third-party services:</p>
              <ul>
                <li><strong>Payment Processors:</strong> Secure handling of transactions</li>
                <li><strong>Social Media:</strong> Optional account linking and sharing</li>
                <li><strong>Communication Tools:</strong> Email and messaging services</li>
                <li><strong>Analytics Providers:</strong> Understanding platform usage</li>
                <li><strong>Cloud Storage:</strong> Secure file storage and backup</li>
              </ul>

              <h3>Third-Party Privacy Policies</h3>
              <p>
                Each third-party service has its own privacy policy governing how they handle 
                your information. We encourage you to review their policies before using these services.
              </p>

              <h3>Links to Other Websites</h3>
              <p>
                Our platform may contain links to third-party websites. We are not responsible 
                for the privacy practices of these external sites and recommend reviewing 
                their privacy policies.
              </p>
            </div>
          </section>

          {/* Section 12: Policy Changes */}
          <section id="changes" className="legal-section" data-section="changes">
            <h2>12. Changes to This Privacy Policy</h2>
            <div className="legal-subsection">
              <h3>Updates and Modifications</h3>
              <p>
                We may update this Privacy Policy from time to time to reflect changes in our 
                practices, technology, legal requirements, or other operational needs.
              </p>

              <h3>Notification of Changes</h3>
              <p>We will notify you of significant changes through:</p>
              <ul>
                <li>Email notification to your registered address</li>
                <li>Prominent notice on our platform</li>
                <li>In-app notifications for mobile users</li>
                <li>Updates to this page with revised effective date</li>
              </ul>

              <h3>Your Continued Use</h3>
              <p>
                Your continued use of the platform after we make changes constitutes acceptance 
                of the updated Privacy Policy. If you disagree with changes, you may close your account.
              </p>

              <h3>Version History</h3>
              <p>
                Previous versions of this Privacy Policy are available upon request for your reference.
              </p>
            </div>
          </section>

          {/* Section 13: Contact Information */}
          <section id="contact-privacy" className="legal-section" data-section="contact-privacy">
            <h2>13. Contact Us About Privacy</h2>
            <div className="legal-subsection">
              <h3>Privacy Officer</h3>
              <div className="contact-info">
                <p><strong>Email:</strong> privacy@samparkwork.in</p>
                <p><strong>Subject Line:</strong> "Privacy Inquiry" for faster processing</p>
                <p><strong>Response Time:</strong> We aim to respond within 72 hours</p>
              </div>

              <h3>General Support</h3>
              <div className="contact-info">
                <p><strong>Support Email:</strong> support@samparkwork.in</p>
                <p><strong>Phone:</strong> +91-XXXX-XXXX-XX (Business Hours: 9 AM - 6 PM IST)</p>
              </div>

              <h3>Postal Address</h3>
              <div className="contact-info">
                <p>SamparkWork Privacy Team<br />
                [Your Business Address]<br />
                [City, State, PIN Code]<br />
                India</p>
              </div>

              <h3>What to Include</h3>
              <p>When contacting us about privacy matters, please include:</p>
              <ul>
                <li>Your full name and registered email address</li>
                <li>Clear description of your privacy concern or request</li>
                <li>Any relevant account information (without passwords)</li>
                <li>Preferred method and language for our response</li>
              </ul>
            </div>
          </section>

          {/* Footer */}
          <div className="legal-footer">
            <p>
              <strong>Document Version:</strong> 1.0 | <strong>Effective Date:</strong> October 25, 2025
            </p>
            <p>
              For privacy-related questions or concerns, please contact our Privacy Team at 
              <a href="mailto:privacy@samparkwork.in"> privacy@samparkwork.in</a>
            </p>
            <div className="legal-footer-links">
              <Link to="/terms">Terms & Conditions</Link>
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

export default PrivacyPolicy;
