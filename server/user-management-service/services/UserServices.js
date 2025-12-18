const { withDbConnection, sql } = require('@internal/db-connection');

const createUser = async (email, hashedPwd) => {
  return withDbConnection({
    database: 'promark',
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
  });
};

const getClients = async () => {
  return withDbConnection({
    database: 'promark',
    queryFn: async (pool) => {
      const result = await pool
        .request()
        .query('SELECT clientId, clientName FROM tblClients');
      return result.recordset;
    },
    fnName: 'getClients',
  });
};

const getUser = async (email) => {
  return withDbConnection({
    database: 'promark',
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
    database: 'promark',
    queryFn: async (pool) => {
      await pool
        .request()
        .input('uuid', sql.UniqueIdentifier, uuid)
        .input('clientId', sql.Int, clientId)
        .query(
          'INSERT INTO tblUserProfiles (uuid, clientId) VALUES (@uuid, @clientId)'
        );
    },
    fnName: 'addUserProfile',
  });
};

const setPasswordResetToken = async (uuid, token, expiry) => {
  return withDbConnection({
    database: 'promark',
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
    database: 'promark',
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
    database: 'promark',
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
    database: 'promark',
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

const getAllUsersWithClient = async () => {
  return withDbConnection({
    database: 'promark',
    queryFn: async (pool) => {
      const result = await pool
        .request()
        .query(`
          SELECT
            a.email,
            STRING_AGG(r.roleName, ', ') AS roles,
            c.clientname
          FROM tblAuthentication a
          LEFT JOIN tblUserRoles ur ON a.uuid = ur.uuid
          LEFT JOIN tblRoles r ON ur.role = r.roleid
          LEFT JOIN tblUserProfiles up ON a.uuid = up.uuid
          LEFT JOIN tblClients c ON up.clientid = c.clientid
          GROUP BY a.uuid, a.email, c.clientname
          ORDER BY
            CASE WHEN STRING_AGG(r.roleName, ', ') IS NULL THEN 1 ELSE 0 END,
            a.email ASC
        `);
      return result.recordset;
    },
    fnName: 'getAllUsersWithClient',
  });
};

const getAllUsers = async () => {
  return withDbConnection({
    database: 'promark',
    queryFn: async (pool) => {
      const result = await pool
        .request()
        .query(`
          SELECT
            a.email,
            STRING_AGG(r.roleName, ', ') AS roles
          FROM tblAuthentication a
          LEFT JOIN tblUserRoles ur ON a.uuid = ur.uuid
          LEFT JOIN tblRoles r ON ur.role = r.roleid
          GROUP BY a.uuid, a.email
          ORDER BY
            CASE WHEN STRING_AGG(r.roleName, ', ') IS NULL THEN 1 ELSE 0 END,
            a.email ASC
        `);
      return result.recordset;
    },
    fnName: 'getAllUsers',
  });
};

const addUserRoles = async (uuid, roles) => {
  return withDbConnection({
    database: 'promark',
    queryFn: async (pool) => {
      const rolesString = roles.join(',');

      const request = pool.request();
      request.input('uuid', sql.UniqueIdentifier, uuid);
      request.input('roles', sql.VarChar, rolesString);

      const query = `
        INSERT INTO tblUserRoles (uuid, role)
        SELECT @uuid, value
        FROM STRING_SPLIT(@roles, ',')
        WHERE CAST(value AS INT) NOT IN (
          SELECT role FROM tblUserRoles WHERE uuid = @uuid
        )
      `;

      const result = await request.query(query);
      return result;
    },
    fnName: 'addUserRoles',
  });
};

const removeUserRoles = async (uuid, roles) => {
  return withDbConnection({
    database: 'promark',
    queryFn: async (pool) => {
      const rolesString = roles.join(',');

      const request = pool.request();
      request.input('uuid', sql.UniqueIdentifier, uuid);
      request.input('roles', sql.VarChar, rolesString);

      const query = `
        DELETE FROM tblUserRoles
        WHERE uuid = @uuid AND role IN (
          SELECT CAST(value AS INT) FROM STRING_SPLIT(@roles, ',')
        )
      `;

      const result = await request.query(query);
      return result;
    },
    fnName: 'removeUserRoles',
  });
};

const updateUserProfileClient = async (uuid, clientId) => {
  return withDbConnection({
    database: 'promark',
    queryFn: async (pool) => {
      const request = pool.request();
      request.input('uuid', sql.UniqueIdentifier, uuid);

      if (clientId) {
        request.input('clientId', sql.VarChar, clientId);
      } else {
        request.input('clientId', sql.VarChar, null);
      }

      const query = `
        UPDATE tblUserProfiles
        SET clientId = @clientId
        WHERE uuid = @uuid
      `;

      const result = await request.query(query);
      return result;
    },
    fnName: 'updateUserProfileClient',
  });
};

const updateUserRoles = async (uuid, roles) => {
  return withDbConnection({
    database: 'promark',
    queryFn: async (pool) => {
      const transaction = new sql.Transaction(pool);
      try {
        await transaction.begin();

        // Delete all existing roles for the user
        const deleteRequest = new sql.Request(transaction);
        deleteRequest.input('uuid', sql.UniqueIdentifier, uuid);
        await deleteRequest.query('DELETE FROM tblUserRoles WHERE uuid = @uuid');

        // Insert new roles one by one
        if (roles && roles.length > 0) {
          for (const roleId of roles) {
            const insertRequest = new sql.Request(transaction);
            insertRequest.input('uuid_param', sql.UniqueIdentifier, uuid);
            insertRequest.input('role_param', sql.Int, roleId);
            await insertRequest.query('INSERT INTO tblUserRoles (uuid, role) VALUES (@uuid_param, @role_param)');
          }
        }

        await transaction.commit();
      } catch (err) {
        await transaction.rollback();
        console.error('SQL Transaction Error in updateUserRoles:', err);
        throw new Error('Failed to update user roles in the database.');
      }
    },
    fnName: 'updateUserRoles',
  });
};

const getUsersByClientId = async (clientId) => {
  return withDbConnection({
    database: 'promark',
    queryFn: async (pool) => {
      const result = await pool
        .request()
        .input('clientId', sql.Int, clientId)
        .query(`
          SELECT a.email
          FROM tblAuthentication a
          INNER JOIN tblUserProfiles up ON a.uuid = up.uuid
          WHERE up.clientId = @clientId
        `);
      return result.recordset;
    },
    fnName: 'getUsersByClientId',
  });
};

const deleteUserByEmail = async (email) => {
  return withDbConnection({
    database: 'promark',
    queryFn: async (pool) => {
      const result = await pool
        .request()
        .input('email', sql.NVarChar, email)
        .query('DELETE FROM tblAuthentication WHERE email = @email');
      return result.rowsAffected;
    },
    fnName: 'deleteUserByEmail',
  });
};

module.exports = {
  createUser,
  getClients,
  addUserRoles,
  removeUserRoles,
  addUserProfile,
  getUser,
  setPasswordResetToken,
  getUserByResetToken,
  updatePassword,
  clearPasswordResetToken,
  getAllUsers,
  updateUserProfileClient,
  updateUserRoles,
  getUsersByClientId,
  getAllUsersWithClient,
  deleteUserByEmail,
};
