const sql = require('mssql');
const withDbConnection = require('../config/dbConnPromark');

const getHourlyProduction = async (projectid, location) => {
    // for testing
    // location = undefined projid = undefined PASSED
    // location = 3         projid = undefined PASSED
    // location = undefined projid = 1         PASSED
    // location = 3         projid = 1         PASSED

    let projectidCondition = "";
    let locationCondition = "recloc = '99'";

    if (projectid) {
      projectidCondition = `projectid = '${projectid}'`;
      locationCondition = "recloc != '99'";
    }
    
    if (location) {
      locationCondition = `recloc = '${location}'`;
    }

    const andClause = projectidCondition && locationCondition ? 'AND' : '';

    let activeProjectSummaryQuery = `
        SELECT recloc, projectid, projname, cms, hrs, cph, al, mph
        FROM tblHourlyProduction
        WHERE ${projectidCondition} ${andClause} ${locationCondition}
    `;

  return withDbConnection(async (pool) => {
    const result = await pool.request().query(activeProjectSummaryQuery);
    return result.recordset;
  });
};

const getHourlyProductionDetail = async (projectid, recdate) => {
  return withDbConnection(async (pool) => {
    const result = await pool
      .request()
      .query('SELECT * FROM tblHourlyProductionDetail');

    return result.recordset;
  });
};
