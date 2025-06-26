const handleAsync = (fn) => async (req, res, next) => {
    try {
        await fn(req, res, next);
    } catch (err) {
        console.error('Error in async handler:', err);
        
        // Only send response if headers haven't been sent already
        if (!res.headersSent) {
            res.status(500).json({ message: 'Internal server error' });
        }
        
        // Pass error to Express error handling middleware
        next(err);
    }
};

module.exports = handleAsync;