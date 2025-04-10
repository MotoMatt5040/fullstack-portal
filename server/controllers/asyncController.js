console.log('controllers/asyncController.js');
const handleAsync = (fn) => async (req, res, next) => {
    try {
        await fn(req, res, next);
    } catch (err) {
        console.error('Database query failed:', err);
        res.status(500).json({ message: 'Database query failed' });
        next(err);
    }
};

module.exports = handleAsync;