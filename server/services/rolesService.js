// server/services/rolesService.js

const withDbConnection = require('../config/dbConn');

/**
 * Fetches all possible roles from the Roles table in FAJITA.
 * @returns {Promise<Array<{RoleID: number, RoleName: string}>>} A promise that resolves to an array of role objects.
 */
const getAllRoles = async () => {
    try {
        return withDbConnection({
            database: 'fajita',
            queryFn: async (pool) => {
                const result = await pool.request().query('SELECT RoleID, RoleName FROM Roles');
                return result.recordset;
            },
            fnName: 'getAllRoles',
        });
    } catch (error) {
        console.error("Error in getAllRoles service:", error);
        throw error;
    }
};

module.exports = {
    getAllRoles
};
