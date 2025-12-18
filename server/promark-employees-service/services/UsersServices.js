const { withDbConnection, sql } = require('@internal/db-connection');

const getAllUsers = async () => {
  return withDbConnection({
    database: 'promark',
    queryFn: async (pool) => {
      const result = await pool
        .request()
        .query(`
          SELECT
            a.uuid,
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
      // Prepare the roles array to be passed as a comma-separated string to the query
      const rolesString = roles.join(',');

      const request = pool.request();
      request.input('uuid', sql.UniqueIdentifier, uuid);
      request.input('roles', sql.VarChar, rolesString);

      // This query inserts roles only if the user does not already have them
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

/**
 * Removes an array of roles from a user.
 * @param {string} uuid - The user's unique identifier.
 * @param {number[]} roles - An array of role IDs to remove.
 * @returns {Promise<object>} The result from the database operation.
 */
const removeUserRoles = async (uuid, roles) => {
  return withDbConnection({
    database: 'promark',
    queryFn: async (pool) => {
      const rolesString = roles.join(',');

      const request = pool.request();
      request.input('uuid', sql.UniqueIdentifier, uuid);
      request.input('roles', sql.VarChar, rolesString);

      // This query deletes roles that are in the provided list
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

const getUserByEmail = async (email) => {
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
    fnName: 'getUserByEmail',
  });
};

module.exports = {
  getAllUsers,
  addUserRoles,
  removeUserRoles,
  getUserByEmail,
};
