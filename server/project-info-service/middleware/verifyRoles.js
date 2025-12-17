/**
 * Role Verification Middleware
 *
 * Checks if the user has at least one of the required roles.
 * Must be used after gatewayAuth middleware.
 */
const verifyRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req?.roles) {
      return res.status(401).json({ message: 'Unauthorized - No roles found' });
    }

    const rolesArray = [...allowedRoles];
    const hasRole = req.roles.some(role => rolesArray.includes(role));

    if (!hasRole) {
      return res.status(403).json({ message: 'Forbidden - Insufficient permissions' });
    }

    next();
  };
};

module.exports = verifyRoles;
