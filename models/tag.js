const mongoose = require('mongoose');

const TagSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a tag name'],
    unique: true,
    trim: true,
    maxlength: [50, 'Tag name cannot be more than 50 characters']
  },
  slug: {
    type: String,
    unique: true,
    index: true
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot be more than 500 characters']
  }
}, {
  timestamps: true
});

// Create indexes for faster queries
TagSchema.index({ name: 1 });

module.exports = mongoose.model('Tag', TagSchema); 