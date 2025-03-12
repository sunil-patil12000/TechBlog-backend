const imagePathConfig = require('../utils/imagePathConfig');

console.log('=== IMAGE PATH NORMALIZATION TEST ===');
console.log('Testing various image path formats to ensure proper normalization');
console.log('');

// Test cases
const testCases = [
  {
    description: 'Relative path with ../uploads/',
    input: '../../uploads/test-image.jpg',
    expected: '/uploads/test-image.jpg'
  },
  {
    description: 'API path with /api/uploads/',
    input: '/api/uploads/test-image.jpg',
    expected: '/uploads/test-image.jpg'
  },
  {
    description: 'Path with localhost URL',
    input: 'http://localhost:5000/uploads/test-image.jpg',
    expected: '/uploads/test-image.jpg'
  },
  {
    description: 'Path without leading slash',
    input: 'uploads/test-image.jpg',
    expected: '/uploads/test-image.jpg'
  },
  {
    description: 'Just filename without path',
    input: 'test-image.jpg',
    expected: '/uploads/test-image.jpg'
  },
  {
    description: 'Full URL with domain',
    input: 'https://example.com/uploads/test-image.jpg',
    expected: '/uploads/test-image.jpg'
  },
  {
    description: 'Windows backslash path',
    input: 'uploads\\test-image.jpg',
    expected: '/uploads/test-image.jpg'
  },
  {
    description: 'Null input',
    input: null,
    expected: null
  }
];

// Run tests
let passCount = 0;
let failCount = 0;

testCases.forEach((test, index) => {
  console.log(`Test ${index + 1}: ${test.description}`);
  console.log(`Input: ${test.input}`);
  
  try {
    const result = imagePathConfig.normalizeImagePath(test.input);
    console.log(`Result: ${result}`);
    console.log(`Expected: ${test.expected}`);
    
    if (result === test.expected) {
      console.log('✅ PASS');
      passCount++;
    } else {
      console.log('❌ FAIL');
      failCount++;
    }
  } catch (error) {
    console.log(`❌ ERROR: ${error.message}`);
    failCount++;
  }
  
  console.log('');
});

// Summary
console.log('=== TEST SUMMARY ===');
console.log(`Total tests: ${testCases.length}`);
console.log(`Passed: ${passCount}`);
console.log(`Failed: ${failCount}`);
console.log('');

// Test image existence
console.log('=== TESTING IMAGE EXISTENCE ===');
console.log('Checking if test images exist in the uploads directory');
console.log('');

// Check if uploads directory exists
const fs = require('fs');
const path = require('path');

const uploadsDir = imagePathConfig.UPLOAD_PATHS.ROOT_UPLOADS;
const publicUploadsDir = imagePathConfig.UPLOAD_PATHS.PUBLIC_UPLOADS;

console.log(`ROOT_UPLOADS directory: ${uploadsDir}`);
console.log(`Exists: ${fs.existsSync(uploadsDir)}`);
console.log('');

console.log(`PUBLIC_UPLOADS directory: ${publicUploadsDir}`);
console.log(`Exists: ${fs.existsSync(publicUploadsDir)}`);
console.log('');

// List files in uploads directory
if (fs.existsSync(uploadsDir)) {
  console.log('Files in ROOT_UPLOADS directory:');
  const files = fs.readdirSync(uploadsDir);
  
  if (files.length === 0) {
    console.log('No files found');
  } else {
    files.forEach(file => {
      const filePath = path.join(uploadsDir, file);
      const stats = fs.statSync(filePath);
      console.log(`- ${file} (${stats.size} bytes)`);
      
      // Test image existence with our utility
      const { exists, path: foundPath } = imagePathConfig.imageExists(`/uploads/${file}`);
      console.log(`  Exists according to imageExists(): ${exists}`);
      if (exists) {
        console.log(`  Found at: ${foundPath}`);
      }
    });
  }
}

console.log('');
console.log('=== TEST COMPLETE ==='); 