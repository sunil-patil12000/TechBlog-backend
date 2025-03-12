const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Define absolute upload directory path - update to match the static serving path
const uploadDir = path.resolve(__dirname, '../uploads');
console.log('Upload directory path:', uploadDir);

// Ensure the uploads directory exists with proper permissions
try {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log(`Created uploads directory: ${uploadDir}`);
    
    // On Windows, chmod won't work, but the directory should be writable
    if (process.platform !== 'win32') {
      fs.chmodSync(uploadDir, 0o777);
    }
  } else {
    console.log(`Upload directory already exists: ${uploadDir}`);
    // On Windows, chmod won't work, but log for clarity
    if (process.platform !== 'win32') {
      fs.chmodSync(uploadDir, 0o777);
    }
  }
  
  // Verify directory is writable with an actual test
  const testFile = path.join(uploadDir, 'test-write.txt');
  try {
    fs.writeFileSync(testFile, 'Test write permissions');
    console.log('Upload directory is writable - test successful');
    fs.unlinkSync(testFile); // Clean up test file
  } catch (writeErr) {
    console.error('WARNING: Upload directory is not writable:', writeErr.message);
    throw new Error(`Upload directory not writable: ${uploadDir}`);
  }
  
} catch (err) {
  console.error('Error with upload directory:', err);
}

// Configure storage with error handling
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    // Double-check directory exists before saving
    if (!fs.existsSync(uploadDir)) {
      return cb(new Error(`Upload directory doesn't exist: ${uploadDir}`), null);
    }
    
    // Log upload attempt
    console.log(`Attempting to upload file: ${file.originalname}`);
    cb(null, uploadDir);
  },
  filename: function(req, file, cb) {
    // Create unique filename with original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const filename = 'image-' + uniqueSuffix + ext;
    console.log(`Generated filename: ${filename}`);
    cb(null, filename);
  }
});

// File filter with better logging
const fileFilter = (req, file, cb) => {
  console.log('Received file:', file.originalname, 'type:', file.mimetype);
  
  // Check file type
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    console.log('File rejected - not an image:', file.originalname);
    cb(new Error('Only image files are allowed!'), false);
  }
};

// Enhance the file upload logging and handling
const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    console.log('Received file upload request:', file.originalname, file.mimetype);
    
    // Check file type
    if (file.mimetype.startsWith('image/')) {
      console.log(`Accepting file ${file.originalname} (${file.mimetype})`);
      cb(null, true);
    } else {
      console.log(`Rejecting non-image file: ${file.originalname} (${file.mimetype})`);
      cb(new Error('Only image files are allowed!'), false);
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

module.exports = upload;
