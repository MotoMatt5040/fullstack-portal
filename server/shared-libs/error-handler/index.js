/**
 * Shared Error Handler Middleware
 * Handles common error types across all microservices
 */

const errorHandler = (err, req, res, next) => {
  // Log the error
  console.error(`[${req.method}] ${req.path} - Error:`, err.message);
  if (process.env.NODE_ENV === 'development') {
    console.error('Stack:', err.stack);
  }

  // CORS errors
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      message: 'CORS not allowed',
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token',
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired',
    });
  }

  // Sequelize validation errors
  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: err.errors?.map((e) => e.message) || [],
    });
  }

  // Sequelize unique constraint errors
  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({
      success: false,
      message: 'Resource already exists',
    });
  }

  // MSSQL errors
  if (err.name === 'RequestError' || err.code === 'EREQUEST') {
    return res.status(500).json({
      success: false,
      message: 'Database query error',
    });
  }

  if (err.name === 'ConnectionError' || err.code === 'ECONNREFUSED') {
    return res.status(503).json({
      success: false,
      message: 'Database connection error',
    });
  }

  // Default error response
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    message: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = errorHandler;
