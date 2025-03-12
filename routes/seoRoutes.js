const express = require('express');
const router = express.Router();
const Post = require('../models/post');
const Category = require('../models/category');
const User = require('../models/user');

/**
 * @route   GET /api/seo/meta
 * @desc    Get meta information for any page (for search engines)
 * @access  Public
 */
router.get('/meta', async (req, res) => {
  const { path } = req.query;
  
  if (!path) {
    return res.status(400).json({ message: 'Path parameter is required' });
  }
  
  try {
    // Generate appropriate meta tags based on the requested path
    let meta = {
      title: 'Tech Blog - Modern Web Development Insights',
      description: 'Explore articles on web development, programming and modern technology.',
      keywords: 'web development, programming, tech blog, javascript, react',
      og_type: 'website',
      og_image: `${req.protocol}://${req.get('host')}/images/default-og.jpg`,
      twitter_card: 'summary_large_image'
    };
    
    // Extract path segments
    const segments = path.split('/').filter(Boolean);
    
    // Blog post - If path is like /blog/[slug]
    if (segments.length === 2 && segments[0] === 'blog') {
      const slug = segments[1];
      const post = await Post.findOne({ slug }).populate('author').lean();
      
      if (post) {
        meta = {
          title: `${post.title} | Tech Blog`,
          description: post.excerpt || post.content.substring(0, 160),
          keywords: post.tags ? post.tags.join(', ') : 'blog, article, tech',
          og_type: 'article',
          og_image: post.thumbnail ? post.thumbnail.url : meta.og_image,
          article_published_time: post.createdAt,
          article_modified_time: post.updatedAt,
          article_author: post.author ? post.author.name : 'Tech Blog',
          article_section: post.category,
          twitter_card: 'summary_large_image'
        };
      }
    }
    
    // Category page - If path is like /blog/category/[slug]
    else if (segments.length === 3 && segments[0] === 'blog' && segments[1] === 'category') {
      const slug = segments[2];
      const category = await Category.findOne({ slug }).lean();
      
      if (category) {
        meta = {
          title: `${category.name} | Tech Blog Categories`,
          description: `Browse all articles in the ${category.name} category.`,
          keywords: `${category.name}, blog, category, tech articles`,
          og_type: 'website',
          twitter_card: 'summary'
        };
      }
    }
    
    // Author page - If path is like /author/[slug]
    else if (segments.length === 2 && segments[0] === 'author') {
      const username = segments[1];
      const author = await User.findOne({ 
        $or: [{ username }, { slug: username }] 
      }).lean();
      
      if (author) {
        meta = {
          title: `${author.name} | Tech Blog Author`,
          description: author.bio || `Articles by ${author.name}`,
          keywords: `${author.name}, author, tech blog, articles`,
          og_type: 'profile',
          og_image: author.avatar || meta.og_image,
          twitter_card: 'summary'
        };
      }
    }
    
    // About page
    else if (path === '/about') {
      meta = {
        title: 'About Us | Tech Blog',
        description: 'Learn more about Tech Blog, our mission, and our team.',
        keywords: 'about, tech blog, team, mission, vision',
        og_type: 'website',
        twitter_card: 'summary'
      };
    }
    
    // Contact page
    else if (path === '/contact') {
      meta = {
        title: 'Contact Us | Tech Blog',
        description: 'Get in touch with the Tech Blog team.',
        keywords: 'contact, tech blog, support, message',
        og_type: 'website',
        twitter_card: 'summary'
      };
    }
    
    // Return meta information
    res.json({
      success: true,
      meta
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error generating meta information',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/seo/prerender
 * @desc    Prerender page content for search engines
 * @access  Public
 */
router.get('/prerender', async (req, res) => {
  const { path } = req.query;
  
  if (!path) {
    return res.status(400).json({ message: 'Path parameter is required' });
  }
  
  try {
    // Generate pre-rendered HTML based on the path
    let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tech Blog | Loading...</title>
</head>
<body>
  <h1>Tech Blog</h1>
  <p>Please wait while we load the content...</p>
  <script>window.location.href="${path}";</script>
</body>
</html>`;
    
    // Extract path segments
    const segments = path.split('/').filter(Boolean);
    
    // Blog post - If path is like /blog/[slug]
    if (segments.length === 2 && segments[0] === 'blog') {
      const slug = segments[1];
      const post = await Post.findOne({ slug })
        .populate('author')
        .populate('category')
        .lean();
      
      if (post) {
        html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${post.title} | Tech Blog</title>
  <meta name="description" content="${post.excerpt || post.content.substring(0, 160)}">
  <meta name="keywords" content="${post.tags ? post.tags.join(', ') : 'blog, article, tech'}">
  <link rel="canonical" href="${req.protocol}://${req.get('host')}/blog/${post.slug}">
</head>
<body>
  <article>
    <h1>${post.title}</h1>
    <div>By ${post.author ? post.author.name : 'Unknown'} | Published on ${new Date(post.createdAt).toLocaleDateString()}</div>
    <div>${post.content}</div>
  </article>
  <script>window.location.href="${path}";</script>
</body>
</html>`;
      }
    }
    
    // Return pre-rendered HTML
    res.header('Content-Type', 'text/html').send(html);
  } catch (error) {
    res.status(500).send(`
      <html>
        <head><title>Error | Tech Blog</title></head>
        <body>
          <h1>Error rendering page</h1>
          <p>${error.message}</p>
          <script>window.location.href="${path}";</script>
        </body>
      </html>
    `);
  }
});

module.exports = router; 