const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const multer = require('multer');
const { User } = require('../models/User');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const logger = require('../utils/logger');

const router = express.Router();

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// Generate verification token
const generateVerificationToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', async (req, res) => {
  try {
    const {
      email,
      password,
      firstName,
      lastName,
      phone,
      dateOfBirth,
      nationality,
      gender
    } = req.body;

    // Validation
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Email, password, first name, and last name are required'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { phone }]
    });

    if (existingUser) {
      return res.status(400).json({
        error: 'User already exists',
        message: 'A user with this email or phone number already exists'
      });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Generate verification token
    const verificationToken = generateVerificationToken();

    // Create user
    const user = new User({
      email,
      password: hashedPassword,
      profile: {
        firstName,
        lastName,
        phone,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
        nationality,
        gender
      },
      verification: {
        email: {
          token: verificationToken,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
        }
      }
    });

    await user.save();

    // Generate JWT token
    const token = generateToken(user._id);

    // Remove sensitive data from response
    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.verification;

    logger.info(`New user registered: ${email}`);

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: userResponse,
      verificationRequired: true
    });

  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({
      error: 'Registration failed',
      message: 'An error occurred during registration'
    });
  }
});

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Missing credentials',
        message: 'Email and password are required'
      });
    }

    // Find user
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Invalid email or password'
      });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Invalid email or password'
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(401).json({
        error: 'Account deactivated',
        message: 'Your account has been deactivated. Please contact support.'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    // Remove sensitive data
    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.verification;

    logger.info(`User logged in: ${email}`);

    res.json({
      message: 'Login successful',
      token,
      user: userResponse
    });

  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({
      error: 'Login failed',
      message: 'An error occurred during login'
    });
  }
});

/**
 * @route   POST /api/auth/verify-email
 * @desc    Verify email address
 * @access  Public
 */
router.post('/verify-email', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        error: 'Missing token',
        message: 'Verification token is required'
      });
    }

    // Find user with verification token
    const user = await User.findOne({
      'verification.email.token': token,
      'verification.email.expiresAt': { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({
        error: 'Invalid token',
        message: 'Invalid or expired verification token'
      });
    }

    // Mark email as verified
    user.verification.email.isVerified = true;
    user.verification.email.verifiedAt = new Date();
    user.verification.email.token = undefined;
    user.verification.email.expiresAt = undefined;

    await user.save();

    logger.info(`Email verified for user: ${user.email}`);

    res.json({
      message: 'Email verified successfully'
    });

  } catch (error) {
    logger.error('Email verification error:', error);
    res.status(500).json({
      error: 'Verification failed',
      message: 'An error occurred during email verification'
    });
  }
});

/**
 * @route   POST /api/auth/resend-verification
 * @desc    Resend email verification
 * @access  Private
 */
router.post('/resend-verification', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User account not found'
      });
    }

    if (user.verification.email.isVerified) {
      return res.status(400).json({
        error: 'Already verified',
        message: 'Email is already verified'
      });
    }

    // Generate new verification token
    const verificationToken = generateVerificationToken();
    user.verification.email.token = verificationToken;
    user.verification.email.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await user.save();

    // TODO: Send verification email
    logger.info(`Verification email resent to: ${user.email}`);

    res.json({
      message: 'Verification email sent successfully'
    });

  } catch (error) {
    logger.error('Resend verification error:', error);
    res.status(500).json({
      error: 'Failed to resend verification',
      message: 'An error occurred while resending verification email'
    });
  }
});

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Request password reset
 * @access  Public
 */
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        error: 'Missing email',
        message: 'Email is required'
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if email exists or not
      return res.json({
        message: 'If an account with that email exists, a password reset link has been sent'
      });
    }

    // Generate reset token
    const resetToken = generateVerificationToken();
    user.verification.passwordReset = {
      token: resetToken,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000) // 1 hour
    };

    await user.save();

    // TODO: Send password reset email
    logger.info(`Password reset requested for: ${email}`);

    res.json({
      message: 'If an account with that email exists, a password reset link has been sent'
    });

  } catch (error) {
    logger.error('Forgot password error:', error);
    res.status(500).json({
      error: 'Request failed',
      message: 'An error occurred while processing your request'
    });
  }
});

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 */
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        error: 'Missing data',
        message: 'Token and new password are required'
      });
    }

    // Find user with reset token
    const user = await User.findOne({
      'verification.passwordReset.token': token,
      'verification.passwordReset.expiresAt': { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({
        error: 'Invalid token',
        message: 'Invalid or expired reset token'
      });
    }

    // Hash new password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password and clear reset token
    user.password = hashedPassword;
    user.verification.passwordReset = undefined;

    await user.save();

    logger.info(`Password reset completed for user: ${user.email}`);

    res.json({
      message: 'Password reset successfully'
    });

  } catch (error) {
    logger.error('Reset password error:', error);
    res.status(500).json({
      error: 'Reset failed',
      message: 'An error occurred while resetting password'
    });
  }
});

/**
 * @route   POST /api/auth/change-password
 * @desc    Change password (authenticated user)
 * @access  Private
 */
router.post('/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'Missing data',
        message: 'Current password and new password are required'
      });
    }

    const user = await User.findById(req.user.userId).select('+password');
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User account not found'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        error: 'Invalid password',
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    user.password = hashedPassword;
    await user.save();

    logger.info(`Password changed for user: ${user.email}`);

    res.json({
      message: 'Password changed successfully'
    });

  } catch (error) {
    logger.error('Change password error:', error);
    res.status(500).json({
      error: 'Change failed',
      message: 'An error occurred while changing password'
    });
  }
});

/**
 * @route   POST /api/auth/upload-id
 * @desc    Upload identity verification document
 * @access  Private
 */
router.post('/upload-id', auth, upload.single('idDocument'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded',
        message: 'Identity document is required'
      });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User account not found'
      });
    }

    // Store document information
    user.verification.identity = {
      documentType: req.body.documentType || 'passport',
      documentUrl: req.file.path,
      uploadedAt: new Date(),
      status: 'pending'
    };

    await user.save();

    logger.info(`Identity document uploaded for user: ${user.email}`);

    res.json({
      message: 'Identity document uploaded successfully',
      status: 'pending_verification'
    });

  } catch (error) {
    logger.error('ID upload error:', error);
    res.status(500).json({
      error: 'Upload failed',
      message: 'An error occurred while uploading document'
    });
  }
});

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User account not found'
      });
    }

    const userResponse = user.toObject();
    delete userResponse.password;

    res.json({
      user: userResponse
    });

  } catch (error) {
    logger.error('Get profile error:', error);
    res.status(500).json({
      error: 'Failed to get profile',
      message: 'An error occurred while fetching profile'
    });
  }
});

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (invalidate token)
 * @access  Private
 */
router.post('/logout', auth, async (req, res) => {
  try {
    // In a production app, you might want to maintain a blacklist of tokens
    // For now, we'll just return success as the client should remove the token
    
    logger.info(`User logged out: ${req.user.userId}`);

    res.json({
      message: 'Logged out successfully'
    });

  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({
      error: 'Logout failed',
      message: 'An error occurred during logout'
    });
  }
});

/**
 * @route   POST /api/auth/social-login
 * @desc    Social media login (Google, Facebook)
 * @access  Public
 */
router.post('/social-login', async (req, res) => {
  try {
    const { provider, accessToken, profile } = req.body;

    if (!provider || !accessToken || !profile) {
      return res.status(400).json({
        error: 'Missing data',
        message: 'Provider, access token, and profile are required'
      });
    }

    // TODO: Verify token with social provider
    // For now, we'll trust the client-side verification

    const { email, firstName, lastName, picture } = profile;

    // Check if user exists
    let user = await User.findOne({ email });

    if (user) {
      // Update social login info
      user.socialLogins = user.socialLogins || {};
      user.socialLogins[provider] = {
        id: profile.id,
        accessToken,
        lastLogin: new Date()
      };
      
      if (picture && !user.profile.profilePicture) {
        user.profile.profilePicture = picture;
      }

      user.lastLogin = new Date();
      await user.save();
    } else {
      // Create new user
      user = new User({
        email,
        profile: {
          firstName,
          lastName,
          profilePicture: picture
        },
        socialLogins: {
          [provider]: {
            id: profile.id,
            accessToken,
            lastLogin: new Date()
          }
        },
        verification: {
          email: {
            isVerified: true, // Trust social provider verification
            verifiedAt: new Date()
          }
        }
      });

      await user.save();
    }

    // Generate JWT token
    const token = generateToken(user._id);

    // Remove sensitive data
    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.socialLogins;

    logger.info(`Social login successful: ${email} via ${provider}`);

    res.json({
      message: 'Social login successful',
      token,
      user: userResponse
    });

  } catch (error) {
    logger.error('Social login error:', error);
    res.status(500).json({
      error: 'Social login failed',
      message: 'An error occurred during social login'
    });
  }
});

module.exports = router;