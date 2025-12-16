const jwt = require('jsonwebtoken');
const { validateDeviceId } = require('../services/PromarkUsers');

const verifyJWT = (req, res, next) => {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  const deviceId = req.headers['x-device-id'];

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

    // Validate device ID against database (ensures session is from same device)
    // This allows multiple tabs on same machine but blocks different machines
    if (deviceId) {
      try {
        const isValidDevice = await validateDeviceId(decoded.UserInfo.username, deviceId);
        if (!isValidDevice) {
          return res.status(403).json({
            message: 'Session invalidated - logged in from another device',
            code: 'SESSION_INVALIDATED'
          });
        }
      } catch (dbError) {
        console.error('Error validating device:', dbError);
        // Allow request to proceed if DB check fails (fail open for availability)
      }
    }

    // Attach user info to request object
    req.user = decoded.UserInfo.username;
    req.roles = decoded.UserInfo.roles;

    next();
  });
};

module.exports = verifyJWT;
