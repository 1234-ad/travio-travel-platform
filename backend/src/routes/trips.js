const express = require('express');
const { body, validationResult } = require('express-validator');
const Trip = require('../models/Trip');
const User = require('../models/User');
const auth = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// @route   POST /api/trips
// @desc    Create a new trip
// @access  Private
router.post('/', [
  auth,
  body('destination').notEmpty().withMessage('Destination is required'),
  body('startDate').isISO8601().withMessage('Valid start date is required'),
  body('endDate').isISO8601().withMessage('Valid end date is required'),
  body('budget').isNumeric().withMessage('Budget must be a number'),
  body('travelMode').isIn(['car', 'bike', 'flight', 'train', 'bus']).withMessage('Invalid travel mode')
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

    const {
      destination,
      startDate,
      endDate,
      budget,
      travelMode,
      interests,
      openToPartners,
      privacy,
      description,
      itinerary
    } = req.body;

    // Validate dates
    if (new Date(startDate) >= new Date(endDate)) {
      return res.status(400).json({
        success: false,
        message: 'End date must be after start date'
      });
    }

    const trip = new Trip({
      creator: req.user.id,
      destination,
      startDate,
      endDate,
      budget,
      travelMode,
      interests: interests || [],
      openToPartners: openToPartners || false,
      privacy: privacy || 'public',
      description,
      itinerary: itinerary || []
    });

    await trip.save();
    await trip.populate('creator', 'name profilePicture verificationStatus');

    res.status(201).json({
      success: true,
      data: trip,
      message: 'Trip created successfully'
    });
  } catch (error) {
    logger.error('Create trip error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/trips
// @desc    Get all trips with filters
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const {
      destination,
      startDate,
      endDate,
      budget,
      interests,
      travelMode,
      page = 1,
      limit = 10,
      sort = '-createdAt'
    } = req.query;

    let query = { privacy: 'public' };

    if (destination) {
      query.destination = { $regex: destination, $options: 'i' };
    }

    if (startDate && endDate) {
      query.$or = [
        {
          startDate: {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
          }
        },
        {
          endDate: {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
          }
        }
      ];
    }

    if (budget) {
      const [minBudget, maxBudget] = budget.split('-');
      query.budget = {
        $gte: parseInt(minBudget),
        $lte: parseInt(maxBudget) || 999999
      };
    }

    if (interests) {
      const interestArray = interests.split(',');
      query.interests = { $in: interestArray };
    }

    if (travelMode) {
      query.travelMode = travelMode;
    }

    const trips = await Trip.find(query)
      .populate('creator', 'name profilePicture verificationStatus')
      .populate('participants', 'name profilePicture')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort(sort);

    const total = await Trip.countDocuments(query);

    res.json({
      success: true,
      data: {
        trips,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    logger.error('Get trips error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/trips/my
// @desc    Get current user's trips
// @access  Private
router.get('/my', auth, async (req, res) => {
  try {
    const { status = 'all', page = 1, limit = 10 } = req.query;

    let query = {
      $or: [
        { creator: req.user.id },
        { participants: req.user.id }
      ]
    };

    if (status !== 'all') {
      query.status = status;
    }

    const trips = await Trip.find(query)
      .populate('creator', 'name profilePicture verificationStatus')
      .populate('participants', 'name profilePicture')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort('-createdAt');

    const total = await Trip.countDocuments(query);

    res.json({
      success: true,
      data: {
        trips,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    logger.error('Get my trips error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/trips/:id
// @desc    Get trip by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id)
      .populate('creator', 'name profilePicture verificationStatus bio')
      .populate('participants', 'name profilePicture verificationStatus')
      .populate('joinRequests.user', 'name profilePicture verificationStatus');

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip not found'
      });
    }

    // Check if user has access to private trip
    if (trip.privacy === 'private' && 
        trip.creator._id.toString() !== req.user.id &&
        !trip.participants.some(p => p._id.toString() === req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: trip
    });
  } catch (error) {
    logger.error('Get trip error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/trips/:id
// @desc    Update trip
// @access  Private
router.put('/:id', auth, async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip not found'
      });
    }

    // Only creator can update trip
    if (trip.creator.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this trip'
      });
    }

    const updates = req.body;
    const updatedTrip = await Trip.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    ).populate('creator', 'name profilePicture verificationStatus')
     .populate('participants', 'name profilePicture');

    res.json({
      success: true,
      data: updatedTrip,
      message: 'Trip updated successfully'
    });
  } catch (error) {
    logger.error('Update trip error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   DELETE /api/trips/:id
// @desc    Delete trip
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip not found'
      });
    }

    // Only creator can delete trip
    if (trip.creator.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this trip'
      });
    }

    await Trip.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Trip deleted successfully'
    });
  } catch (error) {
    logger.error('Delete trip error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/trips/:id/join
// @desc    Request to join a trip
// @access  Private
router.post('/:id/join', auth, async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip not found'
      });
    }

    if (!trip.openToPartners) {
      return res.status(400).json({
        success: false,
        message: 'This trip is not open to partners'
      });
    }

    // Check if user is already a participant
    if (trip.participants.includes(req.user.id)) {
      return res.status(400).json({
        success: false,
        message: 'You are already a participant'
      });
    }

    // Check if user already has a pending request
    const existingRequest = trip.joinRequests.find(
      request => request.user.toString() === req.user.id
    );

    if (existingRequest) {
      return res.status(400).json({
        success: false,
        message: 'You already have a pending request'
      });
    }

    trip.joinRequests.push({
      user: req.user.id,
      message: req.body.message || '',
      status: 'pending'
    });

    await trip.save();

    res.json({
      success: true,
      message: 'Join request sent successfully'
    });
  } catch (error) {
    logger.error('Join trip error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/trips/:id/join-requests/:requestId
// @desc    Accept or reject join request
// @access  Private
router.put('/:id/join-requests/:requestId', auth, async (req, res) => {
  try {
    const { action } = req.body; // 'accept' or 'reject'
    
    const trip = await Trip.findById(req.params.id);

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip not found'
      });
    }

    // Only creator can manage join requests
    if (trip.creator.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    const requestIndex = trip.joinRequests.findIndex(
      request => request._id.toString() === req.params.requestId
    );

    if (requestIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Join request not found'
      });
    }

    const joinRequest = trip.joinRequests[requestIndex];

    if (action === 'accept') {
      // Add user to participants
      trip.participants.push(joinRequest.user);
      joinRequest.status = 'accepted';
    } else if (action === 'reject') {
      joinRequest.status = 'rejected';
    }

    await trip.save();

    res.json({
      success: true,
      message: `Join request ${action}ed successfully`
    });
  } catch (error) {
    logger.error('Manage join request error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;