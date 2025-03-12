const express = require('express');
const router = express.Router();
const { testUpload } = require('../controllers/testController');
const upload = require('../middleware/upload');
const fs = require('fs');
const path = require('path');
const imagePathConfig = require('../utils/imagePathConfig');

// Public test route for debugging uploads
router.post('/upload', upload.single('image'), testUpload);

// Diagnostic route for checking image paths
router.get('/image-paths', (req, res) => {
  // Check if images directory exists
  const directories = [
    { path: path.join(__dirname, '../uploads'), name: 'Root uploads' },
    { path: path.join(__dirname, '../public/uploads'), name: 'Public uploads' }
  ];
  
  const results = {
    directories: directories.map(dir => ({
      name: dir.name,
      path: dir.path,
      exists: fs.existsSync(dir.path),
      files: fs.existsSync(dir.path) 
        ? fs.readdirSync(dir.path).slice(0, 10) // List first 10 files
        : []
    })),
    appConfig: {
      uploadsPathInStatic: true // This is now configured in app.js
    }
  };
  
  // Additional information for diagnosing paths
  if (req.query.path) {
    try {
      const imagePath = req.query.path;
      results.pathInfo = {
        original: imagePath,
        normalized: imagePathConfig.normalizeImagePath(imagePath),
        exists: imagePathConfig.imageExists(imagePath)
      };
    } catch (error) {
      results.pathInfo = {
        error: error.message
      };
    }
  }
  
  res.json(results);
});

/**
 * @route   GET /api/test/image-path
 * @desc    Test image path normalization
 * @access  Public
 */
router.get('/image-path', (req, res) => {
  const imagePath = req.query.path;
  
  if (!imagePath) {
    return res.status(400).json({ 
      error: 'Missing path parameter',
      usage: '/api/test/image-path?path=/path/to/image.jpg'
    });
  }
  
  try {
    // Get normalized path
    const normalizedPath = imagePathConfig.normalizeImagePath(imagePath);
    
    // Check if image exists
    const { exists, path: foundPath } = imagePathConfig.imageExists(normalizedPath);
    
    // Get absolute path
    const absolutePath = imagePathConfig.getAbsoluteImagePath(imagePath);
    
    res.json({
      original: imagePath,
      normalized: normalizedPath,
      exists: exists,
      foundAt: foundPath,
      absolutePath: absolutePath,
      uploadPaths: {
        root: imagePathConfig.UPLOAD_PATHS.ROOT_UPLOADS,
        public: imagePathConfig.UPLOAD_PATHS.PUBLIC_UPLOADS
      }
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Error processing image path',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * @route   GET /api/test/uploads
 * @desc    List all uploaded files
 * @access  Public
 */
router.get('/uploads', (req, res) => {
  try {
    const rootUploads = [];
    const publicUploads = [];
    
    // Read root uploads directory
    if (fs.existsSync(imagePathConfig.UPLOAD_PATHS.ROOT_UPLOADS)) {
      const files = fs.readdirSync(imagePathConfig.UPLOAD_PATHS.ROOT_UPLOADS);
      files.forEach(file => {
        const filePath = path.join(imagePathConfig.UPLOAD_PATHS.ROOT_UPLOADS, file);
        const stats = fs.statSync(filePath);
        rootUploads.push({
          name: file,
          path: filePath,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime,
          url: `/uploads/${file}`
        });
      });
    }
    
    // Read public uploads directory
    if (fs.existsSync(imagePathConfig.UPLOAD_PATHS.PUBLIC_UPLOADS)) {
      const files = fs.readdirSync(imagePathConfig.UPLOAD_PATHS.PUBLIC_UPLOADS);
      files.forEach(file => {
        const filePath = path.join(imagePathConfig.UPLOAD_PATHS.PUBLIC_UPLOADS, file);
        const stats = fs.statSync(filePath);
        publicUploads.push({
          name: file,
          path: filePath,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime,
          url: `/uploads/${file}`
        });
      });
    }
    
    res.json({
      rootUploads,
      publicUploads,
      directories: {
        root: imagePathConfig.UPLOAD_PATHS.ROOT_UPLOADS,
        public: imagePathConfig.UPLOAD_PATHS.PUBLIC_UPLOADS
      }
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Error listing uploads',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * @route   GET /api/test/image-debug
 * @desc    Debug page for image paths
 * @access  Public
 */
router.get('/image-debug', (req, res) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Image Path Debugger</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
        h1, h2 { color: #333; }
        .form-group { margin-bottom: 15px; }
        label { display: block; margin-bottom: 5px; font-weight: bold; }
        input[type="text"] { width: 100%; padding: 8px; font-size: 16px; }
        button { padding: 10px 15px; background: #4CAF50; color: white; border: none; cursor: pointer; }
        .result { margin-top: 20px; padding: 15px; background: #f5f5f5; border-radius: 5px; }
        .error { color: red; }
        .success { color: green; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f2f2f2; }
        .image-preview { max-width: 200px; max-height: 200px; margin-top: 10px; }
      </style>
    </head>
    <body>
      <h1>Image Path Debugger</h1>
      
      <div class="form-group">
        <label for="imagePath">Image Path to Test:</label>
        <input type="text" id="imagePath" placeholder="e.g., /uploads/image.jpg or ../../uploads/image.jpg">
        <button onclick="testPath()">Test Path</button>
      </div>
      
      <div id="result" class="result" style="display: none;"></div>
      
      <h2>Uploaded Images</h2>
      <button onclick="listUploads()">Refresh List</button>
      <div id="uploads"></div>
      
      <script>
        // Test an image path
        async function testPath() {
          const imagePath = document.getElementById('imagePath').value;
          const resultDiv = document.getElementById('result');
          
          if (!imagePath) {
            resultDiv.innerHTML = '<p class="error">Please enter an image path</p>';
            resultDiv.style.display = 'block';
            return;
          }
          
          try {
            const response = await fetch(\`/api/test/image-path?path=\${encodeURIComponent(imagePath)}\`);
            const data = await response.json();
            
            let html = '<h3>Path Analysis</h3>';
            html += '<table>';
            html += '<tr><th>Property</th><th>Value</th></tr>';
            html += \`<tr><td>Original Path</td><td>\${data.original}</td></tr>\`;
            html += \`<tr><td>Normalized Path</td><td>\${data.normalized}</td></tr>\`;
            html += \`<tr><td>Image Exists</td><td>\${data.exists ? '<span class="success">Yes</span>' : '<span class="error">No</span>'}</td></tr>\`;
            
            if (data.foundAt) {
              html += \`<tr><td>Found At</td><td>\${data.foundAt}</td></tr>\`;
            }
            
            if (data.absolutePath) {
              html += \`<tr><td>Absolute Path</td><td>\${data.absolutePath}</td></tr>\`;
            }
            
            html += '</table>';
            
            // Add image preview
            if (data.normalized) {
              html += '<h3>Image Preview</h3>';
              html += \`<img src="\${data.normalized}" class="image-preview" onerror="this.onerror=null;this.src='';this.alt='Image failed to load';this.style.display='none';document.getElementById('error-message').style.display='block';">\`;
              html += '<p id="error-message" style="display:none;" class="error">Failed to load image. The path may be incorrect or the image may not exist.</p>';
            }
            
            resultDiv.innerHTML = html;
            resultDiv.style.display = 'block';
          } catch (error) {
            resultDiv.innerHTML = \`<p class="error">Error: \${error.message}</p>\`;
            resultDiv.style.display = 'block';
          }
        }
        
        // List all uploads
        async function listUploads() {
          const uploadsDiv = document.getElementById('uploads');
          
          try {
            const response = await fetch('/api/test/uploads');
            const data = await response.json();
            
            let html = '<h3>Root Uploads Directory</h3>';
            html += \`<p>Path: \${data.directories.root}</p>\`;
            
            if (data.rootUploads.length === 0) {
              html += '<p>No files found</p>';
            } else {
              html += '<table>';
              html += '<tr><th>Filename</th><th>Size</th><th>Modified</th><th>Preview</th><th>URL</th></tr>';
              
              data.rootUploads.forEach(file => {
                html += '<tr>';
                html += \`<td>\${file.name}</td>\`;
                html += \`<td>\${formatFileSize(file.size)}</td>\`;
                html += \`<td>\${new Date(file.modified).toLocaleString()}</td>\`;
                html += \`<td><img src="\${file.url}" class="image-preview" onerror="this.onerror=null;this.src='';this.alt='Not an image';this.style.display='none';"></td>\`;
                html += \`<td><a href="\${file.url}" target="_blank">\${file.url}</a></td>\`;
                html += '</tr>';
              });
              
              html += '</table>';
            }
            
            html += '<h3>Public Uploads Directory</h3>';
            html += \`<p>Path: \${data.directories.public}</p>\`;
            
            if (data.publicUploads.length === 0) {
              html += '<p>No files found</p>';
            } else {
              html += '<table>';
              html += '<tr><th>Filename</th><th>Size</th><th>Modified</th><th>Preview</th><th>URL</th></tr>';
              
              data.publicUploads.forEach(file => {
                html += '<tr>';
                html += \`<td>\${file.name}</td>\`;
                html += \`<td>\${formatFileSize(file.size)}</td>\`;
                html += \`<td>\${new Date(file.modified).toLocaleString()}</td>\`;
                html += \`<td><img src="\${file.url}" class="image-preview" onerror="this.onerror=null;this.src='';this.alt='Not an image';this.style.display='none';"></td>\`;
                html += \`<td><a href="\${file.url}" target="_blank">\${file.url}</a></td>\`;
                html += '</tr>';
              });
              
              html += '</table>';
            }
            
            uploadsDiv.innerHTML = html;
          } catch (error) {
            uploadsDiv.innerHTML = \`<p class="error">Error: \${error.message}</p>\`;
          }
        }
        
        // Format file size
        function formatFileSize(bytes) {
          if (bytes === 0) return '0 Bytes';
          const k = 1024;
          const sizes = ['Bytes', 'KB', 'MB', 'GB'];
          const i = Math.floor(Math.log(bytes) / Math.log(k));
          return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        }
        
        // Load uploads on page load
        window.onload = function() {
          listUploads();
        };
      </script>
    </body>
    </html>
  `;
  
  res.send(html);
});

module.exports = router;
