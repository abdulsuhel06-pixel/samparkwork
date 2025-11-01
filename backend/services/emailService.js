const nodemailer = require('nodemailer');
const User = require('../models/User');

// ✅ EMAIL SERVICE CLASS
class EmailService {
  constructor() {
    this.transporter = null;
    this.init();
  }

  // Initialize email transporter
  init() {
    try {
      // Gmail Configuration (Most reliable for production)
      if (process.env.EMAIL_SERVICE === 'gmail') {
        this.transporter = nodemailer.createTransporter({
          service: 'gmail',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_APP_PASSWORD // Use App Password, not regular password
          }
        });
      }
      // SMTP Configuration (Generic)
      else if (process.env.EMAIL_SERVICE === 'smtp') {
        this.transporter = nodemailer.createTransporter({
          host: process.env.EMAIL_HOST,
          port: process.env.EMAIL_PORT || 587,
          secure: process.env.EMAIL_PORT === '465',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD
          }
        });
      }
      // SendGrid (Alternative)
      else if (process.env.EMAIL_SERVICE === 'sendgrid') {
        const sgMail = require('@sendgrid/mail');
        sgMail.setApiKey(process.env.SENDGRID_API_KEY);
        this.sendGridMail = sgMail;
      }

      console.log(`✅ Email service initialized: ${process.env.EMAIL_SERVICE || 'none'}`);
    } catch (error) {
      console.error('❌ Email service initialization failed:', error);
    }
  }

  // Send email via Nodemailer
  async sendEmail(to, subject, html, text = null) {
    try {
      if (!this.transporter && !this.sendGridMail) {
        console.log('⚠️ Email service not configured - skipping email send');
        return { success: false, message: 'Email service not configured' };
      }

      const mailOptions = {
        from: `${process.env.EMAIL_FROM_NAME || 'SamparkWork'} <${process.env.EMAIL_USER}>`,
        to,
        subject,
        html,
        text: text || this.stripHtml(html)
      };

      let result;

      // SendGrid
      if (this.sendGridMail) {
        result = await this.sendGridMail.send(mailOptions);
      }
      // Nodemailer
      else {
        result = await this.transporter.sendMail(mailOptions);
      }

      console.log(`✅ Email sent successfully to ${to}: ${subject}`);
      return { success: true, messageId: result.messageId || result[0]?.messageId };

    } catch (error) {
      console.error('❌ Email send failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Strip HTML tags for text version
  stripHtml(html) {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }

  // ✅ NEW MESSAGE NOTIFICATION EMAIL
  async sendNewMessageNotification(recipientId, senderName, messagePreview, conversationId) {
    try {
      const recipient = await User.findById(recipientId);
      if (!recipient || !recipient.email) {
        return { success: false, message: 'Recipient email not found' };
      }

      // Check if user wants email notifications
      if (recipient.emailNotifications === false) {
        return { success: false, message: 'User has disabled email notifications' };
      }

      const subject = `💬 New message from ${senderName} - SamparkWork`;
      const conversationUrl = `${process.env.CLIENT_URL || 'https://samparkworkwebsite.vercel.app'}/messages/${conversationId}`;

      const html = this.createMessageEmailTemplate({
        recipientName: recipient.name,
        senderName,
        messagePreview,
        conversationUrl,
        unsubscribeUrl: `${process.env.CLIENT_URL}/settings/notifications`
      });

      return await this.sendEmail(recipient.email, subject, html);

    } catch (error) {
      console.error('❌ Failed to send new message notification:', error);
      return { success: false, error: error.message };
    }
  }

  // ✅ MESSAGE EMAIL TEMPLATE
  createMessageEmailTemplate({ recipientName, senderName, messagePreview, conversationUrl, unsubscribeUrl }) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Message - SamparkWork</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; margin: 0; padding: 0; background-color: #f8fafc; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 40px; text-align: center; }
        .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
        .content { padding: 40px; }
        .message-card { background: #f8fafc; border-left: 4px solid #667eea; padding: 20px; margin: 20px 0; border-radius: 8px; }
        .sender-name { font-weight: 600; color: #4a5568; font-size: 16px; margin-bottom: 8px; }
        .message-preview { color: #2d3748; font-size: 15px; line-height: 1.5; font-style: italic; }
        .cta-button { display: inline-block; background: #667eea; color: white; text-decoration: none; padding: 14px 30px; border-radius: 8px; font-weight: 600; margin: 25px 0; transition: background-color 0.3s; }
        .cta-button:hover { background: #5a67d8; }
        .footer { background: #f7fafc; padding: 25px 40px; text-align: center; border-top: 1px solid #e2e8f0; color: #718096; font-size: 14px; }
        .footer a { color: #667eea; text-decoration: none; }
        .logo { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
        .tagline { opacity: 0.9; font-size: 14px; }
        @media (max-width: 600px) {
            .content, .header, .footer { padding: 20px; }
            .cta-button { display: block; text-align: center; margin: 20px 0; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">SamparkWork</div>
            <div class="tagline">Connect. Collaborate. Create.</div>
        </div>
        
        <div class="content">
            <h2 style="color: #2d3748; margin-top: 0;">Hi ${recipientName}! 👋</h2>
            
            <p style="color: #4a5568; font-size: 16px;">You have a new message waiting for you:</p>
            
            <div class="message-card">
                <div class="sender-name">💬 From: ${senderName}</div>
                <div class="message-preview">"${messagePreview}"</div>
            </div>
            
            <div style="text-align: center;">
                <a href="${conversationUrl}" class="cta-button">View Message</a>
            </div>
            
            <p style="color: #718096; font-size: 14px; margin-top: 30px;">
                <strong>Quick Tip:</strong> Respond quickly to maintain good communication and build stronger professional relationships! 🚀
            </p>
        </div>
        
        <div class="footer">
            <p><strong>SamparkWork</strong> - India's Premier Freelance Marketplace</p>
            <p>
                <a href="${conversationUrl}">View Message</a> • 
                <a href="${unsubscribeUrl}">Notification Settings</a> • 
                <a href="${process.env.CLIENT_URL}">Visit SamparkWork</a>
            </p>
            <p style="margin-top: 15px; font-size: 12px; opacity: 0.8;">
                You're receiving this because you have a SamparkWork account. 
                <a href="${unsubscribeUrl}">Manage your email preferences</a>
            </p>
        </div>
    </div>
</body>
</html>`;
  }

  // ✅ JOB APPLICATION NOTIFICATION
  async sendJobApplicationNotification(jobOwnerId, applicantName, jobTitle, applicationId) {
    try {
      const jobOwner = await User.findById(jobOwnerId);
      if (!jobOwner || !jobOwner.email || jobOwner.emailNotifications === false) {
        return { success: false, message: 'Job owner email not available or disabled' };
      }

      const subject = `🎯 New application for "${jobTitle}" from ${applicantName}`;
      const applicationUrl = `${process.env.CLIENT_URL}/dashboard/applications/${applicationId}`;

      const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Job Application</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f8fafc; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.07); }
        .header { background: linear-gradient(135deg, #48bb78 0%, #38a169 100%); color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; }
        .cta-button { display: inline-block; background: #48bb78; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; margin: 20px 0; }
        .footer { background: #f7fafc; padding: 20px; text-align: center; color: #718096; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 style="margin: 0;">🎯 New Job Application</h1>
        </div>
        <div class="content">
            <h2>Hi ${jobOwner.name}!</h2>
            <p><strong>${applicantName}</strong> has applied for your job:</p>
            <div style="background: #f0fff4; border-left: 4px solid #48bb78; padding: 15px; margin: 15px 0; border-radius: 4px;">
                <strong>"${jobTitle}"</strong>
            </div>
            <div style="text-align: center;">
                <a href="${applicationUrl}" class="cta-button">Review Application</a>
            </div>
            <p><small>Review applications quickly to find the best talent for your project!</small></p>
        </div>
        <div class="footer">
            <p><strong>SamparkWork</strong> - Connect with India's best professionals</p>
        </div>
    </div>
</body>
</html>`;

      return await this.sendEmail(jobOwner.email, subject, html);

    } catch (error) {
      console.error('❌ Failed to send job application notification:', error);
      return { success: false, error: error.message };
    }
  }

  // ✅ TEST EMAIL FUNCTION
  async testEmail() {
    try {
      const testEmail = process.env.EMAIL_USER || 'test@example.com';
      const result = await this.sendEmail(
        testEmail,
        '🧪 SamparkWork Email Service Test',
        `
        <div style="font-family: Arial, sans-serif; padding: 20px; background: #f8fafc;">
          <h2 style="color: #2d3748;">✅ Email Service Working!</h2>
          <p>This is a test email from SamparkWork notification system.</p>
          <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
          <p><strong>Service:</strong> ${process.env.EMAIL_SERVICE}</p>
          <hr>
          <p style="color: #718096; font-size: 14px;">SamparkWork Notification System</p>
        </div>
        `
      );

      console.log('🧪 Email test result:', result);
      return result;

    } catch (error) {
      console.error('❌ Email test failed:', error);
      return { success: false, error: error.message };
    }
  }
}

// Export singleton instance
module.exports = new EmailService();
