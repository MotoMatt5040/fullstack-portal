const sql = require('mssql');
const withDbConnection = require('../config/dbConn'); // Adjust path to your db connection utility
const { promark } = require('../utils/databaseTypes'); // Adjust path to your database types

/**
 * Fetches all possible roles from the tblRoles table in the database.
 * This is intended for system-wide use, such as application initialization.
 * @returns {Promise<Array<{RoleID: number, RoleName: string}>>} A promise that resolves to an array of role objects.
 */
const getAllRoles = async () => {
    return withDbConnection({
        database: promark,
        queryFn: async (pool) => {
            const result = await pool
                .request()
                .query('SELECT RoleID, RoleName FROM tblRoles'); 
            return result.recordset;
        },
        fnName: 'getAllRoles', // Add a name for clear logging in your db connection wrapper
    })
};

module.exports = {
    getAllRoles
};