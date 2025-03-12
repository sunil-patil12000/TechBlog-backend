const Post = require('../models/post');
const mongoose = require('mongoose');
const { format } = require('date-fns');

// Function to publish scheduled posts
async function publishScheduledPosts() {
  try {
    const now = new Date();
    
    // Find all posts that are scheduled to be published before or at current time
    // but are not yet published
    const postsToPublish = await Post.find({
      publishDate: { $lte: now },
      published: false
    }).populate('author', 'name email');
    
    if (postsToPublish.length === 0) {
      return { success: true, count: 0, message: 'No posts to publish' };
    }
    
    // Update all posts to published status
    const postIds = postsToPublish.map(post => post._id);
    
    await Post.updateMany(
      { _id: { $in: postIds } },
      { $set: { published: true } }
    );
    
    console.log(`Published ${postsToPublish.length} scheduled posts at ${format(now, 'yyyy-MM-dd HH:mm:ss')}`);
    
    // Return published posts for further processing (e.g., notifications)
    return { 
      success: true, 
      count: postsToPublish.length, 
      posts: postsToPublish,
      message: `Published ${postsToPublish.length} scheduled posts`
    };
  } catch (error) {
    console.error('Error publishing scheduled posts:', error);
    return { 
      success: false, 
      count: 0, 
      error: error.message, 
      message: 'Failed to publish scheduled posts' 
    };
  }
}

// Function to check for posts scheduled for today
async function getPostsScheduledForToday() {
  try {
    const now = new Date();
    const startOfDay = new Date(now.setHours(0, 0, 0, 0));
    const endOfDay = new Date(now.setHours(23, 59, 59, 999));
    
    const scheduledPosts = await Post.find({
      publishDate: { $gte: startOfDay, $lte: endOfDay },
      published: false
    }).populate('author', 'name email');
    
    return { 
      success: true, 
      count: scheduledPosts.length, 
      posts: scheduledPosts 
    };
  } catch (error) {
    console.error('Error checking scheduled posts:', error);
    return { 
      success: false, 
      count: 0, 
      error: error.message 
    };
  }
}

module.exports = {
  publishScheduledPosts,
  getPostsScheduledForToday
}; 