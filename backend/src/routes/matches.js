const express = require('express');
const { Match, ChatRoom, Message } = require('../models/Match');
const { User } = require('../models/User');
const { Trip } = require('../models/Trip');
const AIService = require('../services/aiService');
const auth = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * @route   GET /api/matches/potential
 * @desc    Get potential matches for user's trips
 * @access  Private
 */
router.get('/potential', auth, async (req, res) => {
  try {
    const { tripId, page = 1, limit = 10 } = req.query;
    const userId = req.user.userId;

    // Get user's active trips
    let userTrips;
    if (tripId) {
      userTrips = await Trip.find({ 
        _id: tripId, 
        creator: userId, 
        isActive: true 
      });
    } else {
      userTrips = await Trip.find({ 
        creator: userId, 
        isActive: true,
        'dates.start': { $gte: new Date() }
      });
    }

    if (userTrips.length === 0) {
      return res.json({
        matches: [],
        message: 'No active trips found'
      });
    }

    const currentUser = await User.findById(userId);
    const potentialMatches = [];

    for (const trip of userTrips) {
      // Find other trips with overlapping destinations and dates
      const otherTrips = await Trip.find({
        _id: { $ne: trip._id },
        creator: { $ne: userId },
        isActive: true,
        openToPartners: true,
        'dates.start': { $lte: trip.dates.end },
        'dates.end': { $gte: trip.dates.start },
        $or: [
          { 'destination.city': trip.destination.city },
          { 'destination.country': trip.destination.country },
          { 'destination.region': trip.destination.region }
        ]
      }).populate('creator', 'profile verification preferences');

      for (const otherTrip of otherTrips) {
        // Check if match already exists
        const existingMatch = await Match.findOne({
          $or: [
            { requester: userId, recipient: otherTrip.creator._id, trip: otherTrip._id },
            { requester: otherTrip.creator._id, recipient: userId, trip: trip._id }
          ]
        });

        if (!existingMatch) {
          // Calculate compatibility score
          const compatibility = AIService.calculateCompatibilityScore(
            currentUser, 
            otherTrip.creator, 
            otherTrip
          );

          if (compatibility.score >= 30) { // Minimum compatibility threshold
            potentialMatches.push({
              trip: otherTrip,
              user: otherTrip.creator,
              compatibilityScore: compatibility.score,
              matchFactors: compatibility.factors,
              userTrip: trip
            });
          }
        }
      }
    }

    // Sort by compatibility score
    potentialMatches.sort((a, b) => b.compatibilityScore - a.compatibilityScore);

    // Paginate results
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedMatches = potentialMatches.slice(startIndex, endIndex);

    res.json({
      matches: paginatedMatches,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(potentialMatches.length / limit),
        totalMatches: potentialMatches.length,
        hasNext: endIndex < potentialMatches.length,
        hasPrev: startIndex > 0
      }
    });

  } catch (error) {
    logger.error('Get potential matches error:', error);
    res.status(500).json({
      error: 'Failed to get matches',
      message: 'An error occurred while fetching potential matches'
    });
  }
});

/**
 * @route   POST /api/matches/request
 * @desc    Send a match request
 * @access  Private
 */
router.post('/request', auth, async (req, res) => {
  try {
    const { recipientId, tripId, message } = req.body;
    const requesterId = req.user.userId;

    if (!recipientId || !tripId) {
      return res.status(400).json({
        error: 'Missing data',
        message: 'Recipient ID and trip ID are required'
      });
    }

    if (recipientId === requesterId) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Cannot send match request to yourself'
      });
    }

    // Check if trip exists and is open to partners
    const trip = await Trip.findById(tripId);
    if (!trip) {
      return res.status(404).json({
        error: 'Trip not found',
        message: 'The specified trip does not exist'
      });
    }

    if (!trip.openToPartners) {
      return res.status(400).json({
        error: 'Trip not open',
        message: 'This trip is not open to partners'
      });
    }

    // Check if recipient exists
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({
        error: 'User not found',
        message: 'The specified user does not exist'
      });
    }

    // Check if match request already exists
    const existingMatch = await Match.findOne({
      requester: requesterId,
      recipient: recipientId,
      trip: tripId
    });

    if (existingMatch) {
      return res.status(400).json({
        error: 'Match exists',
        message: 'A match request already exists for this trip'
      });
    }

    // Get requester details for compatibility calculation
    const requester = await User.findById(requesterId);

    // Calculate compatibility score
    const compatibility = AIService.calculateCompatibilityScore(
      requester,
      recipient,
      trip
    );

    // Create match request
    const match = new Match({
      requester: requesterId,
      recipient: recipientId,
      trip: tripId,
      compatibilityScore: compatibility.score,
      matchFactors: compatibility.factors,
      message: message || '',
      status: 'pending'
    });

    await match.save();

    // Populate match data for response
    await match.populate([
      { path: 'requester', select: 'profile verification' },
      { path: 'recipient', select: 'profile verification' },
      { path: 'trip', select: 'title destination dates budget interests' }
    ]);

    logger.info(`Match request sent from ${requesterId} to ${recipientId} for trip ${tripId}`);

    res.status(201).json({
      message: 'Match request sent successfully',
      match
    });

  } catch (error) {
    logger.error('Send match request error:', error);
    res.status(500).json({
      error: 'Failed to send request',
      message: 'An error occurred while sending match request'
    });
  }
});

/**
 * @route   GET /api/matches/received
 * @desc    Get received match requests
 * @access  Private
 */
router.get('/received', auth, async (req, res) => {
  try {
    const { status = 'pending', page = 1, limit = 10 } = req.query;
    const userId = req.user.userId;

    const query = {
      recipient: userId,
      isActive: true
    };

    if (status !== 'all') {
      query.status = status;
    }

    const matches = await Match.find(query)
      .populate('requester', 'profile verification preferences')
      .populate('trip', 'title destination dates budget interests creator')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Match.countDocuments(query);

    res.json({
      matches,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalMatches: total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    logger.error('Get received matches error:', error);
    res.status(500).json({
      error: 'Failed to get matches',
      message: 'An error occurred while fetching received matches'
    });
  }
});

/**
 * @route   GET /api/matches/sent
 * @desc    Get sent match requests
 * @access  Private
 */
router.get('/sent', auth, async (req, res) => {
  try {
    const { status = 'pending', page = 1, limit = 10 } = req.query;
    const userId = req.user.userId;

    const query = {
      requester: userId,
      isActive: true
    };

    if (status !== 'all') {
      query.status = status;
    }

    const matches = await Match.find(query)
      .populate('recipient', 'profile verification preferences')
      .populate('trip', 'title destination dates budget interests creator')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Match.countDocuments(query);

    res.json({
      matches,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalMatches: total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    logger.error('Get sent matches error:', error);
    res.status(500).json({
      error: 'Failed to get matches',
      message: 'An error occurred while fetching sent matches'
    });
  }
});

/**
 * @route   PUT /api/matches/:matchId/respond
 * @desc    Respond to a match request (accept/reject)
 * @access  Private
 */
router.put('/:matchId/respond', auth, async (req, res) => {
  try {
    const { matchId } = req.params;
    const { response, message } = req.body; // response: 'accepted' or 'rejected'
    const userId = req.user.userId;

    if (!['accepted', 'rejected'].includes(response)) {
      return res.status(400).json({
        error: 'Invalid response',
        message: 'Response must be either "accepted" or "rejected"'
      });
    }

    const match = await Match.findById(matchId)
      .populate('requester', 'profile')
      .populate('recipient', 'profile')
      .populate('trip');

    if (!match) {
      return res.status(404).json({
        error: 'Match not found',
        message: 'The specified match does not exist'
      });
    }

    // Check if user is the recipient
    if (match.recipient._id.toString() !== userId) {
      return res.status(403).json({
        error: 'Unauthorized',
        message: 'You can only respond to matches sent to you'
      });
    }

    if (match.status !== 'pending') {
      return res.status(400).json({
        error: 'Invalid status',
        message: 'This match has already been responded to'
      });
    }

    // Update match status
    match.status = response;
    match.responseMessage = message;
    match.respondedAt = new Date();

    // If accepted, create chat room
    if (response === 'accepted') {
      const chatRoom = new ChatRoom({
        participants: [match.requester._id, match.recipient._id],
        trip: match.trip._id,
        match: match._id
      });

      await chatRoom.save();
      match.chatRoom = chatRoom._id;

      // Add requester to trip participants if not already added
      if (!match.trip.participants.includes(match.requester._id)) {
        match.trip.participants.push(match.requester._id);
        await match.trip.save();
      }
    }

    await match.save();

    logger.info(`Match ${matchId} ${response} by user ${userId}`);

    res.json({
      message: `Match request ${response} successfully`,
      match,
      chatRoomId: match.chatRoom
    });

  } catch (error) {
    logger.error('Respond to match error:', error);
    res.status(500).json({
      error: 'Failed to respond',
      message: 'An error occurred while responding to match'
    });
  }
});

/**
 * @route   GET /api/matches/chat-rooms
 * @desc    Get user's chat rooms
 * @access  Private
 */
router.get('/chat-rooms', auth, async (req, res) => {
  try {
    const userId = req.user.userId;

    const chatRooms = await ChatRoom.find({
      participants: userId,
      isActive: true
    })
    .populate('participants', 'profile verification')
    .populate('trip', 'title destination dates')
    .populate('match', 'compatibilityScore status')
    .sort({ updatedAt: -1 });

    res.json({
      chatRooms
    });

  } catch (error) {
    logger.error('Get chat rooms error:', error);
    res.status(500).json({
      error: 'Failed to get chat rooms',
      message: 'An error occurred while fetching chat rooms'
    });
  }
});

/**
 * @route   GET /api/matches/chat-rooms/:roomId/messages
 * @desc    Get messages from a chat room
 * @access  Private
 */
router.get('/chat-rooms/:roomId/messages', auth, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const userId = req.user.userId;

    // Check if user is participant in chat room
    const chatRoom = await ChatRoom.findById(roomId);
    if (!chatRoom) {
      return res.status(404).json({
        error: 'Chat room not found',
        message: 'The specified chat room does not exist'
      });
    }

    if (!chatRoom.participants.includes(userId)) {
      return res.status(403).json({
        error: 'Unauthorized',
        message: 'You are not a participant in this chat room'
      });
    }

    const messages = await Message.find({
      chatRoom: roomId,
      isDeleted: false
    })
    .populate('sender', 'profile')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

    // Mark messages as read
    await Message.updateMany(
      {
        chatRoom: roomId,
        sender: { $ne: userId },
        'readBy.user': { $ne: userId }
      },
      {
        $push: {
          readBy: {
            user: userId,
            readAt: new Date()
          }
        }
      }
    );

    // Update unread count
    chatRoom.unreadCount.set(userId, 0);
    await chatRoom.save();

    res.json({
      messages: messages.reverse(), // Return in chronological order
      pagination: {
        currentPage: parseInt(page),
        hasMore: messages.length === parseInt(limit)
      }
    });

  } catch (error) {
    logger.error('Get messages error:', error);
    res.status(500).json({
      error: 'Failed to get messages',
      message: 'An error occurred while fetching messages'
    });
  }
});

/**
 * @route   POST /api/matches/chat-rooms/:roomId/messages
 * @desc    Send a message to chat room
 * @access  Private
 */
router.post('/chat-rooms/:roomId/messages', auth, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { content, messageType = 'text', location } = req.body;
    const userId = req.user.userId;

    if (!content && messageType === 'text') {
      return res.status(400).json({
        error: 'Missing content',
        message: 'Message content is required'
      });
    }

    // Check if user is participant in chat room
    const chatRoom = await ChatRoom.findById(roomId);
    if (!chatRoom) {
      return res.status(404).json({
        error: 'Chat room not found',
        message: 'The specified chat room does not exist'
      });
    }

    if (!chatRoom.participants.includes(userId)) {
      return res.status(403).json({
        error: 'Unauthorized',
        message: 'You are not a participant in this chat room'
      });
    }

    // Create message
    const message = new Message({
      chatRoom: roomId,
      sender: userId,
      content,
      messageType,
      location: messageType === 'location' ? location : undefined,
      readBy: [{
        user: userId,
        readAt: new Date()
      }]
    });

    await message.save();
    await message.populate('sender', 'profile');

    // Update chat room last message and unread counts
    chatRoom.lastMessage = {
      content: content.substring(0, 100),
      sender: userId,
      timestamp: new Date()
    };

    // Increment unread count for other participants
    chatRoom.participants.forEach(participantId => {
      if (participantId.toString() !== userId) {
        const currentCount = chatRoom.unreadCount.get(participantId.toString()) || 0;
        chatRoom.unreadCount.set(participantId.toString(), currentCount + 1);
      }
    });

    await chatRoom.save();

    logger.info(`Message sent in chat room ${roomId} by user ${userId}`);

    res.status(201).json({
      message: 'Message sent successfully',
      data: message
    });

  } catch (error) {
    logger.error('Send message error:', error);
    res.status(500).json({
      error: 'Failed to send message',
      message: 'An error occurred while sending message'
    });
  }
});

/**
 * @route   DELETE /api/matches/:matchId
 * @desc    Cancel/delete a match request
 * @access  Private
 */
router.delete('/:matchId', auth, async (req, res) => {
  try {
    const { matchId } = req.params;
    const userId = req.user.userId;

    const match = await Match.findById(matchId);
    if (!match) {
      return res.status(404).json({
        error: 'Match not found',
        message: 'The specified match does not exist'
      });
    }

    // Check if user is the requester
    if (match.requester.toString() !== userId) {
      return res.status(403).json({
        error: 'Unauthorized',
        message: 'You can only cancel your own match requests'
      });
    }

    if (match.status === 'accepted') {
      return res.status(400).json({
        error: 'Cannot cancel',
        message: 'Cannot cancel an accepted match request'
      });
    }

    match.status = 'cancelled';
    match.isActive = false;
    await match.save();

    logger.info(`Match ${matchId} cancelled by user ${userId}`);

    res.json({
      message: 'Match request cancelled successfully'
    });

  } catch (error) {
    logger.error('Cancel match error:', error);
    res.status(500).json({
      error: 'Failed to cancel match',
      message: 'An error occurred while cancelling match'
    });
  }
});

/**
 * @route   GET /api/matches/stats
 * @desc    Get user's matching statistics
 * @access  Private
 */
router.get('/stats', auth, async (req, res) => {
  try {
    const userId = req.user.userId;

    const stats = await Promise.all([
      Match.countDocuments({ requester: userId, status: 'pending' }),
      Match.countDocuments({ recipient: userId, status: 'pending' }),
      Match.countDocuments({ requester: userId, status: 'accepted' }),
      Match.countDocuments({ recipient: userId, status: 'accepted' }),
      Match.countDocuments({ requester: userId, status: 'rejected' }),
      Match.countDocuments({ recipient: userId, status: 'rejected' }),
      ChatRoom.countDocuments({ participants: userId, isActive: true })
    ]);

    res.json({
      stats: {
        sentPending: stats[0],
        receivedPending: stats[1],
        acceptedSent: stats[2],
        acceptedReceived: stats[3],
        rejectedSent: stats[4],
        rejectedReceived: stats[5],
        activeChatRooms: stats[6],
        totalMatches: stats[2] + stats[3]
      }
    });

  } catch (error) {
    logger.error('Get match stats error:', error);
    res.status(500).json({
      error: 'Failed to get stats',
      message: 'An error occurred while fetching match statistics'
    });
  }
});

module.exports = router;