const roleService = require('../services/rolesService'); // Import the new service

// This object will be populated at startup and then exported for use in your application.
const ROLES_LIST = {};

/**
 * Initializes the ROLES_LIST object by fetching roles from the database via the roleService.
 * This function should be called once when the application starts.
 */
const initializeRoles = async () => {
    try {
        console.log('Initializing application roles from database...');
        const rolesFromDb = await roleService.getAllRoles();

        if (!rolesFromDb || rolesFromDb.length === 0) {
            throw new Error("No roles were found in the database. Check the Roles table in FAJITA.");
        }

        // Transform the array from the DB into the required { RoleName: RoleID } object
        rolesFromDb.forEach(role => {
            ROLES_LIST[role.RoleName] = role.RoleID;
        });

        console.log('Roles successfully loaded and configured.');

    } catch (error) {
        console.error('FATAL ERROR: Could not initialize roles from the database.');
        console.error(error);
        // Exit the process because the application cannot function correctly without roles.
        process.exit(1);
    }
};

module.exports = {
    ROLES_LIST,
    initializeRoles
};