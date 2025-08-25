# Travio API Documentation

## Base URL
```
Development: http://localhost:3000/api
Production: https://api.travio.com/api
```

## Authentication

All protected endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

## Response Format

All API responses follow this format:
```json
{
  "success": boolean,
  "message": string,
  "data": object | array,
  "errors": array (optional)
}
```

## Authentication Endpoints

### POST /auth/register
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe",
  "age": 25,
  "gender": "male",
  "nationality": "US"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "token": "jwt_token_here",
    "user": {
      "_id": "user_id",
      "email": "user@example.com",
      "name": "John Doe",
      "isVerified": false,
      "trustScore": 0
    }
  }
}
```

### POST /auth/login
Login with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

### POST /auth/google
Login with Google OAuth.

**Request Body:**
```json
{
  "googleToken": "google_oauth_token",
  "email": "user@example.com",
  "name": "John Doe",
  "picture": "profile_picture_url"
}
```

### POST /auth/facebook
Login with Facebook OAuth.

### GET /auth/me
Get current user profile (requires authentication).

### POST /auth/refresh-token
Refresh JWT token (requires authentication).

### POST /auth/logout
Logout user (requires authentication).

## User Endpoints

### GET /users/profile/:userId
Get user profile by ID.

### PUT /users/profile
Update current user profile (requires authentication).

**Request Body:**
```json
{
  "name": "Updated Name",
  "bio": "Travel enthusiast",
  "travelInterests": ["adventure", "culture", "food"],
  "travelStyle": "budget",
  "languages": ["English", "Spanish"]
}
```

### POST /users/verify
Submit identity verification documents (requires authentication).

**Request Body:**
```json
{
  "verificationType": "government-id",
  "documents": ["document_url_1", "document_url_2"]
}
```

### PUT /users/location
Update user location (requires authentication).

**Request Body:**
```json
{
  "coordinates": [-74.006, 40.7128],
  "address": "New York, NY, USA"
}
```

### GET /users/nearby
Find nearby users (requires authentication).

**Query Parameters:**
- `radius`: Search radius in meters (default: 50000)
- `limit`: Number of results (default: 20)

### POST /users/emergency-contacts
Add emergency contact (requires authentication).

**Request Body:**
```json
{
  "name": "Emergency Contact",
  "phone": "+1234567890",
  "relationship": "Family",
  "email": "contact@example.com"
}
```

## Trip Endpoints

### GET /trips
Get trips with filtering and pagination.

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `destination`: Filter by destination
- `startDate`: Filter by start date (ISO format)
- `endDate`: Filter by end date (ISO format)
- `interests`: Filter by interests (comma-separated)
- `budget`: Filter by budget range
- `travelStyle`: Filter by travel style

### POST /trips
Create a new trip (requires authentication).

**Request Body:**
```json
{
  "title": "Amazing Europe Trip",
  "description": "Exploring the best of Europe",
  "destination": {
    "city": "Paris",
    "country": "France",
    "coordinates": [2.3522, 48.8566]
  },
  "startDate": "2024-06-01T00:00:00Z",
  "endDate": "2024-06-15T00:00:00Z",
  "travelMode": "flight",
  "budget": {
    "estimated": 3000,
    "currency": "USD"
  },
  "interests": ["culture", "food", "history"],
  "travelStyle": "mid-range",
  "isOpenToPartners": true,
  "maxParticipants": 4,
  "privacy": "public"
}
```

### GET /trips/:tripId
Get trip details by ID.

### PUT /trips/:tripId
Update trip (requires authentication and ownership).

### DELETE /trips/:tripId
Delete trip (requires authentication and ownership).

### POST /trips/:tripId/join
Request to join a trip (requires authentication).

### PUT /trips/:tripId/participants/:userId
Update participant status (requires authentication and trip ownership).

**Request Body:**
```json
{
  "status": "accepted" // or "declined"
}
```

### POST /trips/:tripId/like
Like/unlike a trip (requires authentication).

### POST /trips/:tripId/save
Save/unsave a trip (requires authentication).

### POST /trips/:tripId/comment
Add comment to trip (requires authentication).

**Request Body:**
```json
{
  "comment": "This looks amazing!"
}
```

### GET /trips/my-trips
Get current user's trips (requires authentication).

### GET /trips/saved
Get current user's saved trips (requires authentication).

## Matching Endpoints

### GET /matches/suggestions
Get trip matching suggestions (requires authentication).

**Query Parameters:**
- `limit`: Number of suggestions (default: 20)
- `minCompatibility`: Minimum compatibility score (default: 50)

### POST /matches/calculate
Calculate compatibility between user and trip (requires authentication).

**Request Body:**
```json
{
  "tripId": "trip_id_here"
}
```

### GET /matches/history
Get user's matching history (requires authentication).

## Community Endpoints

### GET /community/posts
Get community posts with pagination.

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `type`: Filter by post type (story, question, tip)

### POST /community/posts
Create a community post (requires authentication).

**Request Body:**
```json
{
  "type": "story",
  "title": "Amazing Adventure in Bali",
  "content": "Just returned from an incredible trip...",
  "images": ["image_url_1", "image_url_2"],
  "tags": ["bali", "adventure", "solo-travel"]
}
```

### GET /community/posts/:postId
Get post details by ID.

### POST /community/posts/:postId/like
Like/unlike a post (requires authentication).

### POST /community/posts/:postId/comment
Comment on a post (requires authentication).

### GET /community/events
Get community events.

### POST /community/events
Create a community event (requires authentication).

## Emergency Endpoints

### POST /emergency/sos
Trigger emergency SOS (requires authentication).

**Request Body:**
```json
{
  "emergencyType": "medical", // or "safety", "accident"
  "location": {
    "coordinates": [-74.006, 40.7128],
    "address": "Current location"
  },
  "message": "Need immediate help"
}
```

### POST /emergency/check-in
Send check-in signal (requires authentication).

**Request Body:**
```json
{
  "status": "safe",
  "location": {
    "coordinates": [-74.006, 40.7128],
    "address": "Current location"
  },
  "message": "All good, enjoying the trip!"
}
```

### GET /emergency/contacts
Get emergency contacts for current location (requires authentication).

## Essentials Endpoints

### GET /essentials/nearby
Get nearby essential services.

**Query Parameters:**
- `lat`: Latitude
- `lng`: Longitude
- `type`: Service type (hotel, restaurant, hospital, atm, gas_station)
- `radius`: Search radius in meters (default: 5000)
- `limit`: Number of results (default: 20)

### GET /essentials/hotels
Search for hotels.

**Query Parameters:**
- `destination`: Destination city/country
- `checkIn`: Check-in date (ISO format)
- `checkOut`: Check-out date (ISO format)
- `guests`: Number of guests
- `budget`: Budget range

### GET /essentials/restaurants
Search for restaurants.

**Query Parameters:**
- `lat`: Latitude
- `lng`: Longitude
- `cuisine`: Cuisine type
- `priceRange`: Price range (1-4)
- `rating`: Minimum rating

## File Upload Endpoints

### POST /upload/image
Upload an image file (requires authentication).

**Request:** Multipart form data with 'image' field

**Response:**
```json
{
  "success": true,
  "data": {
    "url": "https://storage.example.com/image.jpg",
    "filename": "image.jpg",
    "size": 1024000
  }
}
```

### POST /upload/document
Upload a document (requires authentication).

## WebSocket Events

### Connection
Connect to WebSocket server:
```javascript
const socket = io('http://localhost:3000', {
  auth: {
    token: 'your_jwt_token'
  }
});
```

### Events

#### join-user-room
Join user's personal room for notifications:
```javascript
socket.emit('join-user-room', userId);
```

#### send-message
Send a chat message:
```javascript
socket.emit('send-message', {
  recipientId: 'recipient_user_id',
  message: 'Hello!',
  senderId: 'sender_user_id'
});
```

#### receive-message
Receive a chat message:
```javascript
socket.on('receive-message', (data) => {
  console.log('New message:', data);
});
```

#### emergency-sos
Trigger emergency SOS:
```javascript
socket.emit('emergency-sos', {
  userId: 'user_id',
  location: { lat: 40.7128, lng: -74.0060 },
  emergencyType: 'medical'
});
```

#### emergency-alert
Receive emergency alert:
```javascript
socket.on('emergency-alert', (data) => {
  console.log('Emergency alert:', data);
});
```

#### share-location
Share location with trusted contacts:
```javascript
socket.emit('share-location', {
  userId: 'user_id',
  location: { lat: 40.7128, lng: -74.0060 },
  trustedContacts: ['contact1_id', 'contact2_id']
});
```

#### location-update
Receive location update:
```javascript
socket.on('location-update', (data) => {
  console.log('Location update:', data);
});
```

## Error Codes

| Code | Message | Description |
|------|---------|-------------|
| 400 | Bad Request | Invalid request data |
| 401 | Unauthorized | Authentication required |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Resource already exists |
| 422 | Validation Error | Request validation failed |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |

## Rate Limiting

API endpoints are rate limited:
- Authentication endpoints: 5 requests per minute
- General endpoints: 100 requests per 15 minutes
- Upload endpoints: 10 requests per minute
- Emergency endpoints: No limit

## Pagination

Paginated endpoints return:
```json
{
  "success": true,
  "data": {
    "items": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "pages": 5,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```