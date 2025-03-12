/**
 * Script to set up required MongoDB indexes for analytics collections
 * 
 * Run this script with Node.js:
 * node scripts/setupAnalyticsIndexes.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const { PageView, Event, Session } = require('../models/analytics');
const config = require('../config/config');

async function setupIndexes() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI || config.MONGO_URI);
    console.log('Connected to MongoDB');

    console.log('Setting up indexes for PageView collection...');
    await PageView.collection.createIndexes([
      // Indexes for common queries
      { key: { timestamp: -1 }, name: 'timestamp_desc' },
      { key: { postId: 1, timestamp: -1 }, name: 'postId_timestamp' },
      { key: { page: 1, timestamp: -1 }, name: 'page_timestamp' },
      { key: { sessionId: 1 }, name: 'sessionId' },
      { key: { userId: 1, timestamp: -1 }, name: 'userId_timestamp' },
      
      // Indexes for aggregations
      { key: { device: 1 }, name: 'device' },
      { key: { browser: 1 }, name: 'browser' },
      { key: { referrer: 1 }, name: 'referrer' },
      
      // Compound indexes for dashboard queries
      { key: { postId: 1, device: 1, timestamp: -1 }, name: 'postId_device_timestamp' },
      { key: { path: 1, timestamp: -1 }, name: 'path_timestamp' }
    ]);
    
    console.log('Setting up indexes for Event collection...');
    await Event.collection.createIndexes([
      { key: { timestamp: -1 }, name: 'timestamp_desc' },
      { key: { sessionId: 1 }, name: 'sessionId' },
      { key: { type: 1, timestamp: -1 }, name: 'type_timestamp' },
      { key: { category: 1, timestamp: -1 }, name: 'category_timestamp' },
      { key: { action: 1, timestamp: -1 }, name: 'action_timestamp' },
      { key: { postId: 1, timestamp: -1 }, name: 'postId_timestamp' },
      { key: { userId: 1, timestamp: -1 }, name: 'userId_timestamp' },
      
      // Compound indexes for specific analytics queries
      { key: { type: 1, category: 1, timestamp: -1 }, name: 'type_category_timestamp' },
      { key: { postId: 1, type: 1, category: 1 }, name: 'postId_type_category' }
    ]);
    
    console.log('Setting up indexes for Session collection...');
    await Session.collection.createIndexes([
      { key: { sessionId: 1 }, name: 'sessionId_unique', unique: true },
      { key: { userId: 1 }, name: 'userId' },
      { key: { startTime: -1 }, name: 'startTime_desc' },
      { key: { isActive: 1, lastActive: -1 }, name: 'isActive_lastActive' },
      { key: { device: 1, startTime: -1 }, name: 'device_startTime' }
    ]);

    console.log('All indexes created successfully!');
    
    // Display all indexes
    console.log('\nVerifying indexes:');
    
    console.log('\nPageView indexes:');
    const pageViewIndexes = await PageView.collection.indexes();
    console.log(pageViewIndexes.map(idx => idx.name).join(', '));
    
    console.log('\nEvent indexes:');
    const eventIndexes = await Event.collection.indexes();
    console.log(eventIndexes.map(idx => idx.name).join(', '));
    
    console.log('\nSession indexes:');
    const sessionIndexes = await Session.collection.indexes();
    console.log(sessionIndexes.map(idx => idx.name).join(', '));
    
  } catch (err) {
    console.error('Error setting up indexes:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

setupIndexes(); 