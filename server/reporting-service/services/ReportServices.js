const { withDbConnection, sql, DATABASE_TYPES } = require('@internal/db-connection');
const { CALIGULAD: caligulad } = DATABASE_TYPES;

const getLiveReportData = async (projectId) => {
  const projectIdCondition = projectId ? `AND hp.projectId = @projectId` : '';
  const qry = `
  SELECT
    hp.projectId,
    gpcph.recDate,
    projName,
    cms,
    hrs,
    cph,
    gpcph,
    mph,
    al
  FROM tblHourlyProduction AS hp
  INNER JOIN tblGPCPHDaily AS gpcph
    ON hp.projectId = gpcph.projectId
  WHERE CONVERT(date, gpcph.recDate) = CONVERT(date, GETDATE())
    AND recloc = 99
    ${projectIdCondition}
  ORDER BY
    hp.projectId ASC;`;

  const res = withDbConnection({
    database: caligulad,
    queryFn: async (pool) => {
      const request = pool.request();
      if (projectId) request.input('projectId', sql.NVarChar, projectId);

      const result = await request.query(qry);
      return result.recordset;
    },
    attempts: 5,
    fnName: 'getLiveSummaryData',
    allowAbort: true,
    allowRetry: true,
  });
  return res;
};

const getLiveInterviewerData = async (projectId) => {
  const projectIdCondition = projectId
    ? `WHERE hpd.projectId = @projectId`
    : '';
  const qry = `
SELECT
    hpd.projectId,
    loc.longName,
    empList.eid,
    empList.lastName + ', ' + empList.firstName AS myName,
    emp.tenure,
    hpd.hrs,
    hpd.cms,
    avgLen.intAvg AS intAL,
    hpd.cph,
    hpd.mph,
    hpd.pauseTime,
    hpd.connectTime,
    ic.totalDials,
    naam.naam
FROM tblHourlyProductionDetail AS hpd
INNER JOIN tblCC3EmployeeList empList
    ON hpd.VoxcoID = empList.VoxcoID
INNER JOIN tblEmployees emp
    ON emp.EmpID = empList.eid
INNER JOIN tblLocation loc
    ON hpd.recloc = loc.LocationID
LEFT JOIN (
    SELECT VoxcoID, ROUND(AVG(duration / 60), 2) AS IntAvg
    FROM tblavgLengthShift
    GROUP BY VoxcoID
) avgLen
    ON avgLen.VoxcoID = empList.VoxcoID
INNER JOIN (
    SELECT VoxcoID, ProjectID, SUM(CodeQty) AS TotalDials
    FROM tblIntCodes
    WHERE Code = 'TD'
    GROUP BY VoxcoID, ProjectID
) ic
    ON ic.VoxcoID = empList.VoxcoID
    AND hpd.projectId = ic.ProjectID
INNER JOIN (
    SELECT empList.eid, SUM(ic.CodeQty) AS NAAM
    FROM tblIntCodes ic
    INNER JOIN tblCC3EmployeeList empList
        ON ic.VoxcoID = empList.VoxcoID
    WHERE ic.Code = '02'
    GROUP BY empList.eid
) naam
    ON naam.eid = empList.eid
${projectIdCondition}
ORDER BY
  hpd.projectId ASC;`;

  const res = withDbConnection({
    database: caligulad,
    queryFn: async (pool) => {
      const request = pool.request();
      if (projectId) request.input('projectId', sql.NVarChar, projectId);
      const result = await request.query(qry);
      return result.recordset;
    },
    attempts: 5,
    fnName: 'getLiveInterviewerData',
    allowAbort: true,
    allowRetry: true,
  });
  return res;
};

const getHistoricInterviewerData = async (projectId, startDate, endDate) => {
  const projectIdCondition = projectId ? `bbpm.projectId = @projectId` : '';
  const dateCondition =
    startDate && endDate ? `bbpm.recDate BETWEEN @startDate AND @endDate` : '';
  const andClause = projectIdCondition && dateCondition ? 'AND' : '';

  const qry = `
  SELECT DISTINCT
    pd.recDate,
    pd.projectId,
    projname,
    refname,
    SUM(cms) AS cms,
    SUM(hrs) AS hrs,
    FORMAT(SUM(cms) / SUM(hrs), '0.##') AS cph,
    pd.gpcph,
    FORMAT(SUM(cms) / SUM(hrs) * intal, '0.##') AS mph,
    intal as al
  FROM tblProduction AS pd
  INNER JOIN tblBlueBookProjMaster AS bbpm
    ON pd.projectid = bbpm.projectid
    AND pd.recdate = bbpm.recdate
  WHERE
    ${projectIdCondition}
    ${andClause}
    ${dateCondition}
  GROUP BY
    pd.projectId,
    intal,
    refname,
    pd.recDate,
    pd.gpcph,
    bbpm.projname
  ORDER BY
    projectId ASC,
    recDate DESC,
    cph DESC,
    mph DESC;`;

  return withDbConnection({
    database: caligulad,
    queryFn: async (pool) => {
      const request = pool.request();

      request.input('projectId', sql.NVarChar, projectId);
      request.input('startDate', sql.NVarChar, startDate);
      request.input('endDate', sql.NVarChar, endDate);

      const result = await request.query(qry);
      return result.recordset;
    },
    attempts: 5,
    fnName: 'getHistoricInterviewerData',
    allowAbort: false,
    allowRetry: false,
  });
};

const getHistoricProjectReportData = async (projectId, startDate, endDate) => {
  const projectIdCondition = projectId ? `bbpm.projectId = @projectId` : '';
  const dateCondition =
    startDate && endDate ? `bbpm.recDate BETWEEN @startDate AND @endDate` : '';
  const andClause = projectIdCondition && dateCondition ? 'AND' : '';

  const qry = `
  SELECT
    bbpm.recDate,
    bbpm.projectId,
    projName,
    DailyCMS as cms,
    THours as hrs,
    AvgCPH as cph,
    gpcph.gpcph,
    AvgMPH as mph,
    AvgLen as al
  FROM tblBlueBookProjMaster AS bbpm
  INNER JOIN tblGPCPHDaily AS gpcph
  ON bbpm.projectid = gpcph.projectid
    AND bbpm.recDate = gpcph.recDate
  WHERE
    ${projectIdCondition}
    ${andClause}
    ${dateCondition}
  ORDER BY
    bbpm.projectId ASC,
    bbpm.recDate ASC;`;

  return withDbConnection({
    database: caligulad,
    queryFn: async (pool) => {
      const request = pool.request();

      request.input('projectId', sql.NVarChar, projectId);
      request.input('startDate', sql.NVarChar, startDate);
      request.input('endDate', sql.NVarChar, endDate);

      const result = await request.query(qry);
      return result.recordset;
    },
    attempts: 5,
    fnName: 'getHistoricProjectReportData',
    allowAbort: false,
    allowRetry: false,
  });
};

const getInterviewerProductionReportData = async (projectId, recDate) => {
  const qry = `
SELECT DISTINCT
  eid,
  refName,
  recLoc,
  tenure,
  hrs,
  sum(connecttime) AS connectTime,
  sum(pausetime) AS pauseTime,
  tp.cms,
  intal,
  mph,
  totalDials,
  tp.gpcph,
  inc,
  mean,
  targetMph,
  projName
FROM tblProduction tp
INNER JOIN tblEmployees
  ON empid = eid
INNER JOIN tblAspenProdII
  ON tblAspenProdII.empid = tp.eid
    AND tblAspenProdII.projectid = tp.projectid
    AND tblAspenProdII.recdate = tp.recdate
INNER JOIN tblDispo td
  ON tp.projectid = td.projid
  AND tp.recdate = td.dispodate
  AND singleday = 0
INNER JOIN tblGPCPHDaily gph
  ON tp.projectid = gph.projectid
  AND tp.recdate = gph.recdate
WHERE tp.projectid = @projectId
  AND tp.recdate = @recDate
GROUP BY
  eid,
  refname,
  tp.recloc,
  tenure,
  hrs,
  tp.cms,
  cph,
  mph,
  totaldials,
  intal,
  tp.gpcph,
  inc,
  mean,
  targetMph,
  projName
  `;

  return withDbConnection({
    database: caligulad,
    queryFn: async (pool) => {
      const request = pool.request();
      request.input('projectId', sql.NVarChar, projectId);
      request.input('recDate', sql.NVarChar, recDate);

      const result = await request.query(qry);
      return result.recordset;
    },
    attempts: 5,
    fnName: 'getInterviewerProductionReportData',
    allowAbort: false,
    allowRetry: false,
  });
};

const updateTargetMphAndCph = async (projectId, recDate, targetMph, gpcph, user) => {
  const qry = `
  UPDATE tblGPCPHDaily
  SET targetmph = @targetMph,
    gpcph = @gpcph,
    dateupdated = @dateupdated,
    updatedby = @updatedby
  WHERE projectId = @projectId
  AND recDate = @recDate
  `;

  return withDbConnection({
    database: caligulad,
    queryFn: async (pool) => {
      const request = pool.request();
      request.input('projectId', sql.NVarChar, projectId);
      request.input('dateupdated', sql.DateTime, new Date());
      request.input('updatedby', sql.NVarChar, user);
      request.input('recDate', sql.NVarChar, recDate);
      request.input('targetMph', sql.Float, targetMph);
      request.input('gpcph', sql.Float, gpcph);

      const result = await request.query(qry);
      return result.rowsAffected;
    },
    attempts: 5,
    fnName: 'updateTargetMph',
    allowAbort: false,
    allowRetry: false,
  });
};

module.exports = {
  getLiveReportData,
  getLiveInterviewerData,
  getHistoricInterviewerData,
  getHistoricProjectReportData,
  getInterviewerProductionReportData,
  updateTargetMphAndCph,
};
