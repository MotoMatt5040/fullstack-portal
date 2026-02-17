// @internal/roles-config - Dynamic roles loaded from database
const sql = require('mssql');

// This object will be populated at startup
const ROLES_LIST = {};

// Database config for FAJITA (where Roles table lives)
const getFajitaConfig = () => ({
  user: process.env.PROMARK_DB_USER,
  password: process.env.PROMARK_DB_PASSWORD,
  server: process.env.PROMARK_DB_SERVER,
  database: 'FAJITA',
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
  pool: {
    max: 10,
    idleTimeoutMillis: 30000,
    acquireTimeoutMillis: 60000,
  },
  requestTimeout: 30000,
});

let fajitaPool = null;

/**
 * Get or create the FAJITA database pool
 */
const getFajitaPool = async () => {
  if (!fajitaPool) {
    fajitaPool = await new sql.ConnectionPool(getFajitaConfig()).connect();
    console.log('Connected to FAJITA database for roles');
  }
  return fajitaPool;
};

/**
 * Fetch all roles from Roles table using raw SQL (no Sequelize dependency)
 */
const getAllRoles = async () => {
  const pool = await getFajitaPool();
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

/**
 * Close the roles database pool (for graceful shutdown)
 */
const closeRolesPool = async () => {
  if (fajitaPool) {
    await fajitaPool.close();
    fajitaPool = null;
    console.log('Closed roles database connection');
  }
};

module.exports = {
  ROLES_LIST,
  initializeRoles,
  closeRolesPool,
  getAllRoles,
};
