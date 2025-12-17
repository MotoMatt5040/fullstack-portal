// Role verification middleware for CallID Service
const verifyRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req?.roles) {
      return res.sendStatus(401);
    }

    const hasPermission = req.roles.some((role) => allowedRoles.includes(role));

    if (hasPermission) {
      next();
    } else {
      res.sendStatus(401);
    }
  };
};

module.exports = verifyRoles;
