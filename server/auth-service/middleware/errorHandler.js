// Auth Service - errorHandler.js

const errorHandler = (err, req, res, next) => {
    console.error('Error:', err.message);
    console.error('Stack:', err.stack);

    // CORS errors
    if (err.message === 'Not allowed by CORS') {
        return res.status(403).json({ message: 'CORS not allowed' });
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({ message: 'Invalid token' });
    }

    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Token expired' });
    }

    // Sequelize validation errors
    if (err.name === 'SequelizeValidationError') {
        return res.status(400).json({
            message: 'Validation error',
            errors: err.errors.map(e => e.message)
        });
    }

    // Sequelize unique constraint errors
    if (err.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({ message: 'Resource already exists' });
    }

    // Default error
    res.status(err.status || 500).json({
        message: err.message || 'Internal server error'
    });
};

module.exports = errorHandler;
