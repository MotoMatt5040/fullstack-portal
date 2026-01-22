const { withDbConnection, sql, DATABASE_TYPES } = require('@internal/db-connection');
const { PROMARK: promark, VOXCO: voxco } = DATABASE_TYPES;

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
      //     // ParentId > 1000 is to filter out folders
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

const getProjectsList = async (userId) => {
  let joinClause = '';
  let whereConditions = [
    // Only show projects from the last 180 days
    'p.startDate >= DATEADD(DAY, -180, GETDATE())',
  ];

  if (userId) {
    // Join with user projects table to filter by user access
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
