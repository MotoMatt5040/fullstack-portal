// Notification Service - rolesConfig.js

const { withDbConnection } = require('./dbConn');

// This object will be populated at startup from the database
const ROLES_LIST = {};

/**
 * Initializes the ROLES_LIST object by fetching roles from the PROMARK database.
 * This function should be called once when the application starts.
 */
const initializeRoles = async () => {
  try {
    console.log('Initializing application roles from database...');

    const rolesFromDb = await withDbConnection({
      queryFn: async (pool) => {
        const result = await pool.request().query('SELECT RoleID, RoleName FROM tblRoles');
        return result.recordset;
      },
      fnName: 'getAllRoles',
    });

    if (!rolesFromDb || rolesFromDb.length === 0) {
      throw new Error('No roles were found in the database. Check the tblRoles table.');
    }

    // Transform the array from the DB into the required { RoleName: RoleID } object
    rolesFromDb.forEach((role) => {
      ROLES_LIST[role.RoleName] = role.RoleID;
    });

    console.log('Roles successfully loaded:', Object.keys(ROLES_LIST).join(', '));
  } catch (error) {
    console.error('FATAL ERROR: Could not initialize roles from the database.');
    console.error(error);
    process.exit(1);
  }
};

module.exports = { ROLES_LIST, initializeRoles };
