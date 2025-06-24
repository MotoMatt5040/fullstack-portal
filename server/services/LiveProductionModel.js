// const sql = require('mssql');
// const withDbConnection = require('../config/dbConnPromark');

// const getHourlyProduction = async (projectid, location) => {
// 	let conditions = [];
// 	let parameters = {};

// 	if (projectid) {

// 		conditions.push('projectid = @projectid');
// 		parameters.projectid = projectid;
// 	}

// 	if (location) {
// 		conditions.push('recloc = @location');
// 		parameters.location = location;
// 	} else if (!projectid){
// 		conditions.push("recloc = '99'");
// 	}

// 	const whereClause = `WHERE ${conditions.join(' AND ')}`;

// 	const activeProjectSummaryQuery = `
//     SELECT recloc, projectid, projname, cms, hrs, cph, al, mph
//     FROM tblHourlyProduction
//     ${whereClause}
//   `;

// 	return withDbConnection(async (pool) => {
// 		const queryRequest = pool.request();

// 		if (parameters.projectid) {
// 			queryRequest.input('projectid', parameters.projectid);
// 		}
// 		if (parameters.location) {
// 			queryRequest.input('location', parameters.location);
// 		}

// 		const result = await queryRequest.query(activeProjectSummaryQuery);
// 		return result.recordset;
// 	});
// };

// const getInterviewerIDList = async () => {
// 	const interviewerListQuery =
// 		'SELECT CONCAT(fname + lname) as fullname, empid, voxcoid from tblEmployees';
// 	return withDBConnection(async (pool) => {
// 		const result = await pool.request().query(interviewerListQuery);
// 		return result.recordset;
// 	});
// };

// const getAllLiveProjects = async () => {
// 	const liveProjectsQuery = `
//   SELECT DISTINCT hp.recloc, l.locationname, hp.projectid 
//   FROM tblHourlyProduction hp 
//   JOIN tblLocation l ON hp.recloc = l.locationid`;

// 	return withDbConnection(async (pool) => {
// 		const result = await pool.query(liveProjectsQuery);
// 		return result.recordset;
// 	});
// };

// const getFilteredLiveProjects = async (projectid, location) => {
// 	let conditions = [];
// 	let parameters = {};

// 	if (projectid) {
// 		conditions.push('projectid = @projectid');
// 		parameters.projectid = projectid;
// 	}

// 	if (location) {
// 		conditions.push('recloc = @location');
// 		parameters.location = location;
// 	}

// 	const whereClause = projectid || location ? `WHERE ${conditions.join(' AND ')}` : '';

// 	const liveProjectsQuery = `
//   SELECT DISTINCT hp.recloc, l.locationname, hp.projectid 
//   FROM tblHourlyProduction hp 
//   JOIN tblLocation l ON hp.recloc = l.locationid 
//   ${whereClause}`;

// 	return withDbConnection(async (pool) => {
// 		const queryRequest = pool.request();

// 		if (parameters.projectid) {
// 			queryRequest.input('projectid', parameters.projectid);
// 		}
// 		if (parameters.location) {
// 			queryRequest.input('location', parameters.location);
// 		}

// 		const result = await queryRequest.query(liveProjectsQuery);
// 		return result.recordset;
// 	});
// };

// // const getHourlyProductionDetail = async (projectid, recdate) => {
// //   return withDbConnection(async (pool) => {
// //     const result = await pool
// //       .request()
// //       .query('SELECT * FROM tblHourlyProductionDetail');

// //     return result.recordset;
// //   });
// // };

// module.exports = { getHourlyProduction, getInterviewerIDList, getAllLiveProjects, getFilteredLiveProjects };
