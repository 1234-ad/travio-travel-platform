const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss');
const { createServer } = require('http');
const { Server } = require('socket.io');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const tripRoutes = require('./routes/trips');
const matchRoutes = require('./routes/matches');
const communityRoutes = require('./routes/community');
const emergencyRoutes = require('./routes/emergency');
const essentialsRoutes = require('./routes/essentials');

// Import middleware
const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');

// Load environment variables
require('dotenv').config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Security middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(mongoSanitize());

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Database connection
mongoose.connect(process.env.DATABASE_URL || 'mongodb://localhost:27017/travio', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  logger.info('Connected to MongoDB');
})
.catch((error) => {
  logger.error('MongoDB connection error:', error);
  process.exit(1);
});

// Socket.io for real-time features
io.on('connection', (socket) => {
  logger.info('User connected:', socket.id);

  // Join user to their personal room
  socket.on('join-user-room', (userId) => {
    socket.join(`user-${userId}`);
    logger.info(`User ${userId} joined their room`);
  });

  // Handle chat messages
  socket.on('send-message', (data) => {
    const { recipientId, message, senderId } = data;
    io.to(`user-${recipientId}`).emit('receive-message', {
      message,
      senderId,
      timestamp: new Date()
    });
  });

  // Handle emergency SOS
  socket.on('emergency-sos', (data) => {
    const { userId, location, emergencyType } = data;
    // Broadcast to emergency services and trusted contacts
    io.emit('emergency-alert', {
      userId,
      location,
      emergencyType,
      timestamp: new Date()
    });
    logger.warn(`Emergency SOS triggered by user ${userId}`);
  });

  // Handle location sharing
  socket.on('share-location', (data) => {
    const { userId, location, trustedContacts } = data;
    trustedContacts.forEach(contactId => {
      io.to(`user-${contactId}`).emit('location-update', {
        userId,
        location,
        timestamp: new Date()
      });
    });
  });

  socket.on('disconnect', () => {
    logger.info('User disconnected:', socket.id);
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/emergency', emergencyRoutes);
app.use('/api/essentials', essentialsRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API documentation endpoint
app.get('/api', (req, res) => {
  res.json({
    message: 'Travio API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      trips: '/api/trips',
      matches: '/api/matches',
      community: '/api/community',
      emergency: '/api/emergency',
      essentials: '/api/essentials'
    }
  });
});

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  logger.info(`Travio API server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    mongoose.connection.close();
    process.exit(0);
  });
});

module.exports = app;