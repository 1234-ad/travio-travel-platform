const express = require('express');
const Trip = require('../models/Trip');
const User = require('../models/User');
const auth = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// AI Matching Algorithm
const calculateCompatibilityScore = (userTrip, otherTrip, user, otherUser) => {
  let score = 0;
  let factors = [];

  // Destination overlap (30% weight)
  if (userTrip.destination.toLowerCase().includes(otherTrip.destination.toLowerCase()) ||
      otherTrip.destination.toLowerCase().includes(userTrip.destination.toLowerCase())) {
    score += 30;
    factors.push('Same destination');
  }

  // Date overlap (25% weight)
  const userStart = new Date(userTrip.startDate);
  const userEnd = new Date(userTrip.endDate);
  const otherStart = new Date(otherTrip.startDate);
  const otherEnd = new Date(otherTrip.endDate);

  if ((userStart <= otherEnd && userEnd >= otherStart)) {
    const overlapDays = Math.min(userEnd, otherEnd) - Math.max(userStart, otherStart);
    const totalDays = Math.max(userEnd, otherEnd) - Math.min(userStart, otherStart);
    const overlapPercentage = (overlapDays / totalDays) * 100;
    score += (overlapPercentage / 100) * 25;
    factors.push(`${Math.round(overlapPercentage)}% date overlap`);
  }

  // Budget compatibility (15% weight)
  const budgetDiff = Math.abs(userTrip.budget - otherTrip.budget);
  const avgBudget = (userTrip.budget + otherTrip.budget) / 2;
  const budgetCompatibility = Math.max(0, 100 - (budgetDiff / avgBudget) * 100);
  score += (budgetCompatibility / 100) * 15;
  if (budgetCompatibility > 70) {
    factors.push('Similar budget range');
  }

  // Travel interests overlap (20% weight)
  const commonInterests = userTrip.interests.filter(interest => 
    otherTrip.interests.includes(interest)
  );
  if (commonInterests.length > 0) {
    const interestScore = (commonInterests.length / Math.max(userTrip.interests.length, otherTrip.interests.length)) * 20;
    score += interestScore;
    factors.push(`${commonInterests.length} shared interests`);
  }

  // Travel style compatibility (10% weight)
  const userStyle = user.travelStyle || [];
  const otherStyle = otherUser.travelStyle || [];
  const commonStyles = userStyle.filter(style => otherStyle.includes(style));
  if (commonStyles.length > 0) {
    score += (commonStyles.length / Math.max(userStyle.length, otherStyle.length)) * 10;
    factors.push('Compatible travel style');
  }

  return {
    score: Math.round(score),
    factors
  };
};

// @route   GET /api/matches/discover
// @desc    Discover potential trip matches
// @access  Private
router.get('/discover', auth, async (req, res) => {
  try {
    const { tripId, page = 1, limit = 10, minScore = 50 } = req.query;

    // Get user's trip
    const userTrip = await Trip.findById(tripId).populate('creator');
    if (!userTrip) {
      return res.status(404).json({
        success: false,
        message: 'Trip not found'
      });
    }

    // Verify user owns the trip
    if (userTrip.creator._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    // Get current user details
    const currentUser = await User.findById(req.user.id);

    // Find potential matches
    const potentialMatches = await Trip.find({
      _id: { $ne: tripId },
      creator: { $ne: req.user.id },
      openToPartners: true,
      privacy: 'public',
      status: 'active'
    }).populate('creator', 'name profilePicture verificationStatus travelStyle bio');

    // Calculate compatibility scores
    const matches = [];
    for (const trip of potentialMatches) {
      const compatibility = calculateCompatibilityScore(
        userTrip,
        trip,
        currentUser,
        trip.creator
      );

      if (compatibility.score >= minScore) {
        matches.push({
          trip,
          compatibility
        });
      }
    }

    // Sort by compatibility score
    matches.sort((a, b) => b.compatibility.score - a.compatibility.score);

    // Paginate results
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedMatches = matches.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: {
        matches: paginatedMatches,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(matches.length / limit),
          total: matches.length
        }
      }
    });
  } catch (error) {
    logger.error('Discover matches error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/matches/swipe
// @desc    Swipe on a potential match (like/pass)
// @access  Private
router.post('/swipe', auth, async (req, res) => {
  try {
    const { tripId, targetTripId, action } = req.body; // action: 'like' or 'pass'

    if (!['like', 'pass'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid action. Must be "like" or "pass"'
      });
    }

    const userTrip = await Trip.findById(tripId);
    const targetTrip = await Trip.findById(targetTripId);

    if (!userTrip || !targetTrip) {
      return res.status(404).json({
        success: false,
        message: 'Trip not found'
      });
    }

    // Verify user owns the trip
    if (userTrip.creator.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    // Check if already swiped
    const existingSwipe = userTrip.swipes.find(
      swipe => swipe.targetTrip.toString() === targetTripId
    );

    if (existingSwipe) {
      return res.status(400).json({
        success: false,
        message: 'Already swiped on this trip'
      });
    }

    // Add swipe record
    userTrip.swipes.push({
      targetTrip: targetTripId,
      action,
      swipedAt: new Date()
    });

    await userTrip.save();

    // If it's a like, check for mutual match
    let isMatch = false;
    if (action === 'like') {
      const targetTripSwipes = targetTrip.swipes || [];
      const mutualLike = targetTripSwipes.find(
        swipe => swipe.targetTrip.toString() === tripId && swipe.action === 'like'
      );

      if (mutualLike) {
        isMatch = true;
        
        // Create match records for both trips
        userTrip.matches.push({
          matchedTrip: targetTripId,
          matchedAt: new Date()
        });

        targetTrip.matches.push({
          matchedTrip: tripId,
          matchedAt: new Date()
        });

        await targetTrip.save();
        await userTrip.save();
      }
    }

    res.json({
      success: true,
      data: {
        action,
        isMatch
      },
      message: isMatch ? 'It\'s a match!' : 'Swipe recorded'
    });
  } catch (error) {
    logger.error('Swipe error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/matches/my-matches
// @desc    Get user's matches
// @access  Private
router.get('/my-matches', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const userTrips = await Trip.find({ creator: req.user.id })
      .populate({
        path: 'matches.matchedTrip',
        populate: {
          path: 'creator',
          select: 'name profilePicture verificationStatus'
        }
      });

    // Flatten all matches from all user trips
    const allMatches = [];
    userTrips.forEach(trip => {
      trip.matches.forEach(match => {
        allMatches.push({
          userTrip: {
            _id: trip._id,
            destination: trip.destination,
            startDate: trip.startDate,
            endDate: trip.endDate
          },
          matchedTrip: match.matchedTrip,
          matchedAt: match.matchedAt
        });
      });
    });

    // Sort by match date (newest first)
    allMatches.sort((a, b) => new Date(b.matchedAt) - new Date(a.matchedAt));

    // Paginate
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedMatches = allMatches.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: {
        matches: paginatedMatches,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(allMatches.length / limit),
          total: allMatches.length
        }
      }
    });
  } catch (error) {
    logger.error('Get matches error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/matches/recommendations/:tripId
// @desc    Get AI-powered trip recommendations
// @access  Private
router.get('/recommendations/:tripId', auth, async (req, res) => {
  try {
    const { tripId } = req.params;
    const { limit = 5 } = req.query;

    const userTrip = await Trip.findById(tripId);
    if (!userTrip) {
      return res.status(404).json({
        success: false,
        message: 'Trip not found'
      });
    }

    if (userTrip.creator.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    const currentUser = await User.findById(req.user.id);

    // Get trips that haven't been swiped on
    const swipedTripIds = userTrip.swipes.map(swipe => swipe.targetTrip.toString());
    
    const candidateTrips = await Trip.find({
      _id: { $ne: tripId, $nin: swipedTripIds },
      creator: { $ne: req.user.id },
      openToPartners: true,
      privacy: 'public',
      status: 'active'
    }).populate('creator', 'name profilePicture verificationStatus travelStyle bio');

    // Calculate scores and get top recommendations
    const recommendations = candidateTrips
      .map(trip => ({
        trip,
        compatibility: calculateCompatibilityScore(userTrip, trip, currentUser, trip.creator)
      }))
      .sort((a, b) => b.compatibility.score - a.compatibility.score)
      .slice(0, limit);

    res.json({
      success: true,
      data: recommendations
    });
  } catch (error) {
    logger.error('Get recommendations error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;