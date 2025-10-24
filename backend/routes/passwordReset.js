const express = require('express');
const router = express.Router();
const {
  forgotPassword,
  verifyResetCode,
  resetPassword
} = require('../controllers/passwordResetController');

// ✅ POST /api/password-reset/forgot-password
// Send reset code to email
router.post('/forgot-password', forgotPassword);

// ✅ POST /api/password-reset/verify-code
// Verify the 6-digit reset code
router.post('/verify-code', verifyResetCode);

// ✅ POST /api/password-reset/reset-password
// Reset password with new password
router.post('/reset-password', resetPassword);

module.exports = router;
