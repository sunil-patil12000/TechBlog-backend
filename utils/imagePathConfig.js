const path = require('path');
const fs = require('fs');
const os = require('os');

// Define common upload paths used in the application
const UPLOAD_PATHS = {
  // Root upload directory in the backend
  ROOT_UPLOADS: path.join(__dirname, '../uploads'),
  // Public uploads directory (if applicable)
  PUBLIC_UPLOADS: path.join(__dirname, '../public/uploads'),
  // URL prefix for accessing uploads
  URL_PREFIX: '/uploads'
};

// Log the actual paths for debugging
console.log('Upload paths configuration:');
console.log('- ROOT_UPLOADS:', UPLOAD_PATHS.ROOT_UPLOADS);
console.log('- PUBLIC_UPLOADS:', UPLOAD_PATHS.PUBLIC_UPLOADS);

// Ensure upload directories exist
try {
  if (!fs.existsSync(UPLOAD_PATHS.ROOT_UPLOADS)) {
    fs.mkdirSync(UPLOAD_PATHS.ROOT_UPLOADS, { recursive: true });
    console.log(`Created ROOT_UPLOADS directory: ${UPLOAD_PATHS.ROOT_UPLOADS}`);
  }
  
  // Only create PUBLIC_UPLOADS if it's different from ROOT_UPLOADS
  if (UPLOAD_PATHS.PUBLIC_UPLOADS !== UPLOAD_PATHS.ROOT_UPLOADS && 
      !fs.existsSync(UPLOAD_PATHS.PUBLIC_UPLOADS)) {
    fs.mkdirSync(UPLOAD_PATHS.PUBLIC_UPLOADS, { recursive: true });
    console.log(`Created PUBLIC_UPLOADS directory: ${UPLOAD_PATHS.PUBLIC_UPLOADS}`);
  }
} catch (error) {
  console.error('Error creating upload directories:', error);
}

/**
 * Normalizes an image path to ensure it matches the expected format for frontend display
 * @param {string} imagePath - The image path to normalize
 * @returns {string} - The normalized path
 */
function normalizeImagePath(imagePath) {
  if (!imagePath) {
    console.log('normalizeImagePath: Received null or empty path');
    return null;
  }
  
  // Log original path for debugging
  console.log('Original image path:', imagePath);
  
  try {
    let normalizedPath = imagePath.trim();
    
    // Handle Windows backslashes if present
    normalizedPath = normalizedPath.replace(/\\/g, '/');
    
    // Handle relative paths (e.g., '../uploads/image.jpg')
    if (normalizedPath.includes('../uploads/')) {
      console.log('Fixing relative path pattern: ../uploads/');
      normalizedPath = normalizedPath.replace(/(\.\.\/)+uploads\//, '/uploads/');
    }
    
    // Handle API paths (e.g., '/api/uploads/image.jpg')
    if (normalizedPath.startsWith('/api/uploads/')) {
      console.log('Fixing API path pattern: /api/uploads/');
      normalizedPath = normalizedPath.replace('/api/uploads/', '/uploads/');
    }
    
    // Handle localhost URLs
    if (normalizedPath.includes('localhost') && normalizedPath.includes('/uploads/')) {
      console.log('Fixing localhost URL pattern');
      normalizedPath = normalizedPath.substring(normalizedPath.indexOf('/uploads/'));
    }
    
    // Handle full URLs (e.g., http://example.com/uploads/image.jpg)
    if (normalizedPath.match(/^https?:\/\//)) {
      console.log('Fixing full URL pattern');
      const urlParts = new URL(normalizedPath);
      if (urlParts.pathname.includes('/uploads/')) {
        normalizedPath = urlParts.pathname;
      }
    }
    
    // Handle paths that don't start with '/uploads/' but contain 'uploads/'
    if (!normalizedPath.startsWith('/uploads/') && normalizedPath.includes('uploads/')) {
      console.log('Fixing path with uploads/ but not starting with /uploads/');
      normalizedPath = '/uploads/' + normalizedPath.substring(normalizedPath.indexOf('uploads/') + 8);
    }
    
    // Ensure the path always starts with the URL prefix (unless it's an external URL)
    if (!normalizedPath.startsWith('/uploads/') && !normalizedPath.startsWith('http')) {
      console.log('Adding /uploads/ prefix to path');
      // Remove any leading slashes before adding the prefix
      normalizedPath = normalizedPath.replace(/^\/+/, '');
      normalizedPath = '/uploads/' + normalizedPath;
    }
    
    // Log normalized path
    console.log('Normalized image path:', normalizedPath);
    
    return normalizedPath;
  } catch (error) {
    console.error('Error normalizing image path:', error);
    // Return the original path if normalization fails
    return imagePath;
  }
}

/**
 * Checks if the image exists in any of the upload directories
 * @param {string} imagePath - The image path to check
 * @returns {object} - Result with exists flag and found path
 */
function imageExists(imagePath) {
  if (!imagePath) {
    console.log('imageExists: Received null or empty path');
    return { exists: false, path: null };
  }
  
  try {
    // Extract the filename from the path
    const filename = path.basename(imagePath);
    console.log(`Checking if image exists: ${filename}`);
    
    // Check in root uploads directory
    const rootPath = path.join(UPLOAD_PATHS.ROOT_UPLOADS, filename);
    if (fs.existsSync(rootPath)) {
      console.log(`Image found in ROOT_UPLOADS: ${rootPath}`);
      return { exists: true, path: rootPath };
    }
    
    // Check in public uploads directory
    const publicPath = path.join(UPLOAD_PATHS.PUBLIC_UPLOADS, filename);
    if (fs.existsSync(publicPath)) {
      console.log(`Image found in PUBLIC_UPLOADS: ${publicPath}`);
      return { exists: true, path: publicPath };
    }
    
    // If the path is absolute, check if it exists directly
    if (path.isAbsolute(imagePath) && fs.existsSync(imagePath)) {
      console.log(`Image found at absolute path: ${imagePath}`);
      return { exists: true, path: imagePath };
    }
    
    // If the path starts with /uploads/, check if it exists relative to the project root
    if (imagePath.startsWith('/uploads/')) {
      const relativePath = path.join(__dirname, '../..', imagePath);
      if (fs.existsSync(relativePath)) {
        console.log(`Image found at relative path: ${relativePath}`);
        return { exists: true, path: relativePath };
      }
    }
    
    console.log(`Image not found: ${filename}`);
    return { exists: false, path: null };
  } catch (error) {
    console.error('Error checking if image exists:', error);
    return { exists: false, path: null, error: error.message };
  }
}

/**
 * Creates a URL suitable for the frontend to access an image
 * @param {string} imagePath - The original image path
 * @returns {string} - The frontend URL
 */
function createFrontendUrl(imagePath) {
  if (!imagePath) return null;
  
  const normalized = normalizeImagePath(imagePath);
  
  // Check if the image actually exists
  const { exists } = imageExists(normalized);
  if (!exists) {
    console.warn(`Warning: Creating URL for non-existent image: ${normalized}`);
  }
  
  return normalized;
}

/**
 * Gets the absolute file system path for an image
 * @param {string} imagePath - The image path (URL or relative)
 * @returns {string|null} - The absolute file system path or null if not found
 */
function getAbsoluteImagePath(imagePath) {
  if (!imagePath) return null;
  
  const { exists, path: foundPath } = imageExists(imagePath);
  if (exists) {
    return foundPath;
  }
  
  // If not found directly, try with normalized path
  const normalizedPath = normalizeImagePath(imagePath);
  const { exists: normalizedExists, path: normalizedFoundPath } = imageExists(normalizedPath);
  
  return normalizedExists ? normalizedFoundPath : null;
}

// Export functions and constants
module.exports = {
  UPLOAD_PATHS,
  normalizeImagePath,
  imageExists,
  createFrontendUrl,
  getAbsoluteImagePath
}; 