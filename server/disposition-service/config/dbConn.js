const sql = require('mssql');

const baseConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT) || 1433,
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
    connectTimeout: 30000,
    requestTimeout: 30000,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

// Database configurations
const databases = {
  voxco: {
    ...baseConfig,
    database: process.env.DB_VOXCO || 'VoxcoSystem',
  },
};

// Connection pools cache
const pools = {};

/**
 * Get or create a connection pool for a specific database
 */
const getPool = async (database) => {
  const dbConfig = databases[database];
  if (!dbConfig) {
    throw new Error(`Unknown database: ${database}`);
  }

  if (!pools[database]) {
    pools[database] = new sql.ConnectionPool(dbConfig);
    await pools[database].connect();
  }

  return pools[database];
};

/**
 * Execute a query with a database connection
 */
const withDbConnection = async ({
  database,
  queryFn,
  fnName = 'anonymous',
  attempts = 3,
  allowRetry = true,
}) => {
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const pool = await getPool(database);
      return await queryFn(pool);
    } catch (error) {
      lastError = error;
      console.error(`[${fnName}] Attempt ${attempt}/${attempts} failed:`, error.message);

      // Reset pool on connection errors
      if (pools[database]) {
        try {
          await pools[database].close();
        } catch (closeError) {
          console.error(`Error closing pool:`, closeError.message);
        }
        delete pools[database];
      }

      if (!allowRetry || attempt === attempts) {
        throw error;
      }

      // Wait before retry
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }

  throw lastError;
};

// Cleanup on exit
process.on('SIGINT', async () => {
  for (const [name, pool] of Object.entries(pools)) {
    try {
      await pool.close();
      console.log(`Closed pool: ${name}`);
    } catch (error) {
      console.error(`Error closing pool ${name}:`, error.message);
    }
  }
  process.exit(0);
});

module.exports = withDbConnection;
module.exports.sql = sql;
module.exports.databases = databases;
