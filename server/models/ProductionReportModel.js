const sql = require('mssql');
const withDbConnection = require('../config/dbConnPromark');

const getProductionReportData = async (projectIds, startDate, endDate) => {
	console.log(projectIds, startDate, endDate);
	console.log(typeof projectIds);

	const conditionString = projectIds
		.map((id, index) => `tblProduction.projectId = @projectId${index}`)
		.join(' OR ');

	const productionReportQuery = `SELECT DISTINCT tblProduction.projectId, eid, refname, recloc, SUM(hrs) as hrs, sum(connecttime) AS connecttime, sum(pausetime) AS pausetime, FORMAT(SUM(cms) / SUM(hrs), '0.##') AS cph, SUM(cms) as cms, AVG(intal) as intal, FORMAT(SUM(cms) / sum(hrs) * AVG(intal), '0.##') as mph, SUM(totaldials) as totaldials
    FROM tblProduction INNER JOIN tblEmployees ON empid = eid 
    INNER JOIN tblAspenProdII ON tblAspenProdII.empid = tblProduction.eid AND tblAspenProdII.projectId = tblProduction.projectId AND tblAspenProdII.recdate = tblProduction.recdate 
    WHERE (${conditionString}) AND tblProduction.recdate >= @startDate AND tblProduction.recdate <= @endDate GROUP BY tblProduction.projectId, eid, refname, tblProduction.recloc ORDER BY cph desc, mph desc`;

	console.log(productionReportQuery);

	return withDbConnection(async (pool) => {
		const request = pool.request();

		projectIds.forEach((id, index) => {
			request.input(`projectId${index}`, sql.NVarChar, id);
		});

		request.input('startDate', sql.NVarChar, startDate);
		request.input('endDate', endDate ? sql.NVarChar : null, endDate);

		const result = await request.query(productionReportQuery);
		return result.recordset;
	});
};

const getProjectsInDateRange = async (startDate, endDate) => {
	const productionReportQuery = `SELECT DISTINCT projectId
    FROM tblProduction 
    WHERE recdate >= @startDate AND recdate <= @endDate`;

	console.log(productionReportQuery);

	return withDbConnection(async (pool) => {
		const request = pool.request();

		request.input('startDate', sql.NVarChar, startDate);
		request.input('endDate', endDate ? sql.NVarChar : null, endDate);

		const result = await request.query(productionReportQuery);
        console.log(result.recordset)
		return result.recordset;
	});
};

module.exports = { getProductionReportData, getProjectsInDateRange };
