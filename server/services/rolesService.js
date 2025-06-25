// server/services/rolesService.js

// Import the tblRoles model from your central model loader
const { tblRoles } = require('../models');

/**
 * Fetches all possible roles from the tblRoles table using Sequelize.
 * @returns {Promise<Array<{RoleID: number, RoleName: string}>>} A promise that resolves to an array of role objects.
 */
const getAllRoles = async () => {
    try {
        // Use the Sequelize findAll method to get all roles
        const roles = await tblRoles.findAll({
            // Specify which columns to return
            attributes: ['RoleID', 'RoleName']
        });
        return roles;
    } catch (error) {
        // Log the error and re-throw it to be handled by your async error wrapper
        console.error("Error in getAllRoles service:", error);
        throw error;
    }
};

module.exports = {
    getAllRoles
};