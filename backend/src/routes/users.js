const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const logger = require('../utils/logger');

const router = express.Router();

// @route   GET /api/users/profile
// @desc    Get current user profile
// @access  Private
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    logger.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', [
  auth,
  body('name').optional().trim().isLength({ min: 2 }),
  body('age').optional().isInt({ min: 18, max: 100 }),
  body('bio').optional().isLength({ max: 500 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const updates = req.body;
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      success: true,
      data: user,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    logger.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/users/upload-avatar
// @desc    Upload user avatar
// @access  Private
router.post('/upload-avatar', [auth, upload.single('avatar')], async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { profilePicture: req.file.path },
      { new: true }
    ).select('-password');

    res.json({
      success: true,
      data: user,
      message: 'Avatar uploaded successfully'
    });
  } catch (error) {
    logger.error('Upload avatar error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/users/verify-identity
// @desc    Submit identity verification documents
// @access  Private
router.post('/verify-identity', [
  auth,
  upload.fields([
    { name: 'idDocument', maxCount: 1 },
    { name: 'selfie', maxCount: 1 }
  ])
], async (req, res) => {
  try {
    const { verificationType } = req.body;
    
    if (!req.files.idDocument) {
      return res.status(400).json({
        success: false,
        message: 'ID document is required'
      });
    }

    const verificationData = {
      type: verificationType,
      documents: {
        idDocument: req.files.idDocument[0].path,
        selfie: req.files.selfie ? req.files.selfie[0].path : null
      },
      status: 'pending',
      submittedAt: new Date()
    };

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { 
        verification: verificationData,
        verificationStatus: 'pending'
      },
      { new: true }
    ).select('-password');

    res.json({
      success: true,
      data: user,
      message: 'Identity verification submitted successfully'
    });
  } catch (error) {
    logger.error('Identity verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/users/search
// @desc    Search users by name or interests
// @access  Private
router.get('/search', auth, async (req, res) => {
  try {
    const { q, interests, location, page = 1, limit = 10 } = req.query;
    
    let query = { _id: { $ne: req.user.id } };
    
    if (q) {
      query.$or = [
        { name: { $regex: q, $options: 'i' } },
        { bio: { $regex: q, $options: 'i' } }
      ];
    }
    
    if (interests) {
      const interestArray = interests.split(',');
      query.travelInterests = { $in: interestArray };
    }
    
    if (location) {
      query.nationality = { $regex: location, $options: 'i' };
    }

    const users = await User.find(query)
      .select('-password -email')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    logger.error('Search users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/users/:id/follow
// @desc    Follow a user
// @access  Private
router.post('/:id/follow', auth, async (req, res) => {
  try {
    const targetUserId = req.params.id;
    
    if (targetUserId === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot follow yourself'
      });
    }

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const currentUser = await User.findById(req.user.id);
    
    if (currentUser.following.includes(targetUserId)) {
      return res.status(400).json({
        success: false,
        message: 'Already following this user'
      });
    }

    // Add to following list
    await User.findByIdAndUpdate(req.user.id, {
      $push: { following: targetUserId }
    });

    // Add to followers list
    await User.findByIdAndUpdate(targetUserId, {
      $push: { followers: req.user.id }
    });

    res.json({
      success: true,
      message: 'User followed successfully'
    });
  } catch (error) {
    logger.error('Follow user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   DELETE /api/users/:id/follow
// @desc    Unfollow a user
// @access  Private
router.delete('/:id/follow', auth, async (req, res) => {
  try {
    const targetUserId = req.params.id;

    // Remove from following list
    await User.findByIdAndUpdate(req.user.id, {
      $pull: { following: targetUserId }
    });

    // Remove from followers list
    await User.findByIdAndUpdate(targetUserId, {
      $pull: { followers: req.user.id }
    });

    res.json({
      success: true,
      message: 'User unfollowed successfully'
    });
  } catch (error) {
    logger.error('Unfollow user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;