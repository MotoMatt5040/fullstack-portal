const withDbConnection = require('./dbConn');

let ROLES_LIST = {};

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

    ROLES_LIST = {};
    roles.forEach((role) => {
      const key = role.roleName.replace(/\s+/g, '');
      ROLES_LIST[key] = role.roleid;
    });

    console.log('Quota Management Service: Roles initialized:', Object.keys(ROLES_LIST));
  } catch (error) {
    console.error('Failed to initialize roles:', error);
    ROLES_LIST = {
      Admin: 5150,
      Executive: 1001,
      Programmer: 2001,
      External: 3001,
      Manager: 4001,
    };
    console.log('Using fallback roles');
  }
};

module.exports = { ROLES_LIST, initializeRoles };
