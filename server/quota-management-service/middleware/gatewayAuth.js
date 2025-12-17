/**
 * Gateway authentication middleware
 * Reads user info from headers set by auth-gateway after forward_auth validation
 */
const gatewayAuth = (req, res, next) => {
  const isAuthenticated = req.headers['x-user-authenticated'];
  const username = req.headers['x-user-name'];
  const roles = req.headers['x-user-roles'];

  if (isAuthenticated !== 'true' || !username) {
    return res.status(401).json({ message: 'Unauthorized - Authentication required' });
  }

  req.user = username;
  req.roles = roles ? roles.split(',').map(Number) : [];

  next();
};

module.exports = gatewayAuth;
