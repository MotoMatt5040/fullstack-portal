const sql = require('mssql');
const withDbConnection = require('../config/dbConnPromark');

const getUserByEmail = async (email) => {
    return withDbConnection(async (pool) => {
        const result = await pool.request()
            .input('email', sql.NVarChar, email)
            .query('SELECT * FROM tblAuthentication WHERE email = @email');
        return result.recordset[0];
    });
};

const updateUserPassword = async (email, hashedPwd) => {
    return withDbConnection(async (pool) => {
        const result = await pool.request()
            .input('email', sql.NVarChar, email)
            .input('password', sql.NVarChar, hashedPwd)
            .input('dateUpdated', sql.DateTime, new Date())
            .query('UPDATE tblAuthentication SET password = @password, dateUpdated = @dateUpdated WHERE email = @email');
        return result;
    });
};

const saveResetToken = async (email, token, expires) => {
    return withDbConnection(async (pool) => {
        await pool.request()
            .input('email', sql.NVarChar, email)
            .input('token', sql.UniqueIdentifier, token)
            .input('expires', sql.DateTime, expires)
            .input('dateUpdated', sql.DateTime, new Date())
            .query('UPDATE tblAuthentication SET resetPasswordToken = @token, resetPasswordExpires = @expires, dateUpdated = @dateUpdated WHERE email = @email');
    });
};

const getUserByResetToken = async (token) => {
    return withDbConnection(async (pool) => {
        const result = await pool.request()
            .input('token', sql.UniqueIdentifier, token)
            .query('SELECT * FROM tblAuthentication WHERE resetPasswordToken = @token');
        return result.recordset[0];
    });
};

const createUser = async (email, hashedPwd) => {
    return withDbConnection(async (pool) => {
        const result = await pool.request()
            .input('email', sql.NVarChar, email)
            .input('password', sql.NVarChar, hashedPwd)
            .input('dateCreated', sql.DateTime, new Date())
            .input('dateUpdated', sql.DateTime, new Date())
            .query('INSERT INTO tblAuthentication (email, password, dateCreated, dateUpdated) VALUES (@email, @password, @dateCreated, @dateUpdated)');
        return result;
    });
};

const getUserByRefreshToken = async (refreshToken) => {
    return withDbConnection(async (pool) => {
        const result = await pool.request()
            .input('refreshToken', sql.NVarChar, refreshToken)
            .query('SELECT * FROM tblAuthentication WHERE refreshToken = @refreshToken');
        return result.recordset[0];
    });
};

const clearRefreshToken = async (email) => {
    return withDbConnection(async (pool) => {
        await pool.request()
            .input('email', sql.NVarChar, email)
            .query('UPDATE tblAuthentication SET refreshToken = NULL WHERE email = @email');
    });
};

const updateUserRefreshToken = async (email, refreshToken) => {
    return withDbConnection(async (pool) => {
        await pool.request()
            .input('email', sql.NVarChar, email)
            .input('refreshToken', sql.NVarChar, refreshToken)
            .query('UPDATE tblAuthentication SET refreshToken = @refreshToken WHERE email = @email');
    });
};

const getAllUsers = async () => {
    return withDbConnection(async (pool) => {
        const result = await pool.request()
            .query('SELECT Email FROM tblAuthentication');
        return result.recordset;
    });
};

const addUserRoles = async (email, roles) => {
    return withDbConnection(async (pool) => {
        for (const role of roles) {
            await pool.request()
                .input('email', sql.NVarChar, email)
                .input('role', sql.Int, role)
                .query(`
                    MERGE INTO tblUserRoles AS target
                    USING (SELECT uuid, email FROM tblAuthentication WHERE email = @email) AS source
                    ON target.email = source.email AND target.Role = @role
                    WHEN NOT MATCHED THEN 
                        INSERT (Role, email, uuid) 
                        VALUES (@role, source.email, source.uuid);
                `);
        }
    });
};

const removeUserRoles = async (email, roles) => {
    return withDbConnection(async (pool) => {
        for (const role of roles) {
            await pool.request()
                .input('email', sql.NVarChar, email)
                .input('role', sql.Int, role)
                .query(`
                    DELETE FROM tblUserRoles
                    WHERE email = @email
                    AND Role = @role;
                `);
        }
    });
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
    getAllUsers,
    addUserRoles,
    removeUserRoles
};