// @internal/db-connection - Shared database connection utilities
const sql = require('mssql');

// Database configurations - built from environment variables
const buildDbConfigs = () => {
  let VOXCO_PASSWORD = process.env.VOXCO_DB_PASSWORD;
  if (process.env.ENVIRONMENT === 'production') {
    VOXCO_PASSWORD = process.env.VOXCO_DB_PROD_PASSWORD;
  }

  return {
    caligulad: {
      user: process.env.PROMARK_DB_USER,
      password: process.env.PROMARK_DB_PASSWORD,
      server: process.env.PROMARK_DB_SERVER,
      database: 'CaligulaD',
      options: {
        encrypt: true,
        trustServerCertificate: true,
      },
      pool: {
        max: 50,
        idleTimeoutMillis: 30000,
        acquireTimeoutMillis: 60000,
      },
      requestTimeout: 300000,
    },
    fajita: {
      user: process.env.PROMARK_DB_USER,
      password: process.env.PROMARK_DB_PASSWORD,
      server: process.env.PROMARK_DB_SERVER,
      database: 'FAJITA',
      options: {
        encrypt: true,
        trustServerCertificate: true,
      },
      pool: {
        max: 50,
        idleTimeoutMillis: 30000,
        acquireTimeoutMillis: 60000,
      },
      requestTimeout: 300000,
    },
    voxco: {
      user: process.env.VOXCO_DB_USER,
      password: VOXCO_PASSWORD,
      server: process.env.VOXCO_DB_SERVER,
      database: process.env.VOXCO_DB_NAME,
      options: {
        encrypt: true,
        trustServerCertificate: true,
      },
      pool: {
        max: 50,
        idleTimeoutMillis: 30000,
        acquireTimeoutMillis: 60000,
      },
      requestTimeout: 300000,
    },
  };
};

let dbConfigs = null;
let currentRequest = null;
let currentRequestVersion = 0;
const poolCache = {};

// Initialize configs lazily
const getConfigs = () => {
  if (!dbConfigs) {
    dbConfigs = buildDbConfigs();
  }
  return dbConfigs;
};

const getPool = async (database) => {
  const configs = getConfigs();

  if (!configs[database]) {
    throw new Error(`Unknown database config: ${database}`);
  }

  if (!poolCache[database]) {
    poolCache[database] = new sql.ConnectionPool(configs[database])
      .connect()
      .then((pool) => {
        console.log(`Connected to ${database} database`);
        return pool;
      })
      .catch((err) => {
        console.error(`Database connection failed for ${database}:`, err);
        delete poolCache[database];
        throw err;
      });
  }

  return poolCache[database];
};

const withDbConnection = async ({
  database,
  queryFn,
  attempts = 5,
  fnName = 'anonymous',
  allowAbort = false,
  allowRetry = false,
}) => {
  const pool = await getPool(database);

  const controller = new AbortController();
  const signal = controller.signal;
  const requestVersion = ++currentRequestVersion;

  // Only abort previous request if allowAbort is true
  if (allowAbort && currentRequest) {
    console.log(`Cancelling previous request for ${fnName}...`);
    currentRequest.abort();
  }

  // Only track currentRequest if aborting is allowed
  if (allowAbort) {
    currentRequest = controller;
  }

  try {
    const res = await queryFn(pool, signal);

    if (allowAbort && requestVersion !== currentRequestVersion) {
      console.log(`Response for ${fnName} is outdated, ignoring...`);
      return;
    }

    const isEmptyResult = Array.isArray(res) && res.length === 0;

    if (isEmptyResult && attempts > 0 && allowRetry) {
      console.warn(
        `Query returned no results. Retrying... (${6 - attempts} of 5) - ${fnName}`
      );
      await new Promise((resolve) => setTimeout(resolve, 100));

      if (allowAbort && signal.aborted) {
        console.log(`Request for ${fnName} was canceled, not retrying.`);
        return 499;
      }

      return withDbConnection({
        database,
        queryFn,
        attempts: attempts - 1,
        fnName,
        allowAbort,
        allowRetry,
      });
    }

    return res;
  } catch (err) {
    console.error('Database query failed:', err);
    console.error(`Error in ${fnName}:`, err.message);
    throw err;
  } finally {
    if (allowAbort && currentRequest === controller) {
      currentRequest = null;
    }
  }
};

// Database type constants
const DATABASE_TYPES = {
  CALIGULAD: 'caligulad',
  FAJITA: 'fajita',
  VOXCO: 'voxco',
};

// Close all pools (useful for graceful shutdown)
const closeAllPools = async () => {
  const closePromises = Object.entries(poolCache).map(async ([name, poolPromise]) => {
    try {
      const pool = await poolPromise;
      await pool.close();
      console.log(`Closed ${name} database connection`);
    } catch (err) {
      console.error(`Error closing ${name} pool:`, err);
    }
  });
  await Promise.all(closePromises);
};

module.exports = {
  withDbConnection,
  getPool,
  closeAllPools,
  DATABASE_TYPES,
  sql,
};
