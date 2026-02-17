const { withDbConnection, sql } = require('@internal/db-connection');

const createUser = async (email, hashedPwd) => {
  return withDbConnection({
    database: 'caligulad',
    queryFn: async (pool) => {
      const result = await pool
        .request()
        .input('email', sql.NVarChar, email)
        .input('password', sql.NVarChar, hashedPwd)
        .input('dateCreated', sql.DateTime, new Date())
        .input('dateUpdated', sql.DateTime, new Date())
        .query(
          'INSERT INTO FAJITA.dbo.Authentication (email, password, dateCreated, dateUpdated) VALUES (@email, @password, @dateCreated, @dateUpdated)'
        );
      return result;
    },
    fnName: 'createUser',
  });
};

const getClients = async () => {
  return withDbConnection({
    database: 'caligulad',
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
    database: 'caligulad',
    queryFn: async (pool) => {
      const result = await pool
        .request()
        .input('email', sql.NVarChar, email)
        .query(
          'SELECT uuid, email FROM FAJITA.dbo.Authentication WHERE email = @email'
        );
      return result.recordset[0];
    },
    fnName: 'getUser',
  });
};

const addUserProfile = async (uuid, clientId) => {
  return withDbConnection({
    database: 'caligulad',
    queryFn: async (pool) => {
      await pool
        .request()
        .input('uuid', sql.UniqueIdentifier, uuid)
        .input('clientId', sql.Int, clientId)
        .query(
          'INSERT INTO FAJITA.dbo.UserProfiles (uuid, clientId) VALUES (@uuid, @clientId)'
        );
    },
    fnName: 'addUserProfile',
  });
};

const setPasswordResetToken = async (uuid, token, expiry) => {
  return withDbConnection({
    database: 'caligulad',
    queryFn: async (pool) => {
      const result = await pool
        .request()
        .input('uuid', sql.UniqueIdentifier, uuid)
        .input('resetToken', sql.NVarChar, token)
        .input('resetTokenExpiry', sql.DateTime, expiry)
        .query(
          'UPDATE FAJITA.dbo.Authentication SET resetToken = @resetToken, resetTokenExpiry = @resetTokenExpiry WHERE uuid = @uuid'
        );
      return result;
    },
    fnName: 'setPasswordResetToken',
  });
};

const getUserByResetToken = async (token, email) => {
  return withDbConnection({
    database: 'caligulad',
    queryFn: async (pool) => {
      const result = await pool
        .request()
        .input('resetToken', sql.NVarChar, token)
        .input('email', sql.NVarChar, email)
        .query(
          'SELECT uuid, email, resetTokenExpiry FROM FAJITA.dbo.Authentication WHERE resetToken = @resetToken AND email = @email'
        );
      return result.recordset[0];
    },
    fnName: 'getUserByResetToken',
  });
};

const updatePassword = async (uuid, hashedPassword) => {
  return withDbConnection({
    database: 'caligulad',
    queryFn: async (pool) => {
      const result = await pool
        .request()
        .input('uuid', sql.UniqueIdentifier, uuid)
        .input('password', sql.NVarChar, hashedPassword)
        .query(
          'UPDATE FAJITA.dbo.Authentication SET password = @password WHERE uuid = @uuid'
        );
      return result;
    },
    fnName: 'updatePassword',
  });
};

const clearPasswordResetToken = async (uuid) => {
  return withDbConnection({
    database: 'caligulad',
    queryFn: async (pool) => {
      const result = await pool
        .request()
        .input('uuid', sql.UniqueIdentifier, uuid)
        .query(
          'UPDATE FAJITA.dbo.Authentication SET resetToken = NULL, resetTokenExpiry = NULL WHERE uuid = @uuid'
        );
      return result;
    },
    fnName: 'clearPasswordResetToken',
  });
};

const getAllUsersWithClient = async () => {
  return withDbConnection({
    database: 'caligulad',
    queryFn: async (pool) => {
      const result = await pool
        .request()
        .query(`
          SELECT
            a.email,
            STRING_AGG(r.roleName, ', ') AS roles,
            c.clientname,
            a.LastActive
          FROM FAJITA.dbo.Authentication a
          LEFT JOIN FAJITA.dbo.UserRoles ur ON a.uuid = ur.uuid
          LEFT JOIN FAJITA.dbo.Roles r ON ur.role = r.roleid
          LEFT JOIN FAJITA.dbo.UserProfiles up ON a.uuid = up.uuid
          LEFT JOIN tblClients c ON up.clientid = c.clientid
          GROUP BY a.uuid, a.email, c.clientname, a.LastActive
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
    database: 'caligulad',
    queryFn: async (pool) => {
      const result = await pool
        .request()
        .query(`
          SELECT
            a.email,
            STRING_AGG(r.roleName, ', ') AS roles
          FROM FAJITA.dbo.Authentication a
          LEFT JOIN FAJITA.dbo.UserRoles ur ON a.uuid = ur.uuid
          LEFT JOIN FAJITA.dbo.Roles r ON ur.role = r.roleid
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
    database: 'caligulad',
    queryFn: async (pool) => {
      const rolesString = roles.join(',');

      const request = pool.request();
      request.input('uuid', sql.UniqueIdentifier, uuid);
      request.input('roles', sql.VarChar, rolesString);

      const query = `
        INSERT INTO FAJITA.dbo.UserRoles (uuid, role)
        SELECT @uuid, value
        FROM STRING_SPLIT(@roles, ',')
        WHERE CAST(value AS INT) NOT IN (
          SELECT role FROM FAJITA.dbo.UserRoles WHERE uuid = @uuid
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
    database: 'caligulad',
    queryFn: async (pool) => {
      const rolesString = roles.join(',');

      const request = pool.request();
      request.input('uuid', sql.UniqueIdentifier, uuid);
      request.input('roles', sql.VarChar, rolesString);

      const query = `
        DELETE FROM FAJITA.dbo.UserRoles
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
    database: 'caligulad',
    queryFn: async (pool) => {
      const request = pool.request();
      request.input('uuid', sql.UniqueIdentifier, uuid);

      if (clientId) {
        request.input('clientId', sql.VarChar, clientId);
      } else {
        request.input('clientId', sql.VarChar, null);
      }

      const query = `
        UPDATE FAJITA.dbo.UserProfiles
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
    database: 'caligulad',
    queryFn: async (pool) => {
      const transaction = new sql.Transaction(pool);
      try {
        await transaction.begin();

        // Delete all existing roles for the user
        const deleteRequest = new sql.Request(transaction);
        deleteRequest.input('uuid', sql.UniqueIdentifier, uuid);
        await deleteRequest.query('DELETE FROM FAJITA.dbo.UserRoles WHERE uuid = @uuid');

        // Insert new roles one by one
        if (roles && roles.length > 0) {
          for (const roleId of roles) {
            const insertRequest = new sql.Request(transaction);
            insertRequest.input('uuid_param', sql.UniqueIdentifier, uuid);
            insertRequest.input('role_param', sql.Int, roleId);
            await insertRequest.query('INSERT INTO FAJITA.dbo.UserRoles (uuid, role) VALUES (@uuid_param, @role_param)');
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
    database: 'caligulad',
    queryFn: async (pool) => {
      const result = await pool
        .request()
        .input('clientId', sql.Int, clientId)
        .query(`
          SELECT a.email
          FROM FAJITA.dbo.Authentication a
          INNER JOIN FAJITA.dbo.UserProfiles up ON a.uuid = up.uuid
          WHERE up.clientId = @clientId
        `);
      return result.recordset;
    },
    fnName: 'getUsersByClientId',
  });
};

const deleteUserByEmail = async (email) => {
  return withDbConnection({
    database: 'caligulad',
    queryFn: async (pool) => {
      const result = await pool
        .request()
        .input('email', sql.NVarChar, email)
        .query('DELETE FROM FAJITA.dbo.Authentication WHERE email = @email');
      return result.rowsAffected;
    },
    fnName: 'deleteUserByEmail',
  });
};

const updateLastActive = async (email) => {
  return withDbConnection({
    database: 'caligulad',
    queryFn: async (pool) => {
      const result = await pool
        .request()
        .input('email', sql.NVarChar, email)
        .input('lastActive', sql.DateTime, new Date())
        .query('UPDATE FAJITA.dbo.Authentication SET LastActive = @lastActive WHERE email = @email');
      return result.rowsAffected;
    },
    fnName: 'updateLastActive',
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
  updateLastActive,
};
