const User = require('../models/User');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// ✅ FIXED: Correct Nodemailer import and usage
const createTransporter = () => {
  console.log('📧 Creating email transporter...');
  console.log('📧 EMAIL_USER:', process.env.EMAIL_USER);
  console.log('📧 EMAIL_SERVICE:', process.env.EMAIL_SERVICE);
  console.log('📧 EMAIL_PASS length:', process.env.EMAIL_PASS?.length);
  
  // ✅ CORRECT METHOD: nodemailer.createTransport (not createTransporter)
  return nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    tls: {
      rejectUnauthorized: false
    }
  });
};

// ✅ Test email connection function
const testEmailConnection = async () => {
  try {
    console.log('🧪 Testing email connection...');
    const transporter = createTransporter();
    await transporter.verify();
    console.log('✅ Email connection successful!');
    return { success: true };
  } catch (error) {
    console.error('❌ Email connection failed:', error.message);
    console.error('❌ Error code:', error.code);
    console.error('❌ Full error:', error);
    return { 
      success: false, 
      error: error.message,
      details: error.code || 'Unknown error'
    };
  }
};

// ✅ 1. Send Reset Code to Email
exports.forgotPassword = async (req, res) => {
  try {
    console.log('🔄 Starting forgot password process...');
    const { email } = req.body;

    if (!email) {
      console.log('❌ No email provided');
      return res.status(400).json({ 
        success: false, 
        message: 'Email is required' 
      });
    }

    console.log('📧 Looking for user with email:', email);

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      console.log('❌ User not found with email:', email);
      return res.status(404).json({ 
        success: false, 
        message: 'No account found with this email address' 
      });
    }

    console.log('✅ User found:', user.name, '(', user.email, ')');

    // Generate 6-digit code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    console.log('🔑 Generated reset code:', resetCode);
    console.log('🔑 Generated reset token:', resetToken.substring(0, 8) + '...');
    
    // Save reset code and token (expires in 10 minutes)
    user.resetPasswordCode = resetCode;
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    
    await user.save();
    console.log('💾 Reset data saved to database');

    // ✅ Test email connection first
    const connectionTest = await testEmailConnection();
    if (!connectionTest.success) {
      console.error('❌ Email service not available:', connectionTest.error);
      
      let userMessage = 'Email service is currently unavailable. Please try again later.';
      if (connectionTest.error.includes('Invalid login')) {
        userMessage = 'Gmail authentication failed. Please contact support.';
      } else if (connectionTest.error.includes('Username and Password not accepted')) {
        userMessage = 'Gmail credentials are invalid. Please check configuration.';
      }
      
      return res.status(500).json({
        success: false,
        message: userMessage,
        details: connectionTest.details
      });
    }

    // Create transporter and send email
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || `"Sampark Work" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: '🔐 Sampark Work - Password Reset Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa; padding: 20px; border-radius: 10px;">
          <div style="background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #10b981; margin: 0; font-size: 28px;">🔐 Password Reset</h1>
              <p style="color: #6b7280; margin: 10px 0 0 0;">Sampark Work</p>
            </div>

            <div style="margin-bottom: 30px;">
              <h2 style="color: #374151; font-size: 18px;">Hi ${user.name || 'there'},</h2>
              <p style="color: #6b7280; line-height: 1.6; margin: 15px 0;">
                You requested to reset your password for your Sampark Work account. 
                Use the verification code below to continue:
              </p>
            </div>

            <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 25px; border-radius: 12px; text-align: center; margin: 30px 0;">
              <p style="color: white; margin: 0 0 10px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Your Reset Code</p>
              <h1 style="color: white; font-size: 36px; font-weight: bold; margin: 0; letter-spacing: 8px; font-family: 'Courier New', monospace;">${resetCode}</h1>
            </div>

            <div style="background: #fef3c7; border: 1px solid #fbbf24; padding: 15px; border-radius: 8px; margin: 25px 0;">
              <p style="color: #92400e; margin: 0; font-size: 14px;">
                <strong>⏰ Important:</strong> This code will expire in 10 minutes for security reasons.
              </p>
            </div>

            <div style="text-align: center; margin-top: 40px; padding-top: 25px; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 14px; margin: 0;">
                Best regards,<br>
                <strong style="color: #10b981;">Sampark Work Team</strong>
              </p>
            </div>

          </div>
        </div>
      `
    };

    console.log('📤 Sending email to:', email);
    await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully!');

    res.status(200).json({
      success: true,
      message: 'Password reset code sent to your email. Please check your inbox.',
      resetToken: resetToken
    });

  } catch (error) {
    console.error('❌ Forgot password error:', error);
    
    let errorMessage = 'Error sending reset email';
    let errorDetails = error.message;

    if (error.code === 'EAUTH') {
      errorMessage = 'Gmail authentication failed. App password may be incorrect.';
      errorDetails = 'Invalid email credentials - check your Gmail app password';
    } else if (error.code === 'ECONNECTION') {
      errorMessage = 'Could not connect to Gmail servers. Please try again.';
      errorDetails = 'Network connection error';
    } else if (error.code === 'EMESSAGE') {
      errorMessage = 'Invalid email format. Please check and try again.';
      errorDetails = 'Email formatting error';
    }

    res.status(500).json({ 
      success: false, 
      message: errorMessage,
      details: process.env.NODE_ENV === 'development' ? errorDetails : undefined
    });
  }
};

// ✅ 2. Verify Reset Code
exports.verifyResetCode = async (req, res) => {
  try {
    console.log('🔄 Starting code verification...');
    const { email, code, resetToken } = req.body;

    if (!email || !code || !resetToken) {
      console.log('❌ Missing required fields');
      return res.status(400).json({ 
        success: false, 
        message: 'Email, code and reset token are required' 
      });
    }

    console.log('🔍 Verifying code for email:', email);
    console.log('🔍 Code provided:', code);

    // Find user with valid reset token and code
    const user = await User.findOne({
      email: email.toLowerCase(),
      resetPasswordCode: code,
      resetPasswordToken: resetToken,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      console.log('❌ Invalid or expired reset code');
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid or expired reset code. Please request a new one.' 
      });
    }

    console.log('✅ Code verified successfully for user:', user.name);

    res.status(200).json({
      success: true,
      message: 'Code verified successfully. You can now set a new password.',
      resetToken: resetToken
    });

  } catch (error) {
    console.error('❌ Verify reset code error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error verifying reset code. Please try again.' 
    });
  }
};

// ✅ 3. Reset Password
exports.resetPassword = async (req, res) => {
  try {
    console.log('🔄 Starting password reset...');
    const { email, newPassword, resetToken } = req.body;

    if (!email || !newPassword || !resetToken) {
      console.log('❌ Missing required fields');
      return res.status(400).json({ 
        success: false, 
        message: 'Email, new password and reset token are required' 
      });
    }

    if (newPassword.length < 6) {
      console.log('❌ Password too short');
      return res.status(400).json({ 
        success: false, 
        message: 'Password must be at least 6 characters long' 
      });
    }

    console.log('🔍 Finding user for password reset:', email);

    // Find user with valid reset token
    const user = await User.findOne({
      email: email.toLowerCase(),
      resetPasswordToken: resetToken,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      console.log('❌ Invalid or expired reset token');
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid or expired reset token. Please start the process again.' 
      });
    }

    console.log('✅ User found for password reset:', user.name);

    // Hash new password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    console.log('🔒 Password hashed successfully');

    // Update password and clear reset fields
    user.password = hashedPassword;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    user.resetPasswordCode = null;

    await user.save();
    console.log('💾 Password updated and reset fields cleared');

    res.status(200).json({
      success: true,
      message: 'Password reset successful! You can now login with your new password.'
    });

  } catch (error) {
    console.error('❌ Reset password error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error resetting password. Please try again.' 
    });
  }
};
