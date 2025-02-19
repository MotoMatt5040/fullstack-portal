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

const getUserByEmail = async (email) => {
    let pool;
    try {
        pool = await sql.connect(config);
        const result = await pool.request()
            .input('email', sql.NVarChar, email)
            .query('SELECT * FROM tblAuthentication WHERE email = @email');
        return result.recordset[0];
    } catch (err) {
        console.error('Database query failed:', err);
        throw err;
    } finally {
        if (pool) {
            pool.close();
        }
    }
};

const updateUserPassword = async (email, hashedPwd) => {
    let pool;
    try {
        pool = await sql.connect(config);
        const result = await pool.request()
            .input('email', sql.NVarChar, email)
            .input('password', sql.NVarChar, hashedPwd)
            .input('dateUpdated', sql.DateTime, new Date())
            .query('UPDATE tblAuthentication SET password = @password, dateUpdated = @dateUpdated WHERE email = @email');
        return result;
    } catch (err) {
        console.error('Database query failed:', err);
        throw err;
    } finally {
        if (pool) {
            pool.close();
        }
    }
};

const saveResetToken = async (email, token, expires) => {
    let pool;
    try {
        pool = await sql.connect(config);
        await pool.request()
            .input('email', sql.NVarChar, email)
            .input('token', sql.UniqueIdentifier, token)
            .input('expires', sql.DateTime, expires)
            .input('dateUpdated', sql.DateTime, new Date())
            .query('UPDATE tblAuthentication SET resetPasswordToken = @token, resetPasswordExpires = @expires, dateUpdated = @dateUpdated WHERE email = @email');
    } catch (err) {
        console.error('Database query failed:', err);
        throw err;
    } finally {
        if (pool) {
            pool.close();
        }
    }
};

const getUserByResetToken = async (token) => {
    let pool;
    try {
        pool = await sql.connect(config);
        const result = await pool.request()
            .input('token', sql.UniqueIdentifier, token)
            .query('SELECT * FROM tblAuthentication WHERE resetPasswordToken = @token');
        return result.recordset[0];
    } catch (err) {
        console.error('Database query failed:', err);
        throw err;
    } finally {
        if (pool) {
            pool.close();
        }
    }
};

const createUser = async (email, hashedPwd) => {
    let pool;
    try {
        pool = await sql.connect(config);
        const result = await pool.request()
            .input('email', sql.NVarChar, email)
            .input('password', sql.NVarChar, hashedPwd)
            .input('dateCreated', sql.DateTime, new Date())
            .input('dateUpdated', sql.DateTime, new Date())
            .query('INSERT INTO tblAuthentication (email, password, dateCreated, dateUpdated) VALUES (@email, @password, @dateCreated, @dateUpdated)');
        return result;
    } catch (err) {
        console.error('Database query failed:', err);
        throw err;
    } finally {
        if (pool) {
            pool.close();
        }
    }
};

const getUserByRefreshToken = async (refreshToken) => {
    let pool;
    try {
        pool = await sql.connect(config);
        const result = await pool.request()
            .input('refreshToken', sql.NVarChar, refreshToken)
            .query('SELECT * FROM tblAuthentication WHERE refreshToken = @refreshToken');
        return result.recordset[0];
    } catch (err) {
        console.error('Database query failed:', err);
        throw err;
    } finally {
        if (pool) {
            pool.close();
        }
    }
};

const clearRefreshToken = async (email) => {
    let pool;
    try {
        pool = await sql.connect(config);
        await pool.request()
            .input('email', sql.NVarChar, email)
            .query('UPDATE tblAuthentication SET refreshToken = NULL WHERE email = @email');
    } catch (err) {
        console.error('Database query failed:', err);
        throw err;
    } finally {
        if (pool) {
            pool.close();
        }
    }
};

const updateUserRefreshToken = async (email, refreshToken) => {
    let pool;
    try {
        pool = await sql.connect(config);
        await pool.request()
            .input('email', sql.NVarChar, email)
            .input('refreshToken', sql.NVarChar, refreshToken)
            .query('UPDATE tblAuthentication SET refreshToken = @refreshToken WHERE email = @email');
    } catch (err) {
        console.error('Database query failed:', err);
        throw err;
    } finally {
        if (pool) {
            pool.close();
        }
    }
};

const getAllUsers = async () => {
    let pool;
    try {
        pool = await sql.connect(config);
        const result = await pool.request()
            .query('SELECT Email FROM tblAuthentication');
        return result.recordset;
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
    getUserByEmail,
    updateUserPassword,
    saveResetToken,
    getUserByResetToken,
    createUser,
    getUserByRefreshToken,
    clearRefreshToken,
    updateUserRefreshToken,
    getAllUsers
};