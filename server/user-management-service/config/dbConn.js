const sql = require('mssql');

// Database configurations
const promarkConfig = {
  server: process.env.PROMARK_DB_SERVER,
  database: process.env.PROMARK_DB_NAME || 'CaligulaD',
  user: process.env.PROMARK_DB_USER,
  password: process.env.PROMARK_DB_PASSWORD,
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
    connectTimeout: 30000,
    requestTimeout: 60000,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

// Connection pools
let promarkPool = null;

/**
 * Get or create promark pool
 */
const getPromarkPool = async () => {
  if (!promarkPool) {
    promarkPool = await new sql.ConnectionPool(promarkConfig).connect();
    console.log('User Management Service: Connected to PROMARK database');
  }
  return promarkPool;
};

/**
 * Close all database pools
 */
const closeAllPools = async () => {
  if (promarkPool) {
    await promarkPool.close();
    promarkPool = null;
    console.log('User Management Service: Closed PROMARK database connection');
  }
};

/**
 * Execute query with database connection
 * @param {Object} options - Query options
 * @param {string} options.database - Database type ('promark')
 * @param {Function} options.queryFn - Query function that receives pool
 * @param {string} options.fnName - Function name for logging
 * @returns {Promise} - Query result
 */
const withDbConnection = async ({ database, queryFn, fnName = 'unknown' }) => {
  try {
    let pool;
    if (database === 'promark') {
      pool = await getPromarkPool();
    } else {
      throw new Error(`Unknown database type: ${database}`);
    }

    return await queryFn(pool);
  } catch (error) {
    console.error(`Database error in ${fnName}:`, error);
    throw error;
  }
};

module.exports = withDbConnection;
module.exports.closeAllPools = closeAllPools;
module.exports.sql = sql;
