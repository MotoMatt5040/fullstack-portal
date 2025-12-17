const withDbConnection = require('./dbConn');

// Roles list will be populated from database
let ROLES_LIST = {};

/**
 * Initialize roles from database
 */
const initializeRoles = async () => {
  try {
    const roles = await withDbConnection({
      database: 'promark',
      queryFn: async (pool) => {
        const result = await pool.request().query('SELECT roleid, roleName FROM tblRoles');
        return result.recordset;
      },
      fnName: 'initializeRoles',
    });

    // Build ROLES_LIST object
    ROLES_LIST = {};
    roles.forEach((role) => {
      // Convert role name to PascalCase for key
      const key = role.roleName.replace(/\s+/g, '');
      ROLES_LIST[key] = role.roleid;
    });

    console.log('User Management Service: Roles initialized:', Object.keys(ROLES_LIST));
  } catch (error) {
    console.error('Failed to initialize roles:', error);
    // Set default roles as fallback
    ROLES_LIST = {
      Admin: 5150,
      Executive: 1001,
      Programmer: 2001,
      External: 3001,
    };
    console.log('Using fallback roles');
  }
};

module.exports = { ROLES_LIST, initializeRoles };
