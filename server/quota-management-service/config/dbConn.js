const sql = require('mssql');

const promarkConfig = {
  user: process.env.PROMARK_DB_USER,
  password: process.env.PROMARK_DB_PASSWORD,
  database: process.env.PROMARK_DB_NAME || 'CaligulaD',
  server: process.env.PROMARK_DB_SERVER,
  options: {
    encrypt: true,
    trustServerCertificate: true,
    requestTimeout: 90000,
  },
};

const voxcoConfig = {
  user: process.env.VOXCO_USER,
  password: process.env.VOXCO_PASSWORD,
  database: process.env.VOXCO_DB,
  server: process.env.VOXCO_HOST,
  options: {
    encrypt: true,
    trustServerCertificate: true,
    requestTimeout: 90000,
  },
};

const dbConfigs = {
  promark: promarkConfig,
  voxco: voxcoConfig,
};

const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const withDbConnection = async ({
  database,
  queryFn,
  fnName = 'unknown',
  attempts = MAX_RETRIES,
  allowRetry = true,
}) => {
  const config = dbConfigs[database];
  if (!config) {
    throw new Error(`Unknown database: ${database}`);
  }

  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    let pool;
    try {
      pool = await sql.connect(config);
      const result = await queryFn(pool);
      return result;
    } catch (error) {
      lastError = error;
      console.error(
        `Quota Management Service: [${fnName}] Attempt ${attempt}/${attempts} failed:`,
        error.message
      );

      if (!allowRetry || attempt === attempts) {
        break;
      }

      await sleep(RETRY_DELAY * attempt);
    } finally {
      if (pool) {
        try {
          await pool.close();
        } catch (closeError) {
          console.error(`Error closing connection:`, closeError.message);
        }
      }
    }
  }

  throw lastError;
};

// Export as default for existing service imports
module.exports = withDbConnection;

// Also attach named exports
module.exports.withDbConnection = withDbConnection;
module.exports.sql = sql;
