const allowedOrigins = require('../config/allowedOrigins');

// THIS IS A PREFLIGHT
const credentials = (req, res, next) => {
    const origin = req.headers.origin;
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
        // res.header('Access-Control-Allow-Origin', origin);
        // res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
        // res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.header('Access-Control-Allow-Credentials', true);
    }
    next();
}

module.exports = credentials;