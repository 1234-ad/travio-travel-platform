const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const auth = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Emergency contact model (embedded in User)
const EmergencyContact = {
  name: String,
  phone: String,
  email: String,
  relationship: String,
  isPrimary: Boolean
};

// @route   POST /api/emergency/sos
// @desc    Trigger emergency SOS
// @access  Private
router.post('/sos', [
  auth,
  body('location').notEmpty().withMessage('Location is required'),
  body('emergencyType').isIn(['medical', 'safety', 'accident', 'lost', 'other']).withMessage('Invalid emergency type')
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

    const { location, emergencyType, message, severity = 'high' } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const sosAlert = {
      id: Date.now().toString(),
      userId: req.user.id,
      userName: user.name,
      userPhone: user.phone,
      location,
      emergencyType,
      message: message || '',
      severity,
      timestamp: new Date(),
      status: 'active'
    };

    // Store SOS in user's emergency history
    if (!user.emergencyHistory) {
      user.emergencyHistory = [];
    }
    user.emergencyHistory.push(sosAlert);
    await user.save();

    // Emit real-time SOS alert via Socket.io
    const io = req.app.get('io');
    if (io) {
      // Alert emergency services
      io.emit('emergency-alert', sosAlert);
      
      // Alert user's emergency contacts
      if (user.emergencyContacts && user.emergencyContacts.length > 0) {
        user.emergencyContacts.forEach(contact => {
          io.emit('emergency-contact-alert', {
            ...sosAlert,
            contactPhone: contact.phone,
            contactEmail: contact.email
          });
        });
      }

      // Alert nearby users (within 10km radius)
      io.emit('nearby-emergency', {
        location,
        emergencyType,
        severity,
        timestamp: sosAlert.timestamp
      });
    }

    // Log emergency for monitoring
    logger.warn(`EMERGENCY SOS: User ${user.name} (${req.user.id}) - ${emergencyType} at ${JSON.stringify(location)}`);

    res.json({
      success: true,
      data: {
        sosId: sosAlert.id,
        status: 'alert_sent',
        emergencyServices: 'notified',
        contacts: user.emergencyContacts ? user.emergencyContacts.length : 0
      },
      message: 'Emergency SOS sent successfully'
    });
  } catch (error) {
    logger.error('SOS error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/emergency/sos/:sosId/resolve
// @desc    Resolve emergency SOS
// @access  Private
router.put('/sos/:sosId/resolve', auth, async (req, res) => {
  try {
    const { sosId } = req.params;
    const { resolution } = req.body;

    const user = await User.findById(req.user.id);
    if (!user || !user.emergencyHistory) {
      return res.status(404).json({
        success: false,
        message: 'SOS alert not found'
      });
    }

    const sosIndex = user.emergencyHistory.findIndex(sos => sos.id === sosId);
    if (sosIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'SOS alert not found'
      });
    }

    user.emergencyHistory[sosIndex].status = 'resolved';
    user.emergencyHistory[sosIndex].resolvedAt = new Date();
    user.emergencyHistory[sosIndex].resolution = resolution;

    await user.save();

    // Emit resolution alert
    const io = req.app.get('io');
    if (io) {
      io.emit('emergency-resolved', {
        sosId,
        userId: req.user.id,
        resolvedAt: new Date()
      });
    }

    res.json({
      success: true,
      message: 'Emergency resolved successfully'
    });
  } catch (error) {
    logger.error('Resolve SOS error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/emergency/contacts
// @desc    Add emergency contact
// @access  Private
router.post('/contacts', [
  auth,
  body('name').notEmpty().withMessage('Name is required'),
  body('phone').isMobilePhone().withMessage('Valid phone number is required'),
  body('relationship').notEmpty().withMessage('Relationship is required')
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

    const { name, phone, email, relationship, isPrimary = false } = req.body;

    const user = await User.findById(req.user.id);
    if (!user.emergencyContacts) {
      user.emergencyContacts = [];
    }

    // If setting as primary, remove primary from others
    if (isPrimary) {
      user.emergencyContacts.forEach(contact => {
        contact.isPrimary = false;
      });
    }

    const newContact = {
      id: Date.now().toString(),
      name,
      phone,
      email: email || '',
      relationship,
      isPrimary,
      addedAt: new Date()
    };

    user.emergencyContacts.push(newContact);
    await user.save();

    res.status(201).json({
      success: true,
      data: newContact,
      message: 'Emergency contact added successfully'
    });
  } catch (error) {
    logger.error('Add emergency contact error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/emergency/contacts
// @desc    Get emergency contacts
// @access  Private
router.get('/contacts', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('emergencyContacts');
    
    res.json({
      success: true,
      data: user.emergencyContacts || []
    });
  } catch (error) {
    logger.error('Get emergency contacts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/emergency/contacts/:contactId
// @desc    Update emergency contact
// @access  Private
router.put('/contacts/:contactId', auth, async (req, res) => {
  try {
    const { contactId } = req.params;
    const updates = req.body;

    const user = await User.findById(req.user.id);
    if (!user.emergencyContacts) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }

    const contactIndex = user.emergencyContacts.findIndex(contact => contact.id === contactId);
    if (contactIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }

    // If setting as primary, remove primary from others
    if (updates.isPrimary) {
      user.emergencyContacts.forEach(contact => {
        contact.isPrimary = false;
      });
    }

    Object.assign(user.emergencyContacts[contactIndex], updates);
    await user.save();

    res.json({
      success: true,
      data: user.emergencyContacts[contactIndex],
      message: 'Emergency contact updated successfully'
    });
  } catch (error) {
    logger.error('Update emergency contact error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   DELETE /api/emergency/contacts/:contactId
// @desc    Delete emergency contact
// @access  Private
router.delete('/contacts/:contactId', auth, async (req, res) => {
  try {
    const { contactId } = req.params;

    const user = await User.findById(req.user.id);
    if (!user.emergencyContacts) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }

    const contactIndex = user.emergencyContacts.findIndex(contact => contact.id === contactId);
    if (contactIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }

    user.emergencyContacts.splice(contactIndex, 1);
    await user.save();

    res.json({
      success: true,
      message: 'Emergency contact deleted successfully'
    });
  } catch (error) {
    logger.error('Delete emergency contact error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/emergency/location-share
// @desc    Share live location with trusted contacts
// @access  Private
router.post('/location-share', [
  auth,
  body('location').notEmpty().withMessage('Location is required'),
  body('duration').isInt({ min: 1, max: 1440 }).withMessage('Duration must be between 1-1440 minutes')
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

    const { location, duration, contactIds } = req.body;

    const user = await User.findById(req.user.id);
    
    const locationShare = {
      id: Date.now().toString(),
      location,
      startTime: new Date(),
      endTime: new Date(Date.now() + duration * 60 * 1000),
      duration,
      contactIds: contactIds || [],
      isActive: true
    };

    if (!user.locationShares) {
      user.locationShares = [];
    }
    user.locationShares.push(locationShare);
    await user.save();

    // Emit location share to contacts
    const io = req.app.get('io');
    if (io) {
      const shareData = {
        userId: req.user.id,
        userName: user.name,
        location,
        duration,
        startTime: locationShare.startTime
      };

      if (contactIds && contactIds.length > 0) {
        contactIds.forEach(contactId => {
          io.to(`user-${contactId}`).emit('location-share-started', shareData);
        });
      } else {
        // Share with all emergency contacts
        user.emergencyContacts?.forEach(contact => {
          io.emit('location-share-notification', {
            ...shareData,
            contactPhone: contact.phone
          });
        });
      }
    }

    res.json({
      success: true,
      data: locationShare,
      message: 'Location sharing started'
    });
  } catch (error) {
    logger.error('Location share error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/emergency/history
// @desc    Get emergency history
// @access  Private
router.get('/history', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const user = await User.findById(req.user.id).select('emergencyHistory');
    
    const history = user.emergencyHistory || [];
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedHistory = history
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(startIndex, endIndex);

    res.json({
      success: true,
      data: {
        history: paginatedHistory,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(history.length / limit),
          total: history.length
        }
      }
    });
  } catch (error) {
    logger.error('Get emergency history error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;