// Project Numbering Service - dbConn.js
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

const fajitaConfig = { ...baseConfig, database: 'FAJITA' };
const promarkConfig = { ...baseConfig, database: process.env.PROMARK_DB_NAME || 'CaligulaD' };

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
        process.exit(1);
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
        process.exit(1);
      });
  }
  return promarkPoolCache;
};

const withDbConnection = async ({
  queryFn,
  fnName = 'anonymous',
  database = 'fajita',
}) => {
  const pool = database === 'promark' ? await getPromarkPool() : await getFajitaPool();

  try {
    const res = await queryFn(pool);
    return res;
  } catch (err) {
    console.error('Database query failed:', err);
    console.error(`Error in ${fnName}:`, err.message);
    throw err;
  }
};

module.exports = { withDbConnection, getPromarkPool, getFajitaPool };
