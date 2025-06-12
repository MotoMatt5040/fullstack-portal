const sql = require('mssql');
const withDbConnection = require('../config/dbConn');
const { promark } = require('../utils/databaseTypes');

const createUser = async (email, hashedPwd) => {
  return withDbConnection({
    database: promark,
    queryFn: async (pool) => {
      const result = await pool
        .request()
        .input('email', sql.NVarChar, email)
        .input('password', sql.NVarChar, hashedPwd)
        .input('dateCreated', sql.DateTime, new Date())
        .input('dateUpdated', sql.DateTime, new Date())
        .query(
          'INSERT INTO tblAuthentication (email, password, dateCreated, dateUpdated) VALUES (@email, @password, @dateCreated, @dateUpdated)'
        );
      return result;
    },
    fnName: 'createUser',
    allowAbort: false,
    allowRetry: false,
  });
};

const getClients = async () => {
  return withDbConnection({
    database: promark,
    queryFn: async (pool) => {
      const result = await pool
        .request()
        .query('SELECT clientId, clientName FROM tblClients');
      return result.recordset;
    },
    fnName: 'getClients',
  });
};

const addUserRoles = async (uuid, roles) => {
  return withDbConnection({
    database: promark,
    queryFn: async (pool) => {
      for (const role of roles) {
        await pool
          .request()
          .input('uuid', sql.UniqueIdentifier, uuid)
          .input('role', sql.SmallInt, role)
          .query('INSERT INTO tblUserRoles (uuid, role) VALUES (@uuid, @role)');
      }
    },
  });
};

const getUser = async (email) => {
  return withDbConnection({
    database: promark,
    queryFn: async (pool) => {
      const result = await pool
        .request()
        .input('email', sql.NVarChar, email)
        .query(
          'SELECT uuid, email FROM tblAuthentication WHERE email = @email'
        );
      return result.recordset[0];
    },
    fnName: 'getUser',
  });
};

const addUserProfile = async (uuid, clientId) => {
  return withDbConnection({
    database: promark,
    queryFn: async (pool) => {
      await pool
        .request()
        .input('uuid', sql.UniqueIdentifier, uuid)
        .input('clientId', sql.Int, clientId)
        .query(
          'INSERT INTO tblUserProfiles (uuid, clientId) VALUES (@uuid, @clientId)'
        );
    },
  });
};

const setPasswordResetToken = async (uuid, token, expiry) => {
  return withDbConnection({
    database: promark,
    queryFn: async (pool) => {
      const result = await pool
        .request()
        .input('uuid', sql.UniqueIdentifier, uuid)
        .input('resetToken', sql.NVarChar, token)
        .input('resetTokenExpiry', sql.DateTime, expiry)
        .query(
          'UPDATE tblAuthentication SET resetToken = @resetToken, resetTokenExpiry = @resetTokenExpiry WHERE uuid = @uuid'
        );
      return result;
    },
    fnName: 'setPasswordResetToken',
  });
};

const getUserByResetToken = async (token, email) => {
  return withDbConnection({
    database: promark,
    queryFn: async (pool) => {
      const result = await pool
        .request()
        .input('resetToken', sql.NVarChar, token)
        .input('email', sql.NVarChar, email)
        .query(
          'SELECT uuid, email, resetTokenExpiry FROM tblAuthentication WHERE resetToken = @resetToken AND email = @email'
        );
      return result.recordset[0];
    },
    fnName: 'getUserByResetToken',
  });
};

const updatePassword = async (uuid, hashedPassword) => {
  return withDbConnection({
    database: promark,
    queryFn: async (pool) => {
      const result = await pool
        .request()
        .input('uuid', sql.UniqueIdentifier, uuid)
        .input('password', sql.NVarChar, hashedPassword)
        .query(
          'UPDATE tblAuthentication SET password = @password WHERE uuid = @uuid'
        );
      return result;
    },
    fnName: 'updatePassword',
  });
};

const clearPasswordResetToken = async (uuid) => {
  return withDbConnection({
    database: promark,
    queryFn: async (pool) => {
      const result = await pool
        .request()
        .input('uuid', sql.UniqueIdentifier, uuid)
        .query(
          'UPDATE tblAuthentication SET resetToken = NULL, resetTokenExpiry = NULL WHERE uuid = @uuid'
        );
      return result;
    },
    fnName: 'clearPasswordResetToken',
  });
};

module.exports = {
  createUser,
  getClients,
  addUserRoles,
  addUserProfile,
  getUser,
  setPasswordResetToken,
  getUserByResetToken,
  updatePassword,
  clearPasswordResetToken,
};
