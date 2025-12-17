const sql = require('mssql');

const promarkConfig = {
  user: process.env.PROMARK_USER,
  password: process.env.PROMARK_PWD,
  server: process.env.PROMARK_SERVER,
  database: process.env.PROMARK_DB,
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
  requestTimeout: 30000,
  connectionTimeout: 30000,
};

let pool = null;

const getPool = async () => {
  if (!pool) {
    pool = await sql.connect(promarkConfig);
  }
  return pool;
};

const withDbConnection = async ({ queryFn, fnName = 'unknown' }) => {
  try {
    const pool = await getPool();
    return await queryFn(pool);
  } catch (error) {
    console.error(`[${fnName}] Database error:`, error.message);
    throw error;
  }
};

module.exports = { getPool, withDbConnection, sql };
