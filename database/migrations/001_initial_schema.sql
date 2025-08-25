-- Travio Database Initial Schema
-- This file contains the initial database schema for MongoDB collections
-- Note: MongoDB is schema-less, but this serves as documentation

-- Users Collection Schema
-- Collection: users
/*
{
  "_id": ObjectId,
  "email": String (unique, required),
  "password": String (hashed, required),
  "profile": {
    "firstName": String (required),
    "lastName": String (required),
    "phone": String,
    "dateOfBirth": Date,
    "nationality": String,
    "gender": String (enum: ['male', 'female', 'other', 'prefer_not_to_say']),
    "profilePicture": String (URL),
    "bio": String,
    "languages": [String],
    "occupation": String,
    "location": {
      "city": String,
      "country": String,
      "coordinates": {
        "type": "Point",
        "coordinates": [Number, Number] // [longitude, latitude]
      }
    }
  },
  "preferences": {
    "travelStyle": String (enum: ['budget', 'mid-range', 'luxury', 'backpacker']),
    "interests": [String],
    "budgetRange": {
      "min": Number,
      "max": Number,
      "currency": String (default: 'USD')
    },
    "accommodationType": [String],
    "transportModes": [String],
    "dietaryRestrictions": [String],
    "accessibility": [String]
  },
  "verification": {
    "email": {
      "isVerified": Boolean (default: false),
      "token": String,
      "expiresAt": Date,
      "verifiedAt": Date
    },
    "phone": {
      "isVerified": Boolean (default: false),
      "token": String,
      "expiresAt": Date,
      "verifiedAt": Date
    },
    "identity": {
      "isVerified": Boolean (default: false),
      "documentType": String (enum: ['passport', 'driving_license', 'national_id']),
      "documentUrl": String,
      "status": String (enum: ['pending', 'approved', 'rejected']),
      "uploadedAt": Date,
      "verifiedAt": Date
    },
    "passwordReset": {
      "token": String,
      "expiresAt": Date
    }
  },
  "socialLogins": {
    "google": {
      "id": String,
      "accessToken": String,
      "lastLogin": Date
    },
    "facebook": {
      "id": String,
      "accessToken": String,
      "lastLogin": Date
    }
  },
  "settings": {
    "notifications": {
      "email": Boolean (default: true),
      "push": Boolean (default: true),
      "sms": Boolean (default: false),
      "matchRequests": Boolean (default: true),
      "tripUpdates": Boolean (default: true),
      "communityActivity": Boolean (default: true),
      "emergencyAlerts": Boolean (default: true)
    },
    "privacy": {
      "profileVisibility": String (enum: ['public', 'friends', 'private'], default: 'public'),
      "locationSharing": Boolean (default: true),
      "showOnlineStatus": Boolean (default: true),
      "allowMessages": String (enum: ['everyone', 'friends', 'none'], default: 'everyone')
    }
  },
  "stats": {
    "tripsCreated": Number (default: 0),
    "tripsJoined": Number (default: 0),
    "matchesAccepted": Number (default: 0),
    "reviewsReceived": Number (default: 0),
    "averageRating": Number (default: 0),
    "countriesVisited": [String],
    "totalDistance": Number (default: 0)
  },
  "emergencyContacts": [{
    "name": String,
    "relationship": String,
    "phone": String,
    "email": String,
    "isPrimary": Boolean (default: false)
  }],
  "isActive": Boolean (default: true),
  "lastLogin": Date,
  "createdAt": Date,
  "updatedAt": Date
}
*/

-- Trips Collection Schema
-- Collection: trips
/*
{
  "_id": ObjectId,
  "creator": ObjectId (ref: 'User', required),
  "title": String (required),
  "description": String (required),
  "destination": {
    "city": String (required),
    "country": String (required),
    "region": String,
    "coordinates": {
      "type": "Point",
      "coordinates": [Number, Number] // [longitude, latitude]
    },
    "placeId": String // Google Places ID
  },
  "dates": {
    "start": Date (required),
    "end": Date (required),
    "flexible": Boolean (default: false),
    "flexibilityDays": Number (default: 0)
  },
  "budget": {
    "amount": Number (required),
    "currency": String (default: 'USD'),
    "breakdown": {
      "accommodation": Number,
      "transport": Number,
      "food": Number,
      "activities": Number,
      "other": Number
    },
    "perPerson": Boolean (default: true)
  },
  "travelMode": String (enum: ['flight', 'car', 'train', 'bus', 'bike', 'mixed'], required),
  "interests": [String] (required),
  "itinerary": [{
    "day": Number,
    "date": Date,
    "activities": [{
      "time": String,
      "activity": String,
      "location": {
        "name": String,
        "coordinates": [Number, Number],
        "placeId": String
      },
      "duration": Number, // in minutes
      "cost": Number,
      "notes": String
    }]
  }],
  "participants": [{
    "user": ObjectId (ref: 'User'),
    "status": String (enum: ['pending', 'confirmed', 'declined'], default: 'pending'),
    "joinedAt": Date,
    "role": String (enum: ['creator', 'participant'], default: 'participant')
  }],
  "openToPartners": Boolean (default: true),
  "maxParticipants": Number (default: 4),
  "currentParticipants": Number (default: 1),
  "privacy": String (enum: ['public', 'friends', 'private'], default: 'public'),
  "requirements": [String],
  "tags": [String],
  "images": [String], // URLs
  "documents": [{
    "name": String,
    "url": String,
    "type": String,
    "uploadedBy": ObjectId (ref: 'User'),
    "uploadedAt": Date
  }],
  "safetyInfo": {
    "riskLevel": String (enum: ['low', 'medium', 'high']),
    "safetyScore": Number (0-100),
    "warnings": [String],
    "emergencyContacts": [{
      "type": String,
      "name": String,
      "phone": String,
      "location": String
    }]
  },
  "status": String (enum: ['draft', 'published', 'active', 'completed', 'cancelled'], default: 'draft'),
  "isActive": Boolean (default: true),
  "createdAt": Date,
  "updatedAt": Date
}
*/

-- Matches Collection Schema
-- Collection: matches
/*
{
  "_id": ObjectId,
  "requester": ObjectId (ref: 'User', required),
  "recipient": ObjectId (ref: 'User', required),
  "trip": ObjectId (ref: 'Trip', required),
  "status": String (enum: ['pending', 'accepted', 'rejected', 'cancelled'], default: 'pending'),
  "compatibilityScore": Number (0-100, required),
  "matchFactors": {
    "destinationMatch": Number (0-100),
    "dateOverlap": Number (0-100),
    "interestSimilarity": Number (0-100),
    "budgetCompatibility": Number (0-100),
    "travelStyleMatch": Number (0-100),
    "languageMatch": Number (0-100)
  },
  "message": String,
  "responseMessage": String,
  "chatRoom": ObjectId (ref: 'ChatRoom'),
  "respondedAt": Date,
  "expiresAt": Date (default: 7 days from creation),
  "isActive": Boolean (default: true),
  "createdAt": Date,
  "updatedAt": Date
}
*/

-- ChatRooms Collection Schema
-- Collection: chatrooms
/*
{
  "_id": ObjectId,
  "participants": [ObjectId] (ref: 'User', required),
  "trip": ObjectId (ref: 'Trip'),
  "match": ObjectId (ref: 'Match'),
  "lastMessage": {
    "content": String,
    "sender": ObjectId (ref: 'User'),
    "timestamp": Date
  },
  "unreadCount": Map, // userId -> count
  "isActive": Boolean (default: true),
  "createdAt": Date,
  "updatedAt": Date
}
*/

-- Messages Collection Schema
-- Collection: messages
/*
{
  "_id": ObjectId,
  "chatRoom": ObjectId (ref: 'ChatRoom', required),
  "sender": ObjectId (ref: 'User', required),
  "content": String (required),
  "messageType": String (enum: ['text', 'image', 'location', 'system'], default: 'text'),
  "attachments": [{
    "type": String,
    "url": String,
    "filename": String
  }],
  "location": {
    "type": "Point",
    "coordinates": [Number, Number],
    "address": String
  },
  "readBy": [{
    "user": ObjectId (ref: 'User'),
    "readAt": Date
  }],
  "isEdited": Boolean (default: false),
  "editedAt": Date,
  "isDeleted": Boolean (default: false),
  "createdAt": Date,
  "updatedAt": Date
}
*/

-- Community Posts Collection Schema
-- Collection: communityposts
/*
{
  "_id": ObjectId,
  "author": ObjectId (ref: 'User', required),
  "title": String (required),
  "content": String (required),
  "type": String (enum: ['story', 'question', 'tip', 'meetup', 'event'], default: 'story'),
  "images": [{
    "url": String,
    "caption": String
  }],
  "location": {
    "type": "Point",
    "coordinates": [Number, Number],
    "address": String,
    "city": String,
    "country": String
  },
  "tags": [String],
  "likes": [{
    "user": ObjectId (ref: 'User'),
    "createdAt": Date
  }],
  "comments": [{
    "user": ObjectId (ref: 'User'),
    "content": String,
    "createdAt": Date
  }],
  "isModerated": Boolean (default: false),
  "moderationStatus": String (enum: ['pending', 'approved', 'rejected'], default: 'pending'),
  "reportCount": Number (default: 0),
  "isActive": Boolean (default: true),
  "createdAt": Date,
  "updatedAt": Date
}
*/

-- Events Collection Schema
-- Collection: events
/*
{
  "_id": ObjectId,
  "organizer": ObjectId (ref: 'User', required),
  "title": String (required),
  "description": String (required),
  "eventDate": Date (required),
  "endDate": Date,
  "location": {
    "type": "Point",
    "coordinates": [Number, Number] (required),
    "address": String (required),
    "city": String,
    "country": String
  },
  "maxAttendees": Number (default: 50),
  "attendees": [{
    "user": ObjectId (ref: 'User'),
    "status": String (enum: ['going', 'maybe', 'not_going'], default: 'going'),
    "joinedAt": Date
  }],
  "category": String (enum: ['meetup', 'adventure', 'cultural', 'food', 'nightlife', 'workshop', 'other'], default: 'meetup'),
  "isPublic": Boolean (default: true),
  "requirements": [String],
  "cost": {
    "amount": Number,
    "currency": String (default: 'USD')
  },
  "images": [String],
  "isActive": Boolean (default: true),
  "createdAt": Date,
  "updatedAt": Date
}
*/

-- Indexes for Performance
-- Note: These would be created programmatically in MongoDB

-- Users Collection Indexes
/*
db.users.createIndex({ "email": 1 }, { unique: true })
db.users.createIndex({ "profile.phone": 1 }, { sparse: true })
db.users.createIndex({ "profile.location.coordinates": "2dsphere" })
db.users.createIndex({ "verification.email.token": 1 }, { sparse: true })
db.users.createIndex({ "verification.passwordReset.token": 1 }, { sparse: true })
db.users.createIndex({ "isActive": 1, "createdAt": -1 })
*/

-- Trips Collection Indexes
/*
db.trips.createIndex({ "creator": 1, "status": 1 })
db.trips.createIndex({ "destination.coordinates": "2dsphere" })
db.trips.createIndex({ "dates.start": 1, "dates.end": 1 })
db.trips.createIndex({ "openToPartners": 1, "isActive": 1 })
db.trips.createIndex({ "interests": 1 })
db.trips.createIndex({ "tags": 1 })
db.trips.createIndex({ "status": 1, "createdAt": -1 })
*/

-- Matches Collection Indexes
/*
db.matches.createIndex({ "requester": 1, "status": 1 })
db.matches.createIndex({ "recipient": 1, "status": 1 })
db.matches.createIndex({ "trip": 1, "status": 1 })
db.matches.createIndex({ "compatibilityScore": -1 })
db.matches.createIndex({ "expiresAt": 1 }, { expireAfterSeconds: 0 })
db.matches.createIndex({ "requester": 1, "recipient": 1, "trip": 1 }, { unique: true })
*/

-- ChatRooms Collection Indexes
/*
db.chatrooms.createIndex({ "participants": 1 })
db.chatrooms.createIndex({ "trip": 1 })
db.chatrooms.createIndex({ "match": 1 })
db.chatrooms.createIndex({ "isActive": 1, "updatedAt": -1 })
*/

-- Messages Collection Indexes
/*
db.messages.createIndex({ "chatRoom": 1, "createdAt": -1 })
db.messages.createIndex({ "sender": 1 })
db.messages.createIndex({ "isDeleted": 1 })
*/

-- Community Posts Collection Indexes
/*
db.communityposts.createIndex({ "author": 1, "createdAt": -1 })
db.communityposts.createIndex({ "type": 1, "createdAt": -1 })
db.communityposts.createIndex({ "tags": 1 })
db.communityposts.createIndex({ "location": "2dsphere" })
db.communityposts.createIndex({ "isActive": 1, "moderationStatus": 1 })
*/

-- Events Collection Indexes
/*
db.events.createIndex({ "organizer": 1 })
db.events.createIndex({ "eventDate": 1 })
db.events.createIndex({ "location": "2dsphere" })
db.events.createIndex({ "category": 1, "eventDate": 1 })
db.events.createIndex({ "isActive": 1, "isPublic": 1 })
*/