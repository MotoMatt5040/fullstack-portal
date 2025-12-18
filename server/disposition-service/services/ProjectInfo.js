const { withDbConnection, sql } = require('@internal/db-connection');

/**
 * Get web projects from Voxco database
 */
const getWebProjects = async (projectId) => {
  return withDbConnection({
    database: 'voxco',
    queryFn: async (pool) => {
      const qry =
        "SELECT id, name FROM [A4Survey_Client_1].[dbo].[Survey] WHERE Name LIKE @projectId + '%' ";
      const result = await pool
        .request()
        .input('projectId', sql.NVarChar, projectId)
        .query(qry);
      return result.recordset;
    },
    fnName: 'getWebProjects',
  });
};

module.exports = {
  getWebProjects,
};
