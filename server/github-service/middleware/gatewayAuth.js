/**
 * Gateway Authentication Middleware
 *
 * This middleware reads user information from headers set by the auth-gateway.
 * The auth-gateway validates JWTs and forwards user info via X-User-* headers.
 */
const gatewayAuth = (req, res, next) => {
  const isAuthenticated = req.headers['x-user-authenticated'] === 'true';
  const username = req.headers['x-user-name'];
  const rolesHeader = req.headers['x-user-roles'];

  if (!isAuthenticated || !username) {
    return res.status(401).json({ message: 'Unauthorized - Invalid gateway headers' });
  }

  // Parse roles from comma-separated string to array of numbers
  let roles = [];
  if (rolesHeader) {
    roles = rolesHeader.split(',').map((r) => parseInt(r.trim(), 10)).filter((r) => !isNaN(r));
  }

  // Attach user info to request object
  req.user = username;
  req.roles = roles;

  next();
};

module.exports = gatewayAuth;
