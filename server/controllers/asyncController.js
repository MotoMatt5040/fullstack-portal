console.log('controllers/asyncController.js');
const handleAsync = (fn) => async (req, res) => {
    try {
        await fn(req, res);
    } catch (err) {
        console.error('Database query failed:', err);
        res.status(500).json({ message: 'Database query failed' });
        next(err);
    }
};

module.exports = handleAsync;