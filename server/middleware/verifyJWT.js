const jwt = require('jsonwebtoken');

const verifyJWT = (req, res, next) => {
    const authHeader = req.headers.authorization || req.headers.Authorization;  // Just in case the a is cap or lower
    if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ message: 'Not authorized' });
    const token = authHeader.split(' ')[1];
    jwt.verify(
        token,
        process.env.ACCESS_TOKEN_SECRET,
        (err, decoded) => {
            if (err) return res.status(403).json({ message: 'Forbidden' });
            req.user = decoded.UserInfo.username;
            req.roles = decoded.UserInfo.roles
            next();
        }
    )
}

module.exports = verifyJWT