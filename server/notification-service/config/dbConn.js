// Notification Service - dbConn.js
const sql = require('mssql');

const promarkConfig = {
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
  requestTimeout: 300000,
};

let promarkPoolCache = null;

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
}) => {
  const pool = await getPromarkPool();

  try {
    const res = await queryFn(pool);
    return res;
  } catch (err) {
    console.error('Database query failed:', err);
    console.error(`Error in ${fnName}:`, err.message);
    throw err;
  }
};

module.exports = { withDbConnection, getPromarkPool };
