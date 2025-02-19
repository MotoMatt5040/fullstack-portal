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

const getUserRoles = async (email) => {
    let pool;
    try {
        pool = await sql.connect(config);
        const result = await pool.request()
            .input('email', sql.NVarChar, email)
            .query('SELECT role FROM tblUserRoles WHERE email = @email');
        return result.recordset.map(row => parseInt(row.role, 10)); // Convert roles to integers
    } catch (err) {
        console.error('Database query failed:', err);
        throw err;
    } finally {
        if (pool) {
            pool.close();
        }
    }
};

module.exports = {
    getUserRoles
};