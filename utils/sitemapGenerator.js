const fs = require('fs');
const path = require('path');
const Post = require('../models/post');
const Category = require('../models/category');
const User = require('../models/user');
const config = require('../config/config');

/**
 * Generates an XML sitemap for the blog content
 * @param {string} siteUrl - The base URL of the site
 * @param {string} outputPath - Path to save the sitemap
 */
async function generateSitemap(siteUrl = config.SITE_URL || 'https://example.com', outputPath = path.join(__dirname, '../public/sitemap.xml')) {
  try {
    console.log('Starting sitemap generation...');
    
    if (!siteUrl.endsWith('/')) {
      siteUrl += '/';
    }
    
    // Fetch all posts from DB
    const posts = await Post.find({ status: 'published' })
      .sort({ updatedAt: -1 })
      .lean();
    
    console.log(`Found ${posts.length} published posts`);
    
    // Fetch all categories
    const categories = await Category.find().lean();
    console.log(`Found ${categories.length} categories`);
    
    // Fetch authors (public profiles only)
    const authors = await User.find({ isPublic: true })
      .select('username slug')
      .lean();
    console.log(`Found ${authors.length} public author profiles`);
    
    // Start XML content
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
    
    // Add static pages
    const staticPages = [
      { url: '', priority: 1.0, changefreq: 'daily' },
      { url: 'blog', priority: 0.9, changefreq: 'daily' },
      { url: 'about', priority: 0.7, changefreq: 'monthly' },
      { url: 'contact', priority: 0.7, changefreq: 'monthly' },
      { url: 'archives', priority: 0.6, changefreq: 'weekly' },
      { url: 'projects', priority: 0.8, changefreq: 'monthly' },
    ];
    
    // Add static pages to sitemap
    staticPages.forEach(page => {
      xml += '  <url>\n';
      xml += `    <loc>${siteUrl}${page.url}</loc>\n`;
      xml += `    <priority>${page.priority}</priority>\n`;
      xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
      xml += '  </url>\n';
    });
    
    // Add blog posts to sitemap
    posts.forEach(post => {
      const lastmod = post.updatedAt ? new Date(post.updatedAt).toISOString() : new Date().toISOString();
      
      xml += '  <url>\n';
      xml += `    <loc>${siteUrl}blog/${post.slug}</loc>\n`;
      xml += `    <lastmod>${lastmod}</lastmod>\n`;
      xml += '    <priority>0.8</priority>\n';
      xml += '    <changefreq>weekly</changefreq>\n';
      xml += '  </url>\n';
    });
    
    // Add category pages to sitemap
    categories.forEach(category => {
      xml += '  <url>\n';
      xml += `    <loc>${siteUrl}blog/category/${category.slug}</loc>\n`;
      xml += '    <priority>0.7</priority>\n';
      xml += '    <changefreq>weekly</changefreq>\n';
      xml += '  </url>\n';
    });
    
    // Add author pages to sitemap
    authors.forEach(author => {
      xml += '  <url>\n';
      xml += `    <loc>${siteUrl}author/${author.slug || author.username}</loc>\n`;
      xml += '    <priority>0.6</priority>\n';
      xml += '    <changefreq>weekly</changefreq>\n';
      xml += '  </url>\n';
    });
    
    // Close XML
    xml += '</urlset>';
    
    // Ensure directory exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Write the sitemap file
    fs.writeFileSync(outputPath, xml);
    console.log(`Sitemap successfully generated at ${outputPath}`);
    
    return {
      success: true,
      path: outputPath,
      url: `${siteUrl}sitemap.xml`,
      entriesCount: posts.length + categories.length + authors.length + staticPages.length
    };
  } catch (error) {
    console.error('Error generating sitemap:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = generateSitemap; 