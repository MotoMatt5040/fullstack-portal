const sql = require('mssql');

const promarkConfig = {
  server: process.env.PROMARK_DB_SERVER,
  database: process.env.PROMARK_DB_NAME || 'CaligulaD',
  user: process.env.PROMARK_DB_USER,
  password: process.env.PROMARK_DB_PASSWORD,
  options: {
    encrypt: true,
    trustServerCertificate: true,
    enableArithAbort: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
  requestTimeout: 300000,
};

const voxcoConfig = {
  server: process.env.VOXCO_HOST,
  database: process.env.VOXCO_DB,
  user: process.env.VOXCO_USER,
  password: process.env.VOXCO_PASSWORD,
  options: {
    encrypt: true,
    trustServerCertificate: true,
    enableArithAbort: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
  requestTimeout: 300000,
};

let promarkPoolCache = null;
let voxcoPoolCache = null;

const getPromarkPool = async () => {
  if (!promarkPoolCache) {
    promarkPoolCache = new sql.ConnectionPool(promarkConfig)
      .connect()
      .then((pool) => {
        console.log('Connected to PROMARK database');
        return pool;
      })
      .catch((err) => {
        console.error('PROMARK database connection failed:', err);
        promarkPoolCache = null;
        throw err;
      });
  }
  return promarkPoolCache;
};

const getVoxcoPool = async () => {
  if (!voxcoPoolCache) {
    voxcoPoolCache = new sql.ConnectionPool(voxcoConfig)
      .connect()
      .then((pool) => {
        console.log('Connected to VOXCO database');
        return pool;
      })
      .catch((err) => {
        console.error('VOXCO database connection failed:', err);
        voxcoPoolCache = null;
        throw err;
      });
  }
  return voxcoPoolCache;
};

const withDbConnection = async ({
  queryFn,
  fnName = 'anonymous',
  attempts = 3,
  allowAbort = false,
  allowRetry = true,
  database = 'promark',
}) => {
  const pool = database === 'voxco' ? await getVoxcoPool() : await getPromarkPool();

  let lastError;
  for (let i = 0; i < attempts; i++) {
    try {
      const result = await queryFn(pool);
      return result;
    } catch (error) {
      lastError = error;
      console.error(`[${fnName}] Attempt ${i + 1} failed:`, error.message);

      if (!allowRetry) break;

      // Reconnect pool if needed
      if (error.code === 'ECONNRESET' || error.code === 'ESOCKET') {
        if (database === 'voxco') {
          voxcoPoolCache = null;
          await getVoxcoPool();
        } else {
          promarkPoolCache = null;
          await getPromarkPool();
        }
      }
    }
  }

  if (allowAbort) {
    return 499;
  }
  throw lastError;
};

const closeAllPools = async () => {
  if (promarkPoolCache) {
    const pool = await promarkPoolCache;
    await pool.close();
    promarkPoolCache = null;
    console.log('Closed PROMARK database connection');
  }
  if (voxcoPoolCache) {
    const pool = await voxcoPoolCache;
    await pool.close();
    voxcoPoolCache = null;
    console.log('Closed VOXCO database connection');
  }
};

// Export as default for existing service imports: const withDbConnection = require('./dbConn')
module.exports = withDbConnection;

// Also attach named exports for: const { withDbConnection } = require('./dbConn')
module.exports.withDbConnection = withDbConnection;
module.exports.getPromarkPool = getPromarkPool;
module.exports.getVoxcoPool = getVoxcoPool;
module.exports.closeAllPools = closeAllPools;
module.exports.sql = sql;
