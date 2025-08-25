const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema({
  requester: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  trip: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Trip',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'cancelled'],
    default: 'pending'
  },
  compatibilityScore: {
    type: Number,
    min: 0,
    max: 100,
    required: true
  },
  matchFactors: {
    destinationMatch: Number,
    dateOverlap: Number,
    interestSimilarity: Number,
    budgetCompatibility: Number,
    travelStyleMatch: Number,
    languageMatch: Number
  },
  message: {
    type: String,
    maxlength: 500
  },
  chatRoom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChatRoom'
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
matchSchema.index({ requester: 1, status: 1 });
matchSchema.index({ recipient: 1, status: 1 });
matchSchema.index({ trip: 1, status: 1 });
matchSchema.index({ compatibilityScore: -1 });
matchSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Prevent duplicate match requests
matchSchema.index({ requester: 1, recipient: 1, trip: 1 }, { unique: true });

const chatRoomSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  trip: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Trip'
  },
  match: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Match'
  },
  lastMessage: {
    content: String,
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: Date
  },
  isActive: {
    type: Boolean,
    default: true
  },
  unreadCount: {
    type: Map,
    of: Number,
    default: {}
  }
}, {
  timestamps: true
});

const messageSchema = new mongoose.Schema({
  chatRoom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChatRoom',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    maxlength: 1000
  },
  messageType: {
    type: String,
    enum: ['text', 'image', 'location', 'system'],
    default: 'text'
  },
  attachments: [{
    type: String,
    url: String,
    filename: String
  }],
  location: {
    type: {
      type: String,
      enum: ['Point']
    },
    coordinates: [Number],
    address: String
  },
  readBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: Date,
  isDeleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

messageSchema.index({ chatRoom: 1, createdAt: -1 });
messageSchema.index({ sender: 1 });

chatRoomSchema.index({ participants: 1 });
chatRoomSchema.index({ trip: 1 });

module.exports = {
  Match: mongoose.model('Match', matchSchema),
  ChatRoom: mongoose.model('ChatRoom', chatRoomSchema),
  Message: mongoose.model('Message', messageSchema)
};