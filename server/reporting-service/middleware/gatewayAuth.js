/**
 * Gateway Authentication Middleware
 *
 * This middleware validates that requests come through the auth-gateway.
 * The auth-gateway handles JWT validation and forwards user info via headers.
 */
const gatewayAuth = (req, res, next) => {
  const isAuthenticated = req.headers['x-user-authenticated'] === 'true';

  if (!isAuthenticated) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  // Parse user info from gateway headers
  req.user = req.headers['x-user-name'] || '';

  // Parse roles - handle both JSON array and comma-separated formats
  const rolesHeader = req.headers['x-user-roles'];
  if (rolesHeader) {
    try {
      // Try JSON array first
      req.roles = JSON.parse(rolesHeader);
    } catch {
      // Fall back to comma-separated string
      req.roles = rolesHeader.split(',').map(r => parseInt(r.trim(), 10)).filter(r => !isNaN(r));
    }
  } else {
    req.roles = [];
  }

  next();
};

module.exports = gatewayAuth;
