const sql = require('mssql');

const config = {
	user: process.env.DB_USER,
	password: process.env.DB_PASSWORD,
	server: process.env.DB_SERVER,
	database: process.env.DB_NAME,
	options: {
		encrypt: true, // Use this if you're on Windows Azure
		trustServerCertificate: true, // Change to true for local dev / self-signed certs
	},
	pool: {
		max: 50, // Increase max connections
		// min: 5,   // Keep some connections ready
		idleTimeoutMillis: 30000, // Close unused connections after 30s
		acquireTimeoutMillis: 60000, // Wait longer before failing a connection request
	},
};

const poolPromise = new sql.ConnectionPool(config)
	.connect()
	.then((pool) => {
		return pool;
	})
	.catch((err) => {
		console.error('Database connection failed:', err);
		process.exit(1);
	});

	let currentRequest = null;
	let currentRequestVersion = 0;
	
	const withDbConnection = async (
		queryFn,
		attempts = 5,
		fnName = 'anonymous'
	) => {
		const pool = await poolPromise;
	
		const controller = new AbortController();
		const signal = controller.signal;
		const requestVersion = ++currentRequestVersion;
	
		if (currentRequest) {
			// console.log(`Cancelling previous request for ${fnName}...`);
			currentRequest.abort();
		}
	
		currentRequest = controller;
	
		try {
			const res = await queryFn(pool, signal);
	
			if (requestVersion !== currentRequestVersion) {
				// console.log(`Response for ${fnName} is outdated, ignoring...`);
				return; 
			}
	
			if ((Array.isArray(res) && res.length === 0 && attempts > 0)) {
				console.warn(`Query returned no results. Retrying... (${6 - attempts} of 5) - ${fnName}`);
				
				await new Promise((resolve) => setTimeout(resolve, 100));  
	
				if (signal.aborted) {
					// console.log(`Request for ${fnName} was canceled, not retrying.`);
					return 499; 
				}
				return withDbConnection(queryFn, attempts - 1, fnName);
			}
	
			return res;
		} catch (err) {
			console.error('Database query failed:', err);
			throw err;
		} finally {
			if (currentRequest === controller) {
				currentRequest = null;
			}
		}
	};

	module.exports = withDbConnection;
