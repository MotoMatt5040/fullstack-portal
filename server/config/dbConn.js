const sql = require('mssql');

let VOXCO_PASSWORD = process.env.VOXCO_DB_PASSWORD;

if (process.env.ENVIRONMENT === 'production') {
  VOXCO_PASSWORD = process.env.VOXCO_DB_PROD_PASSWORD;
}

const dbConfigs = {
	promark: {
		user: process.env.PROMARK_DB_USER,
		password: process.env.PROMARK_DB_PASSWORD,
		server: process.env.PROMARK_DB_SERVER,
		database: process.env.PROMARK_DB_NAME,
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

let currentRequest = null;
let currentRequestVersion = 0;

const poolCache = {}; // So we don't reconnect every time

const getPool = async (database) => {
	if (!dbConfigs[database]) {
		throw new Error(`Unknown database config: ${database}`);
	}

	if (!poolCache[database]) {
		// console.log(dbConfigs[database]);
		poolCache[database] = new sql.ConnectionPool(dbConfigs[database])
			.connect()
			.then((pool) => {
				return pool;
			})
			.catch((err) => {
				// console.log("Error in connection pool");
				console.error(`Database connection failed for ${database}:`, err);
				process.exit(1);
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
	// console.log(`\n\nExecuting ${fnName}...`);
	// console.log(queryFn.toString());
	// console.log(query)
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
			// if aborting is allowed
			console.log(`Response for ${fnName} is outdated, ignoring...`);
			return;
		}

		const isEmptyResult = Array.isArray(res) && res.length === 0;

		if (isEmptyResult && attempts > 0 && allowRetry) {
			console.warn(
				`Query returned no results. Retrying... (${
					6 - attempts
				} of 5) - ${fnName}`
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

module.exports = withDbConnection;
