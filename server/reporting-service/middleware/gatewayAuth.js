/**
 * Gateway Authentication Middleware
 *
 * This middleware validates that requests come through the auth-gateway.
 * The auth-gateway handles JWT validation and forwards user info via headers.
 */
const gatewayAuth = (req, res, next) => {
  // Check for user info headers set by auth-gateway
  const userId = req.headers['x-user-id'];
  const userRoles = req.headers['x-user-roles'];
  const username = req.headers['x-user-name'];

  if (!userId || !userRoles) {
    return res.status(401).json({
      message: 'Unauthorized - Missing gateway authentication headers'
    });
  }

  // Parse roles from comma-separated string to array of numbers
  const roles = userRoles.split(',').map(role => parseInt(role.trim(), 10));

  // Attach user info to request object
  req.user = userId;
  req.roles = roles;
  req.username = username;

  next();
};

module.exports = gatewayAuth;
