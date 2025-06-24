const sql = require('mssql');
const withDbConnection = require('../config/dbConn');
const { promark } = require('../utils/databaseTypes');

const getUserRoles = async (email) => {
  return withDbConnection({
    database: promark,
    queryFn: async (pool) => {
      const result = await pool
        .request()
        .input('email', sql.NVarChar, email)
        .query(
          'SELECT role FROM tblUserRoles ur INNER JOIN tblAuthentication a ON ur.uuid = a.uuid WHERE a.email = @email'
        );
      return result.recordset.map((row) => parseInt(row.role, 10)); // Convert roles to integers
    },
    fnName: 'getUserRoles',
  });
};



module.exports = {
  getUserRoles,
};
