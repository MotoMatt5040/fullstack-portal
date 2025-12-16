const jwt = require('jsonwebtoken');
const { validateAccessToken } = require('../services/PromarkUsers');

const verifyJWT = (req, res, next) => {
  const authHeader = req.headers.authorization || req.headers.Authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authorization required' });
  }

  const token = authHeader.split(' ')[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, async (err, decoded) => {
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

    // Validate access token against database (ensures session is still valid)
    // This invalidates tokens when user logs in from another location
    try {
      const isValidSession = await validateAccessToken(decoded.UserInfo.username, token);
      if (!isValidSession) {
        return res.status(403).json({
          message: 'Session invalidated - logged in from another location',
          code: 'SESSION_INVALIDATED'
        });
      }
    } catch (dbError) {
      console.error('Error validating session:', dbError);
      // Allow request to proceed if DB check fails (fail open for availability)
    }

    // Attach user info to request object
    req.user = decoded.UserInfo.username;
    req.roles = decoded.UserInfo.roles;

    next();
  });
};

module.exports = verifyJWT;
