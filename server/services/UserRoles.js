const sql = require('mssql');
const withDbConnection = require('../config/dbConn');
const { promark } = require('../utils/databaseTypes');
const { tblUserRoles, tblAuthentication } = require('../models');

// const getUserRoles = async (email) => {
//   return withDbConnection({
//     database: promark,
//     queryFn: async (pool) => {
//       const result = await pool
//         .request()
//         .input('email', sql.NVarChar, email)
//         .query(
//           'SELECT role FROM tblUserRoles ur INNER JOIN tblAuthentication a ON ur.uuid = a.uuid WHERE a.email = @email'
//         );
//       return result.recordset.map((row) => parseInt(row.role, 10)); // Convert roles to integers
//     },
//     fnName: 'getUserRoles',
//   });
// };

const getUserRoles = async (email) => {
    try {
        const userRoles = await tblUserRoles.findAll({
            // Select only the 'role' column
            attributes: ['role'],
            // Define the INNER JOIN to tblAuthentication
            include: [{
                model: tblAuthentication,
                as: 'uu',          // Use the alias defined in init-models.js
                required: true,   // This makes it an INNER JOIN
                attributes: [],   // We don't need any columns from tblAuthentication itself
                where: {
                    email: email  // Apply the WHERE clause on the joined table
                }
            }]
        });

        // Map the array of objects to an array of integers, e.g., [{role: 1}, {role: 2}] -> [1, 2]
        return userRoles.map(userRole => userRole.role);

    } catch (error) {
        console.error("Error in getUserRoles service:", error);
        throw error; // Propagate the error to the controller's error handler
    }
};



module.exports = {
  getUserRoles,
};
