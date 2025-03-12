const mongoose = require('mongoose');

// Schema for page view analytics
const PageViewSchema = new mongoose.Schema({
  page: {
    type: String,
    required: true,
    index: true
  },
  path: {
    type: String,
    required: true,
    index: true
  },
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    sparse: true,
    index: true
  },
  sessionId: {
    type: String,
    required: true,
    index: true
  },
  referrer: String,
  userAgent: String,
  device: {
    type: String,
    enum: ['desktop', 'tablet', 'mobile', 'unknown'],
    default: 'unknown'
  },
  browser: String,
  os: String,
  ip: String,
  country: String,
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// Schema for event analytics (clicks, scrolls, etc.)
const EventSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    index: true
  },
  category: {
    type: String,
    required: true,
    index: true
  },
  action: {
    type: String,
    required: true
  },
  label: String,
  value: Number,
  page: {
    type: String,
    required: true,
    index: true
  },
  path: {
    type: String,
    required: true
  },
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    sparse: true,
    index: true
  },
  sessionId: {
    type: String,
    required: true,
    index: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// Schema for user sessions
const SessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    sparse: true,
    index: true
  },
  startTime: {
    type: Date,
    default: Date.now,
    index: true
  },
  endTime: {
    type: Date,
    index: true
  },
  duration: {
    type: Number,
    default: 0
  },
  pageViews: {
    type: Number,
    default: 0
  },
  events: {
    type: Number,
    default: 0
  },
  device: {
    type: String,
    enum: ['desktop', 'tablet', 'mobile', 'unknown'],
    default: 'unknown'
  },
  browser: String,
  os: String,
  ip: String,
  country: String,
  referrer: String,
  entryPage: String,
  exitPage: String,
  isActive: {
    type: Boolean,
    default: true,
    index: true
  }
});

// Create indexes for common queries
PageViewSchema.index({ timestamp: 1, page: 1 });
PageViewSchema.index({ timestamp: 1, postId: 1 });
EventSchema.index({ timestamp: 1, type: 1 });
EventSchema.index({ timestamp: 1, postId: 1 });
SessionSchema.index({ startTime: 1, isActive: 1 });

const PageView = mongoose.model('PageView', PageViewSchema);
const Event = mongoose.model('Event', EventSchema);
const Session = mongoose.model('Session', SessionSchema);

module.exports = {
  PageView,
  Event,
  Session
}; 