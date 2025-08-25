const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');

const auth = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.header('Authorization');
    
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'No token provided, authorization denied'
      });
    }

    // Check if token starts with 'Bearer '
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token format'
      });
    }

    // Extract token
    const token = authHeader.substring(7);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided, authorization denied'
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Check if user still exists
      const user = await User.findById(decoded.userId).select('-password');
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Token is valid but user no longer exists'
        });
      }

      // Check if user is active
      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'User account is deactivated'
        });
      }

      // Check if user is suspended
      if (user.isSuspended) {
        return res.status(403).json({
          success: false,
          message: 'User account is suspended',
          reason: user.suspensionReason
        });
      }

      // Add user to request object
      req.user = decoded;
      req.userDoc = user;
      
      next();
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token has expired'
        });
      } else if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Invalid token'
        });
      } else {
        throw jwtError;
      }
    }
  } catch (error) {
    logger.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error in authentication'
    });
  }
};

// Optional auth middleware - doesn't fail if no token
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);
    
    if (!token) {
      return next();
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select('-password');
      
      if (user && user.isActive && !user.isSuspended) {
        req.user = decoded;
        req.userDoc = user;
      }
    } catch (jwtError) {
      // Silently fail for optional auth
      logger.debug('Optional auth failed:', jwtError.message);
    }
    
    next();
  } catch (error) {
    logger.error('Optional auth middleware error:', error);
    next(); // Continue even if there's an error
  }
};

// Admin auth middleware
const adminAuth = async (req, res, next) => {
  try {
    // First run regular auth
    await new Promise((resolve, reject) => {
      auth(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Check if user is admin
    const user = await User.findById(req.user.userId);
    
    if (!user || user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    next();
  } catch (error) {
    logger.error('Admin auth middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error in admin authentication'
    });
  }
};

// Verified user middleware
const verifiedAuth = async (req, res, next) => {
  try {
    // First run regular auth
    await new Promise((resolve, reject) => {
      auth(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Check if user is verified
    if (!req.userDoc.isVerified) {
      return res.status(403).json({
        success: false,
        message: 'Account verification required for this action'
      });
    }

    next();
  } catch (error) {
    logger.error('Verified auth middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error in verification check'
    });
  }
};

// Rate limiting for sensitive operations
const sensitiveAuth = async (req, res, next) => {
  try {
    // First run regular auth
    await new Promise((resolve, reject) => {
      auth(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Additional checks for sensitive operations
    const user = req.userDoc;
    
    // Check if account was recently created (prevent abuse)
    const accountAge = Date.now() - user.createdAt.getTime();
    const minAccountAge = 24 * 60 * 60 * 1000; // 24 hours
    
    if (accountAge < minAccountAge) {
      return res.status(403).json({
        success: false,
        message: 'Account must be at least 24 hours old for this action'
      });
    }

    // Check trust score for sensitive operations
    if (user.trustScore < 20) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient trust score for this action'
      });
    }

    next();
  } catch (error) {
    logger.error('Sensitive auth middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error in sensitive operation check'
    });
  }
};

module.exports = {
  auth,
  optionalAuth,
  adminAuth,
  verifiedAuth,
  sensitiveAuth
};