const { withDbConnection, sql, DATABASE_TYPES } = require('@internal/db-connection');
const { VOXCO: voxco } = DATABASE_TYPES;

const getPhoneProjects = async (projectId) => {
  return withDbConnection({
    database: voxco,
    queryFn: async (pool) => {
      // Match exact projectId OR projectId with valid suffixes (C, W, COM)
      // C = Cell, W = Web, COM = Combined, base = Landline
      // This prevents 13247 from matching 13247OS (different project)
      const result = await pool
        .request()
        .input('projectId', sql.NVarChar, projectId)
        .input('projectIdC', sql.NVarChar, projectId + 'C')
        .input('projectIdW', sql.NVarChar, projectId + 'W')
        .input('projectIdCOM', sql.NVarChar, projectId + 'COM')
        .query(
          `SELECT k_Id, name FROM [VoxcoSystem].[dbo].[tblObjects]
           WHERE tblobjects.Type = 1
           AND name IN (@projectId, @projectIdC, @projectIdW, @projectIdCOM)
           AND ParentId > 1000
           AND name NOT LIKE '%WOE%'
           ORDER BY name DESC`
        );
      return result.recordset;

      // OLD CODE - matched any project starting with projectId (caused 13247 to match 13247OS)
      // const result = await pool
      //   .request()
      //   .input('projectId', sql.NVarChar, projectId)
      //   .query(
      //     "SELECT k_Id, name FROM [VoxcoSystem].[dbo].[tblObjects] WHERE tblobjects.Type = 1 AND name LIKE @projectId + '%' AND ParentId > 1000 AND name NOT LIKE '%WOE%' ORDER BY name DESC"
      //   );
      // return result.recordset;
    },
    fnName: 'getPhoneProjects',
  });
};

const getWebProjects = async (projectId) => {
  return withDbConnection({
    database: voxco,
    queryFn: async (pool) => {
      // Web surveys use LIKE pattern because they may have different suffixes
      // than phone projects (not limited to C, W, COM)
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
  getPhoneProjects,
  getWebProjects,
};
