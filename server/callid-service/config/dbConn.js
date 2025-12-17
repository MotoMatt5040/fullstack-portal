// CallID Service Database Connection
// Uses the same pattern as the shared library but tailored for this service
const sql = require('mssql');

const baseConfig = {
  user: process.env.PROMARK_DB_USER,
  password: process.env.PROMARK_DB_PASSWORD,
  server: process.env.PROMARK_DB_SERVER,
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
};

// FAJITA database (where CallID tables live)
const fajitaConfig = {
  ...baseConfig,
  database: 'FAJITA',
};

// PROMARK database (for roles and other lookups)
const promarkConfig = {
  ...baseConfig,
  database: process.env.PROMARK_DB_NAME || 'CaligulaD',
};

let fajitaPoolCache = null;
let promarkPoolCache = null;

const getFajitaPool = async () => {
  if (!fajitaPoolCache) {
    fajitaPoolCache = new sql.ConnectionPool(fajitaConfig)
      .connect()
      .then((pool) => {
        console.log('Connected to FAJITA database');
        return pool;
      })
      .catch((err) => {
        console.error('FAJITA database connection failed:', err);
        fajitaPoolCache = null;
        throw err;
      });
  }
  return fajitaPoolCache;
};

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

let currentRequest = null;
let currentRequestVersion = 0;

const withDbConnection = async ({
  queryFn,
  fnName = 'anonymous',
  attempts = 5,
  allowAbort = false,
  allowRetry = false,
  database = 'fajita', // default to fajita for CallID service
}) => {
  const pool = database === 'promark' ? await getPromarkPool() : await getFajitaPool();

  const controller = new AbortController();
  const signal = controller.signal;
  const requestVersion = ++currentRequestVersion;

  if (allowAbort && currentRequest) {
    console.log(`Cancelling previous request for ${fnName}...`);
    currentRequest.abort();
  }

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
      console.warn(`Query returned no results. Retrying... (${6 - attempts} of 5) - ${fnName}`);
      await new Promise((resolve) => setTimeout(resolve, 100));

      if (allowAbort && signal.aborted) {
        console.log(`Request for ${fnName} was canceled, not retrying.`);
        return 499;
      }

      return withDbConnection({
        queryFn,
        attempts: attempts - 1,
        fnName,
        allowAbort,
        allowRetry,
        database,
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

const closeAllPools = async () => {
  if (fajitaPoolCache) {
    const pool = await fajitaPoolCache;
    await pool.close();
    fajitaPoolCache = null;
    console.log('Closed FAJITA database connection');
  }
  if (promarkPoolCache) {
    const pool = await promarkPoolCache;
    await pool.close();
    promarkPoolCache = null;
    console.log('Closed PROMARK database connection');
  }
};

module.exports = {
  withDbConnection,
  getFajitaPool,
  getPromarkPool,
  closeAllPools,
  sql,
};
