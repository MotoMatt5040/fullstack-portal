const sql = require('mssql');
const databaseTypes = require('./databaseTypes');

const dbConfigs = {
  [databaseTypes.promark]: {
    server: process.env.DB_HOST,
    database: process.env.DB_PROMARK,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    options: {
      encrypt: false,
      trustServerCertificate: true,
      enableArithAbort: true,
    },
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000,
    },
  },
};

const pools = {};

const withDbConnection = async ({
  database,
  queryFn,
  attempts = 3,
  fnName = 'Unknown',
  allowAbort = false,
  allowRetry = true,
}) => {
  const config = dbConfigs[database];
  if (!config) {
    throw new Error(`Unknown database type: ${database}`);
  }

  // Get or create pool
  if (!pools[database]) {
    pools[database] = new sql.ConnectionPool(config);
    await pools[database].connect();
  }

  let lastError;
  for (let i = 0; i < attempts; i++) {
    try {
      const result = await queryFn(pools[database]);
      return result;
    } catch (error) {
      lastError = error;
      console.error(`[${fnName}] Attempt ${i + 1} failed:`, error.message);

      if (!allowRetry) break;

      // Reconnect pool if needed
      if (error.code === 'ECONNRESET' || error.code === 'ESOCKET') {
        try {
          await pools[database].close();
        } catch (e) {
          // Ignore close errors
        }
        pools[database] = new sql.ConnectionPool(config);
        await pools[database].connect();
      }
    }
  }

  if (allowAbort) {
    return 499; // Signal that the request was aborted/failed
  }
  throw lastError;
};

module.exports = withDbConnection;
