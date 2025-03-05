const mongoose = require('mongoose');
const slugify = require('slugify');

// Comment schema (embedded)
const CommentSchema = new mongoose.Schema(
  {
    content: {
      type: String,
      required: [true, 'Please add comment content'],
      trim: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    }
  },
  { timestamps: true }
);

// Post schema
const PostSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please add a title'],
      trim: true,
      maxlength: [200, 'Title cannot be more than 200 characters'],
    },
    slug: {
      type: String,
      unique: true,
    },
    content: {
      type: String,
      required: [true, 'Please add content'],
    },
    excerpt: {
      type: String,
      maxlength: [500, 'Excerpt cannot be more than 500 characters'],
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
    },
    tags: [String],
    published: {
      type: Boolean,
      default: false,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    comments: [CommentSchema],
    images: [
      {
        url: {
          type: String,
          required: true,
        },
        alt: {
          type: String,
          default: '',
        },
      },
    ],
    thumbnail: {
      type: {
        url: String,
        alt: String
      },
      required: false,  // Make the entire thumbnail field optional
      default: undefined // Explicitly set default to undefined
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Create a slug from the title before save
PostSchema.pre('save', function (next) {
  if (this.isNew || this.isModified('title')) {
    this.slug = slugify(this.title, {
      lower: true,
      strict: true,
    });
    
    // Add random string to ensure uniqueness
    if (this.isNew) {
      this.slug += '-' + Math.floor(Math.random() * 1000).toString();
    }
  }

  // Generate excerpt from content if not provided
  if (!this.excerpt && this.content) {
    // Remove html tags and limit to 300 chars
    this.excerpt = this.content
      .replace(/<\/?[^>]+(>|$)/g, '') // Remove HTML tags
      .substring(0, 300)
      .trim();
      
    // Add ellipsis if content was truncated
    if (this.content.length > 300) {
      this.excerpt += '...';
    }
  }

  next();
});

// Improved pre-save hook for thumbnail validation
PostSchema.pre('save', function(next) {
  // If thumbnail exists but has no URL, completely remove it
  if (this.thumbnail && (!this.thumbnail.url || this.thumbnail.url === 'undefined')) {
    console.log('Removing invalid thumbnail during save');
    this.thumbnail = undefined; // This doesn't fully remove it from the document
    this.set('thumbnail', undefined); // Use this approach to fully remove the field
  }
  
  // Set thumbnail from content images if appropriate
  if (!this.thumbnail && this.content) {
    try {
      // Look for images in content
      const contentImageMatches = this.content.match(/<img[^>]+src="([^">]+)"/);
      if (contentImageMatches && contentImageMatches[1]) {
        let imgSrc = contentImageMatches[1];
        
        // Normalize the path
        if (imgSrc.startsWith('../uploads/') || imgSrc.startsWith('../../uploads/')) {
          imgSrc = imgSrc.replace(/(\.\.\/)+uploads\//, '/uploads/');
        } else if (imgSrc.startsWith('/api/uploads/')) {
          imgSrc = imgSrc.replace('/api/uploads/', '/uploads/');
        }
        
        // Only set if it's a local upload path
        if (imgSrc.startsWith('/uploads/')) {
          console.log('Setting thumbnail from content image:', imgSrc);
          this.thumbnail = {
            url: imgSrc,
            alt: this.title || 'Blog post image'
          };
        }
      }
    } catch (error) {
      console.error('Error setting thumbnail from content:', error);
    }
  }
  
  next();
});

// Modify the post-save hook for better diagnostics
PostSchema.post('save', function(doc) {
  if (doc.images?.length > 0 && !doc.thumbnail) {
    console.log('WARNING: Post has images but no thumbnail was set!');
  }
  
  if (doc.thumbnail) {
    // Verify the thumbnail is valid
    if (!doc.thumbnail.url) {
      console.log('WARNING: Post saved with invalid thumbnail (no URL)');
    } else {
      console.log('Post saved with valid thumbnail:', doc.thumbnail.url);
    }
  } else {
    console.log('Post saved without thumbnail');
  }
});

module.exports = mongoose.model('Post', PostSchema);
