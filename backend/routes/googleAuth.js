const express = require('express');
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ✅ FIXED: Complete Google OAuth Login/Signup WITH ROLE SUPPORT
router.post('/google', async (req, res) => {
  try {
    console.log('🔐 [Google OAuth] Authentication request received');
    const { credential, role } = req.body; // ✅ CRITICAL FIX: Extract role from request body
    
    console.log('📝 [Google OAuth] Role received:', role); // ✅ Log the role
    
    if (!credential) {
      return res.status(400).json({
        success: false,
        message: 'Google credential is required'
      });
    }
    
    // ✅ CRITICAL FIX: Validate and set the role (default to 'professional' instead of 'client')
    const userRole = role && ['client', 'professional', 'admin'].includes(role) ? role : 'professional';
    console.log('✅ [Google OAuth] Using role:', userRole);
    
    // Verify the Google token
    console.log('🔍 [Google OAuth] Verifying Google token...');
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    
    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture, email_verified } = payload;
    
    console.log('✅ [Google OAuth] Google token verified for:', email);
    
    // Check if user already exists
    let user = await User.findOne({ 
      $or: [
        { email: email },
        { googleId: googleId }
      ]
    });
    
    if (user) {
      console.log('👤 [Google OAuth] Existing user found:', email, '- Current role:', user.role);
      
      // ✅ CRITICAL FIX: Update role if different (allow role changes via Google OAuth)
      if (user.role !== userRole) {
        console.log('🔄 [Google OAuth] Updating user role from', user.role, 'to', userRole);
        user.role = userRole;
      }
      
      // Update Google ID if needed
      if (!user.googleId) {
        user.googleId = googleId;
      }
      // Update avatar if needed
      if (!user.avatar && picture) {
        user.avatar = picture;
      }
      // Ensure email is verified for Google users
      if (!user.isEmailVerified && email_verified) {
        user.isEmailVerified = true;
      }
      await user.save();
      console.log('✅ [Google OAuth] User updated with role:', user.role);
    } else {
      console.log('🆕 [Google OAuth] Creating new user for:', email, '- Role:', userRole);
      // Create new user with specified role
      user = new User({
        name: name || email.split('@')[0],
        email: email,
        googleId: googleId,
        avatar: picture,
        isEmailVerified: email_verified || true,
        authProvider: 'google',
        role: userRole, // ✅ CRITICAL FIX: Use the role from request
        title: '',
        bio: '',
        category: '',
        subcategory: '',
        contact: {
          phone: '',
          address: '',
          website: '',
          linkedin: '',
          github: ''
        },
        skills: [],
        education: [],
        experience: [],
        portfolio: [],
        certifications: [],
        languages: [],
        availability: {
          status: 'available',
          hoursPerWeek: 40,
          timezone: 'UTC'
        },
        rates: {
          hourly: 0,
          currency: 'USD'
        },
        stats: {
          totalJobs: 0,
          completedJobs: 0,
          rating: 0,
          totalEarnings: 0
        },
        settings: {
          emailNotifications: true,
          smsNotifications: false,
          profileVisibility: 'public'
        }
      });
      
      await user.save();
      console.log('✅ [Google OAuth] New user created successfully with role:', user.role);
    }
    
    // ✅ CRITICAL FIX: Generate JWT token with 'id' to match authController
    const token = jwt.sign(
      { id: user._id }, // ✅ Use 'id' not 'userId'
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    // Return complete user data
    const responseUser = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role, // ✅ This will now be the correct role
      title: user.title || '',
      bio: user.bio || '',
      avatar: user.avatar || picture,
      category: user.category || '',
      subcategory: user.subcategory || '',
      contact: user.contact || {},
      skills: user.skills || [],
      education: user.education || [],
      experience: user.experience || [],
      portfolio: user.portfolio || [],
      certifications: user.certifications || [],
      languages: user.languages || [],
      availability: user.availability || {},
      rates: user.rates || {},
      stats: user.stats || {},
      settings: user.settings || {},
      isEmailVerified: user.isEmailVerified,
      authProvider: user.authProvider || 'google',
      googleId: user.googleId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
    
    console.log('✅ [Google OAuth] Authentication successful for:', user.email, '- Final role:', responseUser.role);
    
    res.status(200).json({
      success: true,
      message: 'Google authentication successful',
      user: responseUser,
      token: token
    });
    
  } catch (error) {
    console.error('❌ [Google OAuth] Authentication failed:', error);
    
    let errorMessage = 'Google authentication failed';
    let statusCode = 400;
    
    if (error.message && error.message.includes('Token used too late')) {
      errorMessage = 'Google token expired. Please try again.';
      statusCode = 401;
    } else if (error.message && error.message.includes('audience')) {
      errorMessage = 'Invalid Google configuration. Please contact support.';
      statusCode = 500;
    } else if (error.message && error.message.includes('E11000')) {
      errorMessage = 'An account with this email already exists.';
      statusCode = 409;
    }
    
    res.status(statusCode).json({
      success: false,
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
