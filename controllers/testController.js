const asyncHandler = require('express-async-handler');
const path = require('path');
const fs = require('fs');

// Test upload endpoint
exports.testUpload = asyncHandler(async (req, res) => {
  console.log('TEST UPLOAD RECEIVED:');
  console.log('REQUEST BODY:', req.body);
  console.log('REQUEST FILES:', req.files || req.file);
  console.log('REQUEST HEADERS:', req.headers);

  // Check if file exists
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'No file uploaded'
    });
  }

  // Get upload directory path
  const uploadDir = path.resolve(__dirname, '../uploads');
  
  // Check if directory exists
  if (!fs.existsSync(uploadDir)) {
    return res.status(500).json({
      success: false,
      message: `Upload directory doesn't exist: ${uploadDir}`
    });
  }
  
  // Check write permissions
  try {
    const testFile = path.join(uploadDir, '.test-write');
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    console.log('Directory has proper write permissions');
  } catch (error) {
    console.error('Directory permission error:', error);
    return res.status(500).json({
      success: false,
      message: `Upload directory permission error: ${error.message}`
    });
  }

  // Return basic success response
  return res.status(200).json({
    success: true,
    message: 'Test upload successful',
    file: {
      filename: req.file.filename,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path
    },
    location: `/uploads/${req.file.filename}`
  });
});
