const sql = require('mssql');
const withDbConnection = require('../config/dbConn');
const { promark, voxco } = require('../utils/databaseTypes');

const getPhoneProjects = async (projectId) => {
  return withDbConnection({
    database: voxco,
    queryFn: async (pool) => {
      const result = await pool
        .request()
        .input('projectId', sql.NVarChar, projectId)
        .query(
          // ParentId > 1000 is to filter out folders. To understand run SELECT k_Id, name, * FROM [VoxcoSystem].[dbo].[tblObjects] where tblobjects.Type = 1 and name LIKE '13100%'
          "SELECT k_Id, name FROM [VoxcoSystem].[dbo].[tblObjects] WHERE tblobjects.Type = 1 AND name LIKE @projectId + '%' AND ParentId > 1000 AND name NOT LIKE '%WOE%' ORDER BY name DESC"
        );
      return result.recordset;
    },
    fnName: 'getPhoneProjects',
  });
};

const getWebProjects = async (projectId) => {
  // for ALL WEB (stype = 3-6)
  // SELECT id FROM [A4Survey_Client_1].[dbo].[Survey] WHERE Name LIKE '<projectid>%'
  // get the quotas then filter the stype from there

  return withDbConnection({
    //possibly have userprofile with how far back to show data
    database: voxco,
    queryFn: async (pool) => {
      const qry =
        "SELECT id, name FROM [A4Survey_Client_1].[dbo].[Survey] WHERE Name LIKE @projectId + '%' ";
      const result = await pool
        .request()
        .input('projectId', sql.NVarChar, projectId)
        .query(
          //and fieldstart is < 30 days
          qry
        );
      return result.recordset;
    },
    fnName: 'getWebProjects',
  });
};

const getProjectsList = async (userId) => {
  let joinClause = '';
  let whereConditions = [
    "ph.projectId NOT LIKE '%c'",
    "ph.projectId NOT LIKE '%w'",
    'ph.fieldStart >= DATEADD(DAY, -180, GETDATE())',
  ];

  if (userId) {
    joinClause = `
INNER JOIN tblUserProjects up ON ph.projectId = up.projectId
INNER JOIN tblAuthentication a ON a.uuid = up.uuid`;
    //This adds the condition for the email to the beginning of the whereConditions array, making sure it appears first in the SQL WHERE clause.
    whereConditions.unshift(`a.email = @userId`);
  }

  const qry = `
SELECT DISTINCT 
    ph.projectId, 
    ph.projectName, 
    ph.fieldStart 
FROM 
    tblcc3projectheader ph
${joinClause}
WHERE 
    ${whereConditions.join(' AND ')}
ORDER BY 
    ph.fieldStart DESC;
`;

  return withDbConnection({
    database: promark,
    queryFn: async (pool) => {
      const request = pool.request();
      if (userId) request.input('userId', sql.VarChar, userId);
      const result = await request.query(qry);
      return result.recordset;
    },
    attempts: 5,
    fnName: 'getProjectsList',
    allowAbort: false,
    allowRetry: true,
  });
};

const unrestrictedGetProjectsList = async () => {
  const whereConditions = [
    "ph.projectId NOT LIKE '%c'",
    "ph.projectId NOT LIKE '%w'",
    'ph.fieldStart >= DATEADD(DAY, -180, GETDATE())',
  ];

  const qry = `
SELECT DISTINCT 
    ph.projectId, 
    ph.projectName, 
    ph.fieldStart 
FROM 
    tblcc3projectheader ph
WHERE 
    ${whereConditions.join(' AND ')}
ORDER BY 
    ph.fieldStart DESC;
`;

  return withDbConnection({
    database: promark,
    queryFn: async (pool) => {
      const request = pool.request();
      const result = await request.query(qry);
      return result.recordset;
    },
    attempts: 5,
    fnName: 'unrestrictedGetProjectsList',
    allowAbort: false,
    allowRetry: true,
  });
};

module.exports = {
  getPhoneProjects,
  getWebProjects,
  getProjectsList,
  unrestrictedGetProjectsList,
};
