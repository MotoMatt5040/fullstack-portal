/**
 * Role verification middleware
 * Checks if user has any of the required roles
 * Works with gatewayAuth middleware which sets req.roles
 */
const verifyRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req?.roles || req.roles.length === 0) {
      return res.status(403).json({ message: 'Access denied - No roles assigned' });
    }

    const rolesArray = [...allowedRoles];
    const hasRole = req.roles.some((role) => rolesArray.includes(role));

    if (!hasRole) {
      return res.status(403).json({ message: 'Access denied - Insufficient permissions' });
    }

    next();
  };
};

module.exports = verifyRoles;
