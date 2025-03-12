/**
 * Response Handler Utility
 * 
 * Provides standardized methods for API responses
 */

/**
 * Send a success response
 * 
 * @param {Object} res - Express response object
 * @param {number} statusCode - HTTP status code (default: 200)
 * @param {string} message - Success message
 * @param {Object|Array} data - Response data
 * @param {Object} meta - Metadata like pagination
 */
const success = (res, { statusCode = 200, message = 'Success', data = null, meta = null }) => {
  const response = {
    success: true,
    message
  };

  if (data !== null) {
    response.data = data;
  }

  if (meta !== null) {
    response.meta = meta;
  }

  return res.status(statusCode).json(response);
};

/**
 * Send an error response
 * 
 * @param {Object} res - Express response object
 * @param {number} statusCode - HTTP status code (default: 500)
 * @param {string} message - Error message
 * @param {Object} error - Error details
 * @param {Object} meta - Additional metadata
 */
const error = (res, { statusCode = 500, message = 'Server Error', error = null, meta = null }) => {
  const response = {
    success: false,
    message
  };

  if (process.env.NODE_ENV !== 'production' && error) {
    response.error = typeof error === 'object' ? error.message || error.toString() : error;
    
    // Add stack trace in development for debugging
    if (error.stack) {
      response.stack = error.stack;
    }
  }

  if (meta !== null) {
    response.meta = meta;
  }

  return res.status(statusCode).json(response);
};

/**
 * Send a not found response
 * 
 * @param {Object} res - Express response object
 * @param {string} message - Not found message
 */
const notFound = (res, message = 'Resource not found') => {
  return error(res, { statusCode: 404, message });
};

/**
 * Send a validation error response
 * 
 * @param {Object} res - Express response object
 * @param {Object} errors - Validation errors
 * @param {string} message - Validation error message
 */
const validationError = (res, errors, message = 'Validation failed') => {
  return error(res, { 
    statusCode: 400, 
    message, 
    error: { validation: errors } 
  });
};

/**
 * Send an unauthorized response
 * 
 * @param {Object} res - Express response object
 * @param {string} message - Unauthorized message
 */
const unauthorized = (res, message = 'Unauthorized access') => {
  return error(res, { statusCode: 401, message });
};

/**
 * Send a forbidden response
 * 
 * @param {Object} res - Express response object
 * @param {string} message - Forbidden message
 */
const forbidden = (res, message = 'Access forbidden') => {
  return error(res, { statusCode: 403, message });
};

/**
 * Create a paginated response
 * 
 * @param {Object} res - Express response object
 * @param {Array} data - Array of items
 * @param {Object} options - Pagination options
 * @param {string} message - Success message
 */
const paginated = (res, data, options, message = 'Success') => {
  const { 
    page = 1, 
    limit = 10, 
    totalItems,
    hasMore = null,
    baseUrl = null
  } = options;
  
  const pageNumber = parseInt(page);
  const pageSize = parseInt(limit);
  const totalPages = totalItems ? Math.ceil(totalItems / pageSize) : null;
  
  const meta = {
    pagination: {
      page: pageNumber,
      limit: pageSize
    }
  };
  
  if (totalItems !== undefined) {
    meta.pagination.totalItems = totalItems;
    meta.pagination.totalPages = totalPages;
  }
  
  if (hasMore !== null) {
    meta.pagination.hasMore = hasMore;
  }
  
  if (baseUrl && totalPages) {
    meta.pagination.links = {};
    
    // Current page link
    meta.pagination.links.self = `${baseUrl}?page=${pageNumber}&limit=${pageSize}`;
    
    // First page link
    meta.pagination.links.first = `${baseUrl}?page=1&limit=${pageSize}`;
    
    // Last page link
    meta.pagination.links.last = `${baseUrl}?page=${totalPages}&limit=${pageSize}`;
    
    // Next page link
    if (pageNumber < totalPages) {
      meta.pagination.links.next = `${baseUrl}?page=${pageNumber + 1}&limit=${pageSize}`;
    }
    
    // Previous page link
    if (pageNumber > 1) {
      meta.pagination.links.prev = `${baseUrl}?page=${pageNumber - 1}&limit=${pageSize}`;
    }
  }
  
  return success(res, { data, meta, message });
};

module.exports = {
  success,
  error,
  notFound,
  validationError,
  unauthorized,
  forbidden,
  paginated
}; 