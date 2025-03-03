const mongoose = require('mongoose');

const commentSchema = mongoose.Schema(
  {
    name: { type: String, required: true },
    content: { type: String, required: true },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

const postSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    title: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    image: {
      type: String,
    },
    category: {
      type: String,
      required: true,
    },
    comments: [commentSchema],
    tags: [String],
    published: {
      type: Boolean,
      default: false,
    }
  },
  {
    timestamps: true,
  }
);

const Post = mongoose.model('Post', postSchema);

module.exports = Post;
