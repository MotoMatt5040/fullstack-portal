const sql = require('mssql');

const promarkConfig = {
  user: process.env.PROMARK_DB_USER,
  password: process.env.PROMARK_DB_PWD,
  database: process.env.PROMARK_DB_NAME,
  server: process.env.PROMARK_DB_SERVER,
  options: {
    encrypt: false,
    trustServerCertificate: true,
    requestTimeout: 90000,
  },
};

const voxcoConfig = {
  user: process.env.VOXCO_DB_USER,
  password: process.env.VOXCO_DB_PWD,
  database: process.env.VOXCO_DB_NAME,
  server: process.env.VOXCO_DB_SERVER,
  options: {
    encrypt: false,
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

module.exports = withDbConnection;
