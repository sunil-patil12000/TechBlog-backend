const express = require('express');
const router = express.Router();
const generateSitemap = require('../utils/sitemapGenerator');
const { protect, admin } = require('../middlewares/authMiddleware');
const path = require('path');

/**
 * @route   GET /api/sitemap
 * @desc    Get the sitemap
 * @access  Public
 */
router.get('/', (req, res) => {
  try {
    const sitemapPath = path.join(__dirname, '../public/sitemap.xml');
    res.sendFile(sitemapPath);
  } catch (error) {
    res.status(404).json({ 
      message: 'Sitemap not found. Please generate one first.',
      error: error.message 
    });
  }
});

/**
 * @route   POST /api/sitemap/generate
 * @desc    Generate a new sitemap
 * @access  Private/Admin
 */
router.post('/generate', protect, admin, async (req, res) => {
  try {
    const { siteUrl } = req.body;
    const result = await generateSitemap(siteUrl);
    
    if (result.success) {
      res.status(200).json({
        message: 'Sitemap generated successfully',
        url: result.url,
        entriesCount: result.entriesCount
      });
    } else {
      res.status(500).json({
        message: 'Failed to generate sitemap',
        error: result.error
      });
    }
  } catch (error) {
    res.status(500).json({
      message: 'Server error while generating sitemap',
      error: error.message
    });
  }
});

module.exports = router; 