// Project Numbering Service - dbConn.js (FAJITA database only)
const sql = require('mssql');

const fajitaConfig = {
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
};

let poolCache = null;

const getPool = async () => {
  if (!poolCache) {
    poolCache = new sql.ConnectionPool(fajitaConfig)
      .connect()
      .then((pool) => {
        console.log('Connected to FAJITA database');
        return pool;
      })
      .catch((err) => {
        console.error('Database connection failed:', err);
        process.exit(1);
      });
  }

  return poolCache;
};

const withDbConnection = async ({
  queryFn,
  fnName = 'anonymous',
}) => {
  const pool = await getPool();

  try {
    const res = await queryFn(pool);
    return res;
  } catch (err) {
    console.error('Database query failed:', err);
    console.error(`Error in ${fnName}:`, err.message);
    throw err;
  }
};

module.exports = withDbConnection;
