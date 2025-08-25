const mongoose = require('mongoose');

const tripSchema = new mongoose.Schema({
  // Basic Trip Information
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    maxlength: 1000
  },
  
  // Creator Information
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Destination Information
  destination: {
    city: {
      type: String,
      required: true,
      trim: true
    },
    country: {
      type: String,
      required: true,
      trim: true
    },
    region: String,
    coordinates: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true
      }
    },
    address: String
  },
  
  // Trip Dates
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  duration: {
    type: Number, // in days
    required: true
  },
  
  // Travel Details
  travelMode: {
    type: String,
    enum: ['car', 'bike', 'flight', 'train', 'bus', 'mixed'],
    required: true
  },
  budget: {
    estimated: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      default: 'USD'
    },
    breakdown: {
      accommodation: Number,
      transportation: Number,
      food: Number,
      activities: Number,
      miscellaneous: Number
    }
  },
  
  // Trip Preferences
  interests: [{
    type: String,
    enum: [
      'adventure', 'culture', 'food', 'road-trips', 'backpacking',
      'luxury', 'nightlife', 'nature', 'photography', 'history',
      'sports', 'wellness', 'business', 'shopping', 'festivals'
    ]
  }],
  travelStyle: {
    type: String,
    enum: ['budget', 'mid-range', 'luxury', 'backpacking', 'business'],
    required: true
  },
  
  // Group Settings
  isOpenToPartners: {
    type: Boolean,
    default: true
  },
  maxParticipants: {
    type: Number,
    default: 4,
    min: 1,
    max: 20
  },
  currentParticipants: {
    type: Number,
    default: 1
  },
  participants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined', 'left'],
      default: 'pending'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    role: {
      type: String,
      enum: ['creator', 'co-organizer', 'participant'],
      default: 'participant'
    }
  }],
  
  // Privacy & Visibility
  privacy: {
    type: String,
    enum: ['public', 'friends-only', 'invite-only', 'private'],
    default: 'public'
  },
  
  // Itinerary
  itinerary: [{
    day: {
      type: Number,
      required: true
    },
    date: Date,
    activities: [{
      time: String,
      activity: {
        type: String,
        required: true
      },
      location: {
        name: String,
        coordinates: [Number],
        address: String
      },
      estimatedCost: Number,
      notes: String
    }],
    accommodation: {
      name: String,
      type: {
        type: String,
        enum: ['hotel', 'hostel', 'airbnb', 'camping', 'other']
      },
      location: {
        coordinates: [Number],
        address: String
      },
      cost: Number,
      bookingUrl: String
    }
  }],
  
  // AI Enhancements
  aiSuggestions: {
    recommendedActivities: [String],
    budgetOptimization: String,
    safetyScore: {
      type: Number,
      min: 0,
      max: 100
    },
    weatherAlerts: [String],
    localTips: [String]
  },
  
  // Status & Tracking
  status: {
    type: String,
    enum: ['planning', 'confirmed', 'in-progress', 'completed', 'cancelled'],
    default: 'planning'
  },
  
  // Engagement & Social
  likes: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    likedAt: {
      type: Date,
      default: Date.now
    }
  }],
  saves: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    savedAt: {
      type: Date,
      default: Date.now
    }
  }],
  views: {
    type: Number,
    default: 0
  },
  
  // Comments & Reviews
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    comment: {
      type: String,
      required: true,
      maxlength: 500
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Trip Completion & Reviews
  completionData: {
    actualCost: Number,
    actualDuration: Number,
    highlights: [String],
    challenges: [String],
    wouldRecommend: Boolean,
    photos: [String] // URLs to trip photos
  },
  
  // Safety & Emergency
  emergencyInfo: {
    localEmergencyNumbers: {
      police: String,
      medical: String,
      fire: String
    },
    nearestHospital: {
      name: String,
      coordinates: [Number],
      phone: String
    },
    riskFactors: [String],
    safetyTips: [String]
  },
  
  // Matching Algorithm Data
  matchingData: {
    compatibility: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      score: {
        type: Number,
        min: 0,
        max: 100
      },
      factors: {
        dateOverlap: Number,
        interestMatch: Number,
        budgetCompatibility: Number,
        travelStyleMatch: Number,
        locationProximity: Number
      },
      calculatedAt: {
        type: Date,
        default: Date.now
      }
    }]
  },
  
  // Attachments
  attachments: [{
    type: {
      type: String,
      enum: ['image', 'document', 'pdf', 'link']
    },
    url: String,
    name: String,
    description: String,
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Sponsored Content
  sponsoredContent: [{
    type: {
      type: String,
      enum: ['hotel', 'restaurant', 'activity', 'transport']
    },
    name: String,
    description: String,
    url: String,
    imageUrl: String,
    price: Number,
    rating: Number,
    sponsored: {
      type: Boolean,
      default: true
    }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
tripSchema.index({ 'destination.coordinates': '2dsphere' });
tripSchema.index({ startDate: 1, endDate: 1 });
tripSchema.index({ creator: 1 });
tripSchema.index({ interests: 1 });
tripSchema.index({ travelStyle: 1 });
tripSchema.index({ status: 1 });
tripSchema.index({ privacy: 1 });
tripSchema.index({ isOpenToPartners: 1 });
tripSchema.index({ createdAt: -1 });

// Virtual for trip duration calculation
tripSchema.virtual('calculatedDuration').get(function() {
  if (this.startDate && this.endDate) {
    return Math.ceil((this.endDate - this.startDate) / (1000 * 60 * 60 * 24));
  }
  return this.duration;
});

// Virtual for days until trip
tripSchema.virtual('daysUntilTrip').get(function() {
  if (this.startDate) {
    const today = new Date();
    const diffTime = this.startDate - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
  return null;
});

// Virtual for trip progress
tripSchema.virtual('progress').get(function() {
  if (this.status === 'completed') return 100;
  if (this.status === 'cancelled') return 0;
  
  const today = new Date();
  if (today < this.startDate) return 0;
  if (today > this.endDate) return 100;
  
  const totalDuration = this.endDate - this.startDate;
  const elapsed = today - this.startDate;
  return Math.round((elapsed / totalDuration) * 100);
});

// Pre-save middleware
tripSchema.pre('save', function(next) {
  // Calculate duration if not provided
  if (this.startDate && this.endDate && !this.duration) {
    this.duration = Math.ceil((this.endDate - this.startDate) / (1000 * 60 * 60 * 24));
  }
  
  // Update current participants count
  this.currentParticipants = this.participants.filter(p => p.status === 'accepted').length + 1; // +1 for creator
  
  next();
});

// Method to check if user can join trip
tripSchema.methods.canUserJoin = function(userId) {
  if (!this.isOpenToPartners) return false;
  if (this.currentParticipants >= this.maxParticipants) return false;
  if (this.creator.toString() === userId.toString()) return false;
  
  const existingParticipant = this.participants.find(p => 
    p.user.toString() === userId.toString() && 
    ['pending', 'accepted'].includes(p.status)
  );
  
  return !existingParticipant;
};

// Method to add participant
tripSchema.methods.addParticipant = function(userId, role = 'participant') {
  if (!this.canUserJoin(userId)) {
    throw new Error('User cannot join this trip');
  }
  
  this.participants.push({
    user: userId,
    status: 'pending',
    role: role
  });
  
  return this.save();
};

// Method to update participant status
tripSchema.methods.updateParticipantStatus = function(userId, status) {
  const participant = this.participants.find(p => p.user.toString() === userId.toString());
  if (!participant) {
    throw new Error('Participant not found');
  }
  
  participant.status = status;
  return this.save();
};

// Method to calculate compatibility with user
tripSchema.methods.calculateCompatibility = function(user) {
  let score = 0;
  const factors = {};
  
  // Date overlap (if user has other trips)
  factors.dateOverlap = 20; // Base score for date availability
  
  // Interest match
  const commonInterests = this.interests.filter(interest => 
    user.travelInterests.includes(interest)
  );
  factors.interestMatch = (commonInterests.length / Math.max(this.interests.length, 1)) * 30;
  
  // Budget compatibility
  const userBudgetMid = (user.budgetRange.min + user.budgetRange.max) / 2;
  const budgetDiff = Math.abs(this.budget.estimated - userBudgetMid);
  const maxBudget = Math.max(this.budget.estimated, userBudgetMid);
  factors.budgetCompatibility = Math.max(0, (1 - budgetDiff / maxBudget)) * 25;
  
  // Travel style match
  factors.travelStyleMatch = (this.travelStyle === user.travelStyle) ? 15 : 0;
  
  // Location proximity (if user has current location)
  factors.locationProximity = 10; // Base score
  
  score = Object.values(factors).reduce((sum, factor) => sum + factor, 0);
  
  return {
    score: Math.round(score),
    factors
  };
};

// Static method to find trips by location
tripSchema.statics.findByLocation = function(coordinates, maxDistance = 100000) {
  return this.find({
    'destination.coordinates': {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: coordinates
        },
        $maxDistance: maxDistance
      }
    },
    status: { $in: ['planning', 'confirmed'] },
    privacy: 'public',
    isOpenToPartners: true
  });
};

// Static method to find trips by date range
tripSchema.statics.findByDateRange = function(startDate, endDate) {
  return this.find({
    $or: [
      {
        startDate: { $gte: startDate, $lte: endDate }
      },
      {
        endDate: { $gte: startDate, $lte: endDate }
      },
      {
        startDate: { $lte: startDate },
        endDate: { $gte: endDate }
      }
    ],
    status: { $in: ['planning', 'confirmed'] },
    privacy: 'public',
    isOpenToPartners: true
  });
};

module.exports = mongoose.model('Trip', tripSchema);