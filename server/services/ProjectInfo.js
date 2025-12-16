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
    // Only show projects from the last 180 days
    'p.startDate >= DATEADD(DAY, -180, GETDATE())',
  ];

  if (userId) {
    // Join with user projects table to filter by user access
    // Note: tblUserProjects uses string projectId, so we cast FAJITA projectID to varchar
    // Tables are in the default database for the promark connection (no database prefix needed)
    joinClause = `
INNER JOIN dbo.tblUserProjects up ON CAST(p.projectID AS VARCHAR(20)) = up.projectId
INNER JOIN dbo.tblAuthentication a ON a.uuid = up.uuid`;
    whereConditions.unshift(`a.email = @userId`);
  }

  const qry = `
SELECT
    projectId,
    projectName,
    fieldStart,
    clientId,
    clientName
FROM (
    SELECT DISTINCT
        CAST(p.projectID AS VARCHAR(20)) AS projectId,
        p.projectName,
        p.startDate AS fieldStart,
        c.ClientID AS clientId,
        COALESCE(c.ClientName, p.client) AS clientName
    FROM
        FAJITA.dbo.Projects p
    LEFT JOIN CaligulaD.dbo.tblClients c ON p.client = c.ClientName
    ${joinClause}
    WHERE
        ${whereConditions.join(' AND ')}
) AS projects
ORDER BY
    projectId DESC;
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
    // Only show projects from the last 180 days
    'p.startDate >= DATEADD(DAY, -180, GETDATE())',
  ];

  const qry = `
SELECT
    projectId,
    projectName,
    fieldStart,
    clientId,
    clientName
FROM (
    SELECT DISTINCT
        CAST(p.projectID AS VARCHAR(20)) AS projectId,
        p.projectName,
        p.startDate AS fieldStart,
        c.ClientID AS clientId,
        COALESCE(c.ClientName, p.client) AS clientName
    FROM
        FAJITA.dbo.Projects p
    LEFT JOIN CaligulaD.dbo.tblClients c ON p.client = c.ClientName
    WHERE
        ${whereConditions.join(' AND ')}
) AS projects
ORDER BY
    projectId DESC;
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
