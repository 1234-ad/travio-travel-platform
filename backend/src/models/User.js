const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  // Basic Information
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: function() {
      return !this.socialAuth.google.id && !this.socialAuth.facebook.id;
    },
    minlength: 6
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  age: {
    type: Number,
    min: 18,
    max: 100
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other', 'prefer-not-to-say'],
    default: 'prefer-not-to-say'
  },
  nationality: {
    type: String,
    trim: true
  },
  
  // Profile Information
  profilePicture: {
    type: String,
    default: null
  },
  bio: {
    type: String,
    maxlength: 500
  },
  languages: [{
    type: String,
    trim: true
  }],
  
  // Travel Preferences
  travelInterests: [{
    type: String,
    enum: [
      'adventure', 'culture', 'food', 'road-trips', 'backpacking',
      'luxury', 'nightlife', 'nature', 'photography', 'history',
      'sports', 'wellness', 'business', 'solo', 'group'
    ]
  }],
  travelStyle: {
    type: String,
    enum: ['solo', 'group', 'budget', 'luxury', 'mixed'],
    default: 'mixed'
  },
  budgetRange: {
    min: { type: Number, default: 0 },
    max: { type: Number, default: 10000 }
  },
  
  // Verification & Trust
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationMethod: {
    type: String,
    enum: ['government-id', 'passport', 'social-verification', 'face-match'],
    default: null
  },
  verificationDocuments: [{
    type: String, // URLs to uploaded documents
  }],
  trustScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  
  // Social Authentication
  socialAuth: {
    google: {
      id: String,
      email: String
    },
    facebook: {
      id: String,
      email: String
    },
    linkedin: {
      id: String,
      email: String
    }
  },
  
  // Location & Emergency
  currentLocation: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      default: [0, 0]
    },
    address: String,
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  emergencyContacts: [{
    name: {
      type: String,
      required: true
    },
    phone: {
      type: String,
      required: true
    },
    relationship: {
      type: String,
      required: true
    },
    email: String
  }],
  
  // Privacy Settings
  privacy: {
    showAge: { type: Boolean, default: true },
    showGender: { type: Boolean, default: true },
    showLocation: { type: Boolean, default: true },
    allowMessages: { type: Boolean, default: true },
    shareLocationWithMatches: { type: Boolean, default: false }
  },
  
  // Activity & Engagement
  lastActive: {
    type: Date,
    default: Date.now
  },
  totalTrips: {
    type: Number,
    default: 0
  },
  completedTrips: {
    type: Number,
    default: 0
  },
  reviews: [{
    reviewerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    comment: String,
    tripId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trip'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  
  // AI & Personalization
  aiPreferences: {
    personalityType: String,
    riskTolerance: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    },
    preferredActivities: [String],
    avoidedActivities: [String]
  },
  
  // Account Status
  isActive: {
    type: Boolean,
    default: true
  },
  isSuspended: {
    type: Boolean,
    default: false
  },
  suspensionReason: String,
  
  // Notifications
  notificationSettings: {
    email: { type: Boolean, default: true },
    push: { type: Boolean, default: true },
    sms: { type: Boolean, default: false },
    matchNotifications: { type: Boolean, default: true },
    tripUpdates: { type: Boolean, default: true },
    communityUpdates: { type: Boolean, default: true },
    emergencyAlerts: { type: Boolean, default: true }
  },
  
  // Device Information
  devices: [{
    deviceId: String,
    platform: {
      type: String,
      enum: ['ios', 'android', 'web']
    },
    fcmToken: String,
    lastUsed: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ 'currentLocation.coordinates': '2dsphere' });
userSchema.index({ travelInterests: 1 });
userSchema.index({ isVerified: 1 });
userSchema.index({ lastActive: -1 });

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return this.name;
});

// Virtual for age calculation
userSchema.virtual('calculatedAge').get(function() {
  if (this.dateOfBirth) {
    return Math.floor((Date.now() - this.dateOfBirth) / (365.25 * 24 * 60 * 60 * 1000));
  }
  return this.age;
});

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to update trust score
userSchema.methods.updateTrustScore = function() {
  let score = 0;
  
  // Base score for verification
  if (this.isVerified) score += 30;
  
  // Score based on completed trips
  score += Math.min(this.completedTrips * 5, 25);
  
  // Score based on reviews
  if (this.reviews.length > 0) {
    score += Math.min(this.reviews.length * 2, 20);
    score += this.averageRating * 5;
  }
  
  // Score based on profile completeness
  let profileCompleteness = 0;
  if (this.profilePicture) profileCompleteness += 5;
  if (this.bio) profileCompleteness += 5;
  if (this.languages.length > 0) profileCompleteness += 5;
  if (this.travelInterests.length > 0) profileCompleteness += 5;
  if (this.emergencyContacts.length > 0) profileCompleteness += 5;
  
  score += profileCompleteness;
  
  this.trustScore = Math.min(score, 100);
  return this.trustScore;
};

// Method to get public profile
userSchema.methods.getPublicProfile = function() {
  const user = this.toObject();
  
  // Remove sensitive information
  delete user.password;
  delete user.socialAuth;
  delete user.emergencyContacts;
  delete user.devices;
  delete user.notificationSettings;
  
  // Apply privacy settings
  if (!user.privacy.showAge) delete user.age;
  if (!user.privacy.showGender) delete user.gender;
  if (!user.privacy.showLocation) delete user.currentLocation;
  
  return user;
};

// Static method to find nearby users
userSchema.statics.findNearby = function(coordinates, maxDistance = 50000) {
  return this.find({
    'currentLocation.coordinates': {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: coordinates
        },
        $maxDistance: maxDistance
      }
    },
    isActive: true,
    'privacy.showLocation': true
  });
};

module.exports = mongoose.model('User', userSchema);