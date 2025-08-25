const mongoose = require('mongoose');

const communityPostSchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  content: {
    type: String,
    required: true,
    maxlength: 5000
  },
  type: {
    type: String,
    enum: ['story', 'question', 'tip', 'meetup', 'event'],
    default: 'story'
  },
  images: [{
    url: String,
    caption: String
  }],
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: [0, 0]
    },
    address: String,
    city: String,
    country: String
  },
  tags: [String],
  likes: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    content: {
      type: String,
      required: true,
      maxlength: 1000
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  isModerated: {
    type: Boolean,
    default: false
  },
  moderationStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  reportCount: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for geospatial queries
communityPostSchema.index({ location: '2dsphere' });
communityPostSchema.index({ author: 1, createdAt: -1 });
communityPostSchema.index({ type: 1, createdAt: -1 });
communityPostSchema.index({ tags: 1 });

const eventSchema = new mongoose.Schema({
  organizer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    maxlength: 2000
  },
  eventDate: {
    type: Date,
    required: true
  },
  endDate: Date,
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: true
    },
    address: {
      type: String,
      required: true
    },
    city: String,
    country: String
  },
  maxAttendees: {
    type: Number,
    default: 50
  },
  attendees: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    status: {
      type: String,
      enum: ['going', 'maybe', 'not_going'],
      default: 'going'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  category: {
    type: String,
    enum: ['meetup', 'adventure', 'cultural', 'food', 'nightlife', 'workshop', 'other'],
    default: 'meetup'
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  requirements: [String],
  cost: {
    amount: Number,
    currency: {
      type: String,
      default: 'USD'
    }
  },
  images: [String],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

eventSchema.index({ location: '2dsphere' });
eventSchema.index({ eventDate: 1 });
eventSchema.index({ organizer: 1 });

module.exports = {
  CommunityPost: mongoose.model('CommunityPost', communityPostSchema),
  Event: mongoose.model('Event', eventSchema)
};