// Project Publishing Service Roles Config - loads from PROMARK database
const withDbConnection = require('./dbConn');
const databaseTypes = require('./databaseTypes');

const ROLES_LIST = {};

const initializeRoles = async () => {
  try {
    console.log('Initializing application roles from database...');

    const rolesFromDb = await withDbConnection({
      database: databaseTypes.promark,
      queryFn: async (pool) => {
        const result = await pool.request().query('SELECT RoleID, RoleName FROM tblRoles');
        return result.recordset;
      },
      fnName: 'getAllRoles',
    });

    if (!rolesFromDb || rolesFromDb.length === 0) {
      throw new Error('No roles found in database. Check tblRoles table.');
    }

    // Clear and rebuild ROLES_LIST
    Object.keys(ROLES_LIST).forEach(key => delete ROLES_LIST[key]);

    rolesFromDb.forEach((role) => {
      ROLES_LIST[role.RoleName] = role.RoleID;
    });

    console.log('Roles successfully loaded:', Object.keys(ROLES_LIST).join(', '));
    return ROLES_LIST;
  } catch (error) {
    console.error('FATAL ERROR: Could not initialize roles from database.');
    console.error(error);
    throw error;
  }
};

module.exports = { ROLES_LIST, initializeRoles };
