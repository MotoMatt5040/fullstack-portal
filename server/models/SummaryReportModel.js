const sql = require('mssql');
const withDbConnection = require('../config/dbConnPromark');

const getLiveSummaryReportData = async () => {
	const liveSummaryQuery = `SELECT gpcph.recDate, hpd.projectId, projName, cms, hrs, cph, gpcph, mph, al
    FROM tblHourlyProduction AS hpd
    INNER JOIN tblGPCPHDaily AS gpcph ON hpd.projectId = gpcph.projectId
		WHERE CONVERT(date, gpcph.recDate) = CONVERT(date, GETDATE()) and recloc = 99`;
		// where gpcph.recDate = '2025-03-11' and recloc = 99`; // THIS LINE IS FOR TESTING ONLY

	return withDbConnection(
		async (pool) => {
			const result = await pool.query(liveSummaryQuery);
			return result.recordset;
		},
		(attempts = 5),
		(fnName = 'getLiveSummaryReportData')
	);
};

const getLiveInterviewerData = async () => {
	const qry = `
	SELECT hpd.projectId, loc.longName, empList.eid, 
		empList.lastName + ', ' + empList.firstName AS myName, 
		emp.tenure, hpd.hrs, hpd.cms, avgLen.intAvg AS intAL, 
		hpd.cph, hpd.mph, hpd.pauseTime, hpd.connectTime, 
		ic.totalDials, naam.naam
	FROM tblHourlyProductionDetail hpd
	INNER JOIN tblCC3EmployeeList empList ON hpd.VoxcoID = empList.VoxcoID
	INNER JOIN tblEmployees emp ON emp.EmpID = empList.eid 
	INNER JOIN tblLocation loc ON hpd.recloc = loc.LocationID
	LEFT JOIN (SELECT VoxcoID, ROUND(AVG(duration / 60), 2) AS IntAvg 
		FROM tblavgLengthShift GROUP BY VoxcoID) avgLen 
		ON avgLen.VoxcoID = empList.VoxcoID
	INNER JOIN (SELECT VoxcoID, ProjectID, SUM(CodeQty) AS TotalDials 
		FROM tblIntCodes WHERE Code = 'TD' 
		GROUP BY VoxcoID, ProjectID) ic 
		ON ic.VoxcoID = empList.VoxcoID AND hpd.projectID = ic.ProjectID
	INNER JOIN (SELECT empList.eid, SUM(ic.CodeQty) AS NAAM 
		FROM tblIntCodes ic
		INNER JOIN tblCC3EmployeeList empList ON ic.VoxcoID = empList.VoxcoID 
		WHERE ic.Code = '02'
		GROUP BY empList.eid) naam 
		ON naam.eid = empList.eid
	ORDER BY hpd.cms DESC;`;

	return withDbConnection(
		async (pool) => {
			const result = await pool.query(qry);
			return result.recordset;
		},
		(attempts = 5),
		(fnName = 'getLiveInterviewerData')
	);
};

const getHistoricSummaryReportInterviewerData = async (startDate, endDate) => {
	const qry = `
	SELECT DISTINCT pd.recDate, pd.projectId, projname, refname,
		SUM(cms) AS cms,
		SUM(hrs) AS hrs,
		FORMAT(SUM(cms) / SUM(hrs), '0.##') AS cph,
		pd.gpcph,
		FORMAT(SUM(cms) / SUM(hrs) * intal, '0.##') AS mph,
		intal as al
	FROM tblProduction AS pd
	INNER JOIN tblBlueBookProjMaster AS bbpm ON pd.projectid = bbpm.projectid and pd.recdate = bbpm.recdate
		WHERE pd.recDate >= @startDate
		AND pd.recDate <= @endDate
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

	return withDbConnection(async (pool) => {
		const request = pool.request();

		request.input('startDate', sql.NVarChar, startDate);
		request.input('endDate', sql.NVarChar, endDate);

		const result = await request.query(qry);
		return result.recordset
	});
};

getHistoricSummaryReportProjectData = async (startDate, endDate) => {
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
  FROM tblBlueBookProjMaster as bbpm
  inner join tblGPCPHDaily as gpcph 
	on bbpm.projectid = gpcph.projectid and bbpm.recDate = gpcph.recDate
	 where bbpm.recDate >= @startDate and bbpm.recDate <= @endDate`

	 return withDbConnection(async (pool) => {
		const request = pool.request();

		request.input('startDate', sql.NVarChar, startDate);
		request.input('endDate', sql.NVarChar, endDate);

		const result = await request.query(qry);
		return result.recordset
	});
}

module.exports = { getLiveSummaryReportData, getLiveInterviewerData, getHistoricSummaryReportInterviewerData, getHistoricSummaryReportProjectData };
