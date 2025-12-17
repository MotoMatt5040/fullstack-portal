// Gateway Auth Middleware
// Trusts headers set by the auth-gateway via Caddy forward_auth

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

// Role verification middleware
const verifyRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req?.roles || req.roles.length === 0) {
      return res.status(401).json({ message: 'No roles found' });
    }

    const hasPermission = req.roles.some((role) => allowedRoles.includes(role));

    if (hasPermission) {
      next();
    } else {
      res.status(403).json({ message: 'Insufficient permissions' });
    }
  };
};

module.exports = { gatewayAuth, verifyRoles };
