const sql = require('mssql');
const withDbConnection = require('../config/dbConnPromark');

const getProductionReportData = async (projectid, recdate) => {
    return withDbConnection(async (pool) => {
        const result = await pool.request()
            .input('projectid', sql.NVarChar, projectid)
            .input('recdate', sql.NVarChar, recdate)
            .query(`SELECT DISTINCT eid, refname, recloc, tenure, hrs, sum(connecttime) AS connecttime, sum(pausetime) AS pausetime, cms, intal, mph, totaldials FROM tblProduction INNER JOIN tblEmployees ON empid = eid INNER JOIN tblAspenProdII ON tblAspenProdII.empid = tblProduction.eid AND tblAspenProdII.projectid = tblProduction.projectid AND tblAspenProdII.recdate = tblProduction.recdate WHERE tblProduction.projectid = @projectid AND tblProduction.recdate = @recdate GROUP BY eid, refname, tblProduction.recloc, tenure, hrs, cms, cph, mph, dpc, dph, totaldials, intal`);
        return result.recordset;
    });
}

module.exports = { getProductionReportData };