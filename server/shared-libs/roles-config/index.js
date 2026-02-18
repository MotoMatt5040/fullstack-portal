// @internal/roles-config - Dynamic roles loaded from database
const { getPool } = require('../db-connection');

// This object will be populated at startup
const ROLES_LIST = {};

/**
 * Fetch all roles from Roles table using the shared FAJITA pool
 */
const getAllRoles = async () => {
  const pool = await getPool('fajita');
  const result = await pool.request().query('SELECT RoleID, RoleName FROM Roles');
  return result.recordset;
};

/**
 * Initialize ROLES_LIST from database
 * Call this once at service startup
 */
const initializeRoles = async () => {
  try {
    console.log('Initializing application roles from database...');
    const rolesFromDb = await getAllRoles();

    if (!rolesFromDb || rolesFromDb.length === 0) {
      throw new Error('No roles found in database. Check Roles table in FAJITA.');
    }

    // Clear and repopulate ROLES_LIST
    Object.keys(ROLES_LIST).forEach(key => delete ROLES_LIST[key]);

    rolesFromDb.forEach(role => {
      ROLES_LIST[role.RoleName] = role.RoleID;
    });

    console.log('Roles successfully loaded:', Object.entries(ROLES_LIST).map(([name, id]) => `${name}=${id}`).join(', '));
    return ROLES_LIST;
  } catch (error) {
    console.error('FATAL ERROR: Could not initialize roles from database.');
    console.error(error);
    throw error;
  }
};

module.exports = {
  ROLES_LIST,
  initializeRoles,
  getAllRoles,
};
