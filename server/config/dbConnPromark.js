const sql = require('mssql');

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    options: {
        encrypt: true, // Use this if you're on Windows Azure
        trustServerCertificate: true // Change to true for local dev / self-signed certs
    }
};

let pool;

const withDbConnection = async (queryFn) => {
    try {
        pool = await sql.connect(config);
        return await queryFn(pool);
    } catch (err) {
        console.error('Database query failed: ', err);
        throw err;
    } finally {
        await pool?.close();
    }
};


module.exports = withDbConnection;