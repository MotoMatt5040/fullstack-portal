const verifyRoles = (...allowedRoles) => {
    return (req, res, next) => {
        // Check if the roles array from the JWT even exists
        if (!req?.roles) {
            return res.sendStatus(401); // Unauthorized
        }

        // Check if user has any of the allowed roles
        const hasPermission = req.roles.some(role => allowedRoles.includes(role));

        if (hasPermission) {
            next(); // User has permission, proceed
        } else {
            res.sendStatus(401); // Unauthorized
        }
    };
};

module.exports = verifyRoles;