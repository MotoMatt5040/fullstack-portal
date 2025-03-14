const sql = require('mssql');

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    options: {
        encrypt: true, // Use this if you're on Windows Azure
        trustServerCertificate: true // Change to true for local dev / self-signed certs
    },
    pool: {
        max: 50,  // Increase max connections
        // min: 5,   // Keep some connections ready
        idleTimeoutMillis: 30000, // Close unused connections after 30s
        acquireTimeoutMillis: 60000 // Wait longer before failing a connection request
    }
};

const poolPromise = new sql.ConnectionPool(config)
    .connect()
    .then(pool => {
        return pool;
    })
    .catch(err => {
        console.error('Database connection failed:', err);
        process.exit(1);
    });

const withDbConnection = async (queryFn) => {
    const pool = await poolPromise;
    try {
        return await queryFn(pool);
    } catch (err) {
        console.error('Database query failed:', err);
        throw err;
    }
};

module.exports = withDbConnection;
