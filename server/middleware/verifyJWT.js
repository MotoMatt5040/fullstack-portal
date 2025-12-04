const jwt = require('jsonwebtoken');

const verifyJWT = (req, res, next) => {
  const authHeader = req.headers.authorization || req.headers.Authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authorization required' });
  }

  const token = authHeader.split(' ')[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      // Differentiate between expired and invalid tokens
      if (err.name === 'TokenExpiredError') {
        return res.status(403).json({ message: 'Token expired', code: 'TOKEN_EXPIRED' });
      }
      return res.status(403).json({ message: 'Invalid token', code: 'INVALID_TOKEN' });
    }

    // Validate token structure
    if (!decoded?.UserInfo?.username || !decoded?.UserInfo?.roles) {
      return res.status(403).json({ message: 'Malformed token', code: 'MALFORMED_TOKEN' });
    }

    // Attach user info to request object
    req.user = decoded.UserInfo.username;
    req.roles = decoded.UserInfo.roles;

    next();
  });
};

module.exports = verifyJWT;
