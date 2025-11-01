const nodemailer = require('nodemailer');
const User = require('../models/User');

// ✅ EMAIL TRANSPORTER CONFIGURATION
const createTransporter = () => {
  // Use your preferred email service (Gmail, SendGrid, etc.)
  return nodemailer.createTransporter({
    service: 'gmail', // or 'sendgrid', 'mailgun', etc.
    auth: {
      user: process.env.EMAIL_USER, // Your email
      pass: process.env.EMAIL_PASSWORD // Your app password
    }
  });
};

// ✅ EMAIL TEMPLATES
const emailTemplates = {
  newMessage: (senderName, messagePreview, conversationUrl) => ({
    subject: `New message from ${senderName} - SamparkWork`,
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px; font-weight: 300;">SamparkWork</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Professional Marketplace</p>
        </div>
        
        <div style="padding: 40px 30px;">
          <h2 style="color: #333; margin-top: 0; font-size: 24px;">You have a new message!</h2>
          
          <div style="background: #f8f9ff; border-left: 4px solid #667eea; padding: 20px; margin: 25px 0; border-radius: 0 8px 8px 0;">
            <p style="margin: 0 0 10px 0; color: #555; font-size: 14px; font-weight: 600;">From: ${senderName}</p>
            <p style="margin: 0; color: #333; font-size: 16px; line-height: 1.6;">"${messagePreview}"</p>
          </div>
          
          <div style="text-align: center; margin: 35px 0;">
            <a href="${conversationUrl}" 
               style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                      color: white; 
                      text-decoration: none; 
                      padding: 14px 30px; 
                      border-radius: 25px; 
                      font-weight: 600; 
                      display: inline-block;
                      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);">
              Reply Now
            </a>
          </div>
          
          <p style="color: #888; font-size: 14px; line-height: 1.6; margin-bottom: 0;">
            You're receiving this email because you have message notifications enabled. 
            You can update your notification preferences in your account settings.
          </p>
        </div>
        
        <div style="background: #f5f6fa; padding: 20px; text-align: center; color: #888; font-size: 12px;">
          <p style="margin: 0;">© 2025 SamparkWork. All rights reserved.</p>
          <p style="margin: 5px 0 0 0;">
            <a href="${process.env.FRONTEND_URL}/settings" style="color: #667eea; text-decoration: none;">Unsubscribe</a>
          </p>
        </div>
      </div>
    `,
    text: `
      New message from ${senderName} on SamparkWork
      
      "${messagePreview}"
      
      Reply at: ${conversationUrl}
      
      ---
      SamparkWork - Professional Marketplace
    `
  }),

  jobMessage: (senderName, jobTitle, messagePreview, conversationUrl) => ({
    subject: `New message about "${jobTitle}" - SamparkWork`,
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px; font-weight: 300;">SamparkWork</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Professional Marketplace</p>
        </div>
        
        <div style="padding: 40px 30px;">
          <h2 style="color: #333; margin-top: 0; font-size: 24px;">New message about a job!</h2>
          
          <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; margin: 20px 0; border-radius: 8px;">
            <p style="margin: 0; color: #856404; font-weight: 600;">📋 Job: ${jobTitle}</p>
          </div>
          
          <div style="background: #f8f9ff; border-left: 4px solid #667eea; padding: 20px; margin: 25px 0; border-radius: 0 8px 8px 0;">
            <p style="margin: 0 0 10px 0; color: #555; font-size: 14px; font-weight: 600;">From: ${senderName}</p>
            <p style="margin: 0; color: #333; font-size: 16px; line-height: 1.6;">"${messagePreview}"</p>
          </div>
          
          <div style="text-align: center; margin: 35px 0;">
            <a href="${conversationUrl}" 
               style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                      color: white; 
                      text-decoration: none; 
                      padding: 14px 30px; 
                      border-radius: 25px; 
                      font-weight: 600; 
                      display: inline-block;
                      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);">
              View Conversation
            </a>
          </div>
        </div>
        
        <div style="background: #f5f6fa; padding: 20px; text-align: center; color: #888; font-size: 12px;">
          <p style="margin: 0;">© 2025 SamparkWork. All rights reserved.</p>
        </div>
      </div>
    `,
    text: `
      New message about "${jobTitle}" from ${senderName} on SamparkWork
      
      "${messagePreview}"
      
      View conversation: ${conversationUrl}
    `
  })
};

// ✅ SEND NEW MESSAGE NOTIFICATION EMAIL
const sendNewMessageNotification = async (recipientId, senderName, messagePreview, conversationId = null, jobTitle = null) => {
  try {
    console.log('📧 [sendNewMessageNotification] Sending email notification');

    // Get recipient user data
    const recipient = await User.findById(recipientId);
    if (!recipient || !recipient.email) {
      console.warn('❌ [sendNewMessageNotification] Recipient not found or no email');
      return false;
    }

    // Check if user has email notifications enabled
    if (recipient.notificationPreferences && !recipient.notificationPreferences.email) {
      console.log('⚠️ [sendNewMessageNotification] User has disabled email notifications');
      return false;
    }

    // Generate conversation URL
    const conversationUrl = conversationId ? 
      `${process.env.FRONTEND_URL}/messages?conversation=${conversationId}` :
      `${process.env.FRONTEND_URL}/messages`;

    // Choose email template based on context
    const emailContent = jobTitle ? 
      emailTemplates.jobMessage(senderName, jobTitle, messagePreview, conversationUrl) :
      emailTemplates.newMessage(senderName, messagePreview, conversationUrl);

    // Create transporter
    const transporter = createTransporter();

    // Send email
    const mailOptions = {
      from: `"SamparkWork" <${process.env.EMAIL_USER}>`,
      to: recipient.email,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ [sendNewMessageNotification] Email sent successfully:', result.messageId);
    
    return true;

  } catch (error) {
    console.error('❌ [sendNewMessageNotification] Error sending email:', error);
    return false;
  }
};

// ✅ SEND BULK NOTIFICATION EMAILS
const sendBulkNotifications = async (notifications) => {
  const transporter = createTransporter();
  const results = [];

  for (const notification of notifications) {
    try {
      const { recipient, subject, html, text } = notification;
      
      const mailOptions = {
        from: `"SamparkWork" <${process.env.EMAIL_USER}>`,
        to: recipient,
        subject,
        html,
        text
      };

      const result = await transporter.sendMail(mailOptions);
      results.push({ success: true, messageId: result.messageId, recipient });
      
    } catch (error) {
      console.error(`❌ [sendBulkNotifications] Failed to send to ${notification.recipient}:`, error);
      results.push({ success: false, error: error.message, recipient: notification.recipient });
    }
  }

  return results;
};

// ✅ TEST EMAIL CONNECTION
const testEmailConnection = async () => {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    console.log('✅ [testEmailConnection] Email service is ready');
    return true;
  } catch (error) {
    console.error('❌ [testEmailConnection] Email service error:', error);
    return false;
  }
};

module.exports = {
  sendNewMessageNotification,
  sendBulkNotifications,
  testEmailConnection,
  emailTemplates
};
