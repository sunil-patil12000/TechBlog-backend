class ErrorResponse extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    
    // Capture stack trace (helps with debugging)
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = ErrorResponse;
