const express = require('express');
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Google OAuth Login/Signup
router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body;
    
    // Verify the Google token
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    
    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;
    
    // Check if user already exists
    let user = await User.findOne({ $or: [{ email }, { googleId }] });
    
    if (user) {
      // User exists, update Google ID if needed
      if (!user.googleId) {
        user.googleId = googleId;
        await user.save();
      }
    } else {
      // Create new user
      user = new User({
        name,
        email,
        googleId,
        profilePicture: picture,
        isEmailVerified: true,
        authProvider: 'google'
      });
      await user.save();
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.status(200).json({
      success: true,
      message: 'Google authentication successful',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        profilePicture: user.profilePicture || picture
      },
      token
    });
    
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(400).json({
      success: false,
      message: 'Google authentication failed',
      error: error.message
    });
  }
});

module.exports = router;
