// Import the ROLES_LIST that is populated on startup
const { ROLES_LIST } = require('../config/rolesConfig');

/**
 * Handles the request to get the application's role configuration.
 * This is a public endpoint used by the frontend to initialize its state.
 */
const getRolesConfig = (req, res) => {
    // Simply return the globally configured ROLES_LIST object
    if (Object.keys(ROLES_LIST).length === 0) {
        // This case should ideally not happen if startup was successful
        return res.status(500).json({ message: "Roles configuration is not available." });
    }
    return res.json(ROLES_LIST);
};

module.exports = { getRolesConfig };