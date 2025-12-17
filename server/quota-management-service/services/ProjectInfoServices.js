const sql = require('mssql');
const withDbConnection = require('../config/dbConn');
const { voxco } = require('../config/databaseTypes');

const getPhoneProjects = async (projectId) => {
  return withDbConnection({
    database: voxco,
    queryFn: async (pool) => {
      const result = await pool
        .request()
        .input('projectId', sql.NVarChar, projectId)
        .query(
          "SELECT k_Id, name FROM [VoxcoSystem].[dbo].[tblObjects] WHERE tblobjects.Type = 1 AND name LIKE @projectId + '%' AND ParentId > 1000 AND name NOT LIKE '%WOE%' ORDER BY name DESC"
        );
      return result.recordset;
    },
    fnName: 'getPhoneProjects',
  });
};

const getWebProjects = async (projectId) => {
  return withDbConnection({
    database: voxco,
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
  getPhoneProjects,
  getWebProjects,
};
