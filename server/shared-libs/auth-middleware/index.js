// @internal/auth-middleware - Shared JWT and role verification
const jwt = require('jsonwebtoken');

/**
 * Creates a JWT verification middleware
 * @param {Object} options - Configuration options
 * @param {Function} options.validateDeviceId - Optional async function to validate device ID
 * @returns {Function} Express middleware
 */
const createVerifyJWT = (options = {}) => {
  const { validateDeviceId } = options;

  return (req, res, next) => {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    const deviceId = req.headers['x-device-id'];

    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authorization required' });
    }

    const token = authHeader.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, async (err, decoded) => {
      if (err) {
        if (err.name === 'TokenExpiredError') {
          return res.status(403).json({ message: 'Token expired', code: 'TOKEN_EXPIRED' });
        }
        return res.status(403).json({ message: 'Invalid token', code: 'INVALID_TOKEN' });
      }

      // Validate token structure
      if (!decoded?.UserInfo?.username || !decoded?.UserInfo?.roles) {
        return res.status(403).json({ message: 'Malformed token', code: 'MALFORMED_TOKEN' });
      }

      // Optional device ID validation
      if (deviceId && validateDeviceId) {
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
          // Fail open for availability
        }
      }

      // Attach user info to request object
      req.user = decoded.UserInfo.username;
      req.roles = decoded.UserInfo.roles;

      next();
    });
  };
};

/**
 * Simple JWT verification without device validation
 * Use this for microservices that don't need device ID checking
 */
const verifyJWT = createVerifyJWT();

/**
 * Role verification middleware factory
 * @param  {...number} allowedRoles - Role IDs that are allowed
 * @returns {Function} Express middleware
 */
const verifyRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req?.roles) {
      return res.sendStatus(401);
    }

    const hasPermission = req.roles.some(role => allowedRoles.includes(role));

    if (hasPermission) {
      next();
    } else {
      res.sendStatus(401);
    }
  };
};

/**
 * Async error handler wrapper for controllers
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Express middleware that catches errors
 */
const handleAsync = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

/**
 * Global error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err.message);
  console.error(err.stack);

  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';

  res.status(status).json({
    error: true,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

/**
 * Gateway Auth Middleware
 * Trusts headers set by the auth-gateway via Caddy forward_auth
 */
const gatewayAuth = (req, res, next) => {
  const isAuthenticated = req.headers['x-user-authenticated'] === 'true';

  if (!isAuthenticated) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  // Parse user info from gateway headers
  req.user = req.headers['x-user-name'] || '';

  try {
    req.roles = JSON.parse(req.headers['x-user-roles'] || '[]');
  } catch {
    req.roles = [];
  }

  next();
};

module.exports = {
  createVerifyJWT,
  verifyJWT,
  verifyRoles,
  handleAsync,
  errorHandler,
  gatewayAuth,
};
