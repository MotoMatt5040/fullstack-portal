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

const useDB = async (qry) => {
    try {
        pool = await sql.connect(config);
        console.log('Connected to the database successfully');
        const result = await pool.request().query(qry);
        console.log(result);
        console.log('Connection to the database closed');
    } catch (err) {
        console.error('Database connection failed:', err);
    } finally {
        if (pool) {
            pool.close();
        }
    }
};


module.exports = useDB;