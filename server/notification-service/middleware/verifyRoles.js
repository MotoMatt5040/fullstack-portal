// Notification Service - verifyRoles.js

const verifyRoles = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req?.roles) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const rolesArray = [...allowedRoles];
        const result = req.roles.map(role => rolesArray.includes(role)).find(val => val === true);

        if (!result) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        next();
    };
};

module.exports = verifyRoles;
