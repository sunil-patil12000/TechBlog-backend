/**
 * This script copies sample images to both upload directories for testing
 */
const fs = require('fs');
const path = require('path');

console.log('Starting test image generation script...');

// Define source and destination directories
const UPLOADS_DIR = path.join(__dirname, '../uploads');
const PUBLIC_UPLOADS_DIR = path.join(__dirname, '../public/uploads');

console.log('Directories to use:');
console.log('- ROOT_UPLOADS:', UPLOADS_DIR);
console.log('- PUBLIC_UPLOADS:', PUBLIC_UPLOADS_DIR);

// Ensure both target directories exist
[UPLOADS_DIR, PUBLIC_UPLOADS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    console.log(`Creating directory: ${dir}`);
    try {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`✅ Successfully created directory: ${dir}`);
    } catch (error) {
      console.error(`❌ Failed to create directory ${dir}:`, error);
    }
  } else {
    console.log(`✅ Directory already exists: ${dir}`);
    
    // Check if directory is writable
    try {
      const testFile = path.join(dir, '.write-test');
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      console.log(`✅ Directory is writable: ${dir}`);
    } catch (error) {
      console.error(`❌ Directory is not writable ${dir}:`, error);
    }
  }
});

// Helper function to create a colored placeholder image
function createColoredImage(filename, color, width, height) {
  console.log(`Creating test image: ${filename}`);
  try {
    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="${color}" />
        <text x="50%" y="50%" font-family="Arial" font-size="16" fill="white" text-anchor="middle" alignment-baseline="middle">
          ${filename}
        </text>
      </svg>
    `;
    
    const rootPath = path.join(UPLOADS_DIR, filename);
    const publicPath = path.join(PUBLIC_UPLOADS_DIR, filename);
    
    fs.writeFileSync(rootPath, svg);
    console.log(`✅ Wrote to ${rootPath}`);
    
    fs.writeFileSync(publicPath, svg);
    console.log(`✅ Wrote to ${publicPath}`);
    
    console.log(`✅ Successfully created test image: ${filename}`);
  } catch (error) {
    console.error(`❌ Error creating ${filename}:`, error);
  }
}

// Create test images
console.log('\nGenerating test images...');
createColoredImage('test-image-red.svg', '#e74c3c', 300, 200);
createColoredImage('test-image-blue.svg', '#3498db', 300, 200);
createColoredImage('test-image-green.svg', '#2ecc71', 300, 200);
createColoredImage('test-image-purple.svg', '#9b59b6', 300, 200);
createColoredImage('test-image-orange.svg', '#e67e22', 300, 200);

console.log('\n✅ Test images have been copied to both upload directories:');
console.log(`- ${UPLOADS_DIR}`);
console.log(`- ${PUBLIC_UPLOADS_DIR}`);
console.log('\nYou can now test with these URLs:');
console.log('/uploads/test-image-red.svg');
console.log('/uploads/test-image-blue.svg');
console.log('/uploads/test-image-green.svg');
console.log('/uploads/test-image-purple.svg');
console.log('/uploads/test-image-orange.svg'); 