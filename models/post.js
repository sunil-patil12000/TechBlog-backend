const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a title'],
    trim: true,
    maxlength: [200, 'Title cannot be more than 200 characters']
  },
  slug: {
    type: String,
    unique: true
  },
  content: {
    type: String,
    required: [true, 'Please add content']
  },
  status: {
    type: String,
    enum: ['draft', 'published'],
    default: 'draft'
  },
  author: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Generate slug from title
postSchema.pre('save', function(next) {
  this.slug = this.title
    .toLowerCase()
    .replace(/[^a-zA-Z0-9]/g, '-')
    .replace(/-+/g, '-');
  next();
});

module.exports = mongoose.models.Post || mongoose.model('Post', postSchema);
