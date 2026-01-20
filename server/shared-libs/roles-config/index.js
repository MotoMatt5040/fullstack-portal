// @internal/roles-config - Dynamic roles loaded from database
const sql = require('mssql');

// This object will be populated at startup
const ROLES_LIST = {};

// Database config for PROMARK (where tblRoles lives)
const getPromarkConfig = () => ({
  user: process.env.PROMARK_DB_USER,
  password: process.env.PROMARK_DB_PASSWORD,
  server: process.env.PROMARK_DB_SERVER,
  database: process.env.PROMARK_DB_NAME || 'CaligulaD',
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

let promarkPool = null;

/**
 * Get or create the PROMARK database pool
 */
const getPromarkPool = async () => {
  if (!promarkPool) {
    promarkPool = await new sql.ConnectionPool(getPromarkConfig()).connect();
    console.log('Connected to PROMARK database for roles');
  }
  return promarkPool;
};

/**
 * Fetch all roles from tblRoles using raw SQL (no Sequelize dependency)
 */
const getAllRoles = async () => {
  const pool = await getPromarkPool();
  const result = await pool.request().query('SELECT RoleID, RoleName FROM tblRoles');
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
      throw new Error('No roles found in database. Check tblRoles table.');
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
  if (promarkPool) {
    await promarkPool.close();
    promarkPool = null;
    console.log('Closed roles database connection');
  }
};

module.exports = {
  ROLES_LIST,
  initializeRoles,
  closeRolesPool,
  getAllRoles,
};
