const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const logger = require('../utils/logger');

const router = express.Router();

// Community Post Model (can be stored in separate collection or embedded)
const CommunityPost = {
  id: String,
  author: { type: String, ref: 'User' },
  type: String, // 'story', 'question', 'tip', 'meetup', 'event'
  title: String,
  content: String,
  images: [String],
  location: {
    name: String,
    coordinates: [Number]
  },
  tags: [String],
  likes: [{ type: String, ref: 'User' }],
  comments: [{
    id: String,
    author: { type: String, ref: 'User' },
    content: String,
    createdAt: Date,
    likes: [{ type: String, ref: 'User' }]
  }],
  shares: Number,
  isPublic: Boolean,
  createdAt: Date,
  updatedAt: Date
};

// In-memory storage for demo (should use MongoDB collection in production)
let communityPosts = [];
let postIdCounter = 1;

// @route   POST /api/community/posts
// @desc    Create a new community post
// @access  Private
router.post('/posts', [
  auth,
  upload.array('images', 5),
  body('type').isIn(['story', 'question', 'tip', 'meetup', 'event']).withMessage('Invalid post type'),
  body('title').notEmpty().withMessage('Title is required'),
  body('content').notEmpty().withMessage('Content is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { type, title, content, location, tags, isPublic = true } = req.body;
    
    const user = await User.findById(req.user.id).select('name profilePicture verificationStatus');

    const newPost = {
      id: (postIdCounter++).toString(),
      author: {
        _id: req.user.id,
        name: user.name,
        profilePicture: user.profilePicture,
        verificationStatus: user.verificationStatus
      },
      type,
      title,
      content,
      images: req.files ? req.files.map(file => file.path) : [],
      location: location ? JSON.parse(location) : null,
      tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
      likes: [],
      comments: [],
      shares: 0,
      isPublic,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    communityPosts.push(newPost);

    res.status(201).json({
      success: true,
      data: newPost,
      message: 'Post created successfully'
    });
  } catch (error) {
    logger.error('Create post error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/community/posts
// @desc    Get community posts with filters
// @access  Private
router.get('/posts', auth, async (req, res) => {
  try {
    const { 
      type, 
      location, 
      tags, 
      author,
      page = 1, 
      limit = 10,
      sort = 'recent' 
    } = req.query;

    let filteredPosts = communityPosts.filter(post => post.isPublic);

    // Apply filters
    if (type) {
      filteredPosts = filteredPosts.filter(post => post.type === type);
    }

    if (location) {
      filteredPosts = filteredPosts.filter(post => 
        post.location && post.location.name.toLowerCase().includes(location.toLowerCase())
      );
    }

    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim().toLowerCase());
      filteredPosts = filteredPosts.filter(post =>
        post.tags.some(tag => tagArray.includes(tag.toLowerCase()))
      );
    }

    if (author) {
      filteredPosts = filteredPosts.filter(post => 
        post.author.name.toLowerCase().includes(author.toLowerCase())
      );
    }

    // Sort posts
    switch (sort) {
      case 'popular':
        filteredPosts.sort((a, b) => (b.likes.length + b.comments.length) - (a.likes.length + a.comments.length));
        break;
      case 'oldest':
        filteredPosts.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        break;
      case 'recent':
      default:
        filteredPosts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
    }

    // Paginate
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedPosts = filteredPosts.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: {
        posts: paginatedPosts,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(filteredPosts.length / limit),
          total: filteredPosts.length
        },
        filters: { type, location, tags, author, sort }
      }
    });
  } catch (error) {
    logger.error('Get posts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/community/posts/:id
// @desc    Get specific post with comments
// @access  Private
router.get('/posts/:id', auth, async (req, res) => {
  try {
    const post = communityPosts.find(p => p.id === req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    if (!post.isPublic && post.author._id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: post
    });
  } catch (error) {
    logger.error('Get post error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/community/posts/:id/like
// @desc    Like/unlike a post
// @access  Private
router.post('/posts/:id/like', auth, async (req, res) => {
  try {
    const postIndex = communityPosts.findIndex(p => p.id === req.params.id);

    if (postIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    const post = communityPosts[postIndex];
    const userLikeIndex = post.likes.findIndex(like => like === req.user.id);

    let action;
    if (userLikeIndex > -1) {
      // Unlike
      post.likes.splice(userLikeIndex, 1);
      action = 'unliked';
    } else {
      // Like
      post.likes.push(req.user.id);
      action = 'liked';
    }

    post.updatedAt = new Date();

    res.json({
      success: true,
      data: {
        action,
        likesCount: post.likes.length,
        isLiked: action === 'liked'
      },
      message: `Post ${action} successfully`
    });
  } catch (error) {
    logger.error('Like post error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/community/posts/:id/comments
// @desc    Add comment to post
// @access  Private
router.post('/posts/:id/comments', [
  auth,
  body('content').notEmpty().withMessage('Comment content is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const postIndex = communityPosts.findIndex(p => p.id === req.params.id);

    if (postIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    const user = await User.findById(req.user.id).select('name profilePicture verificationStatus');

    const newComment = {
      id: Date.now().toString(),
      author: {
        _id: req.user.id,
        name: user.name,
        profilePicture: user.profilePicture,
        verificationStatus: user.verificationStatus
      },
      content: req.body.content,
      likes: [],
      createdAt: new Date()
    };

    communityPosts[postIndex].comments.push(newComment);
    communityPosts[postIndex].updatedAt = new Date();

    res.status(201).json({
      success: true,
      data: newComment,
      message: 'Comment added successfully'
    });
  } catch (error) {
    logger.error('Add comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/community/trending
// @desc    Get trending posts and topics
// @access  Private
router.get('/trending', auth, async (req, res) => {
  try {
    const { period = 'week', limit = 10 } = req.query;

    // Calculate trending based on engagement in the specified period
    const now = new Date();
    let periodStart;

    switch (period) {
      case 'day':
        periodStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'month':
        periodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'week':
      default:
        periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
    }

    const recentPosts = communityPosts.filter(post => 
      post.isPublic && new Date(post.createdAt) >= periodStart
    );

    // Calculate engagement score
    const postsWithScore = recentPosts.map(post => ({
      ...post,
      engagementScore: post.likes.length * 2 + post.comments.length * 3 + post.shares
    }));

    // Sort by engagement score
    postsWithScore.sort((a, b) => b.engagementScore - a.engagementScore);

    // Get trending tags
    const allTags = recentPosts.flatMap(post => post.tags);
    const tagCounts = {};
    allTags.forEach(tag => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });

    const trendingTags = Object.entries(tagCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([tag, count]) => ({ tag, count }));

    res.json({
      success: true,
      data: {
        trendingPosts: postsWithScore.slice(0, parseInt(limit)),
        trendingTags,
        period
      }
    });
  } catch (error) {
    logger.error('Get trending error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/community/my-posts
// @desc    Get current user's posts
// @access  Private
router.get('/my-posts', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const userPosts = communityPosts
      .filter(post => post.author._id === req.user.id)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Paginate
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedPosts = userPosts.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: {
        posts: paginatedPosts,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(userPosts.length / limit),
          total: userPosts.length
        }
      }
    });
  } catch (error) {
    logger.error('Get my posts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/community/posts/:id
// @desc    Update post
// @access  Private
router.put('/posts/:id', [
  auth,
  body('title').optional().notEmpty(),
  body('content').optional().notEmpty()
], async (req, res) => {
  try {
    const postIndex = communityPosts.findIndex(p => p.id === req.params.id);

    if (postIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    const post = communityPosts[postIndex];

    if (post.author._id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this post'
      });
    }

    const updates = req.body;
    Object.assign(post, updates, { updatedAt: new Date() });

    res.json({
      success: true,
      data: post,
      message: 'Post updated successfully'
    });
  } catch (error) {
    logger.error('Update post error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   DELETE /api/community/posts/:id
// @desc    Delete post
// @access  Private
router.delete('/posts/:id', auth, async (req, res) => {
  try {
    const postIndex = communityPosts.findIndex(p => p.id === req.params.id);

    if (postIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    const post = communityPosts[postIndex];

    if (post.author._id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this post'
      });
    }

    communityPosts.splice(postIndex, 1);

    res.json({
      success: true,
      message: 'Post deleted successfully'
    });
  } catch (error) {
    logger.error('Delete post error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/community/events
// @desc    Get upcoming travel events and meetups
// @access  Private
router.get('/events', auth, async (req, res) => {
  try {
    const { location, date, page = 1, limit = 10 } = req.query;

    let events = communityPosts.filter(post => 
      post.type === 'event' || post.type === 'meetup'
    );

    // Filter by location
    if (location) {
      events = events.filter(event => 
        event.location && event.location.name.toLowerCase().includes(location.toLowerCase())
      );
    }

    // Filter by date (future events only by default)
    const filterDate = date ? new Date(date) : new Date();
    events = events.filter(event => {
      // Assuming events have a date in their content or tags
      return new Date(event.createdAt) >= filterDate;
    });

    // Sort by date
    events.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    // Paginate
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedEvents = events.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: {
        events: paginatedEvents,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(events.length / limit),
          total: events.length
        }
      }
    });
  } catch (error) {
    logger.error('Get events error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;