const axios = require('../api/axios');
const sql = require('mssql');
const withDbConnection = require('../config/dbConn');
const { promark } = require('../utils/databaseTypes');

const getWebQuotas = async (sid) => {
	//sid is a voxco project id
	try {
		const res = await axios.get(`/api/quotas/${sid}`);
		return res.data;
	} catch (error) {
		console.error('Error fetching web quotas:');
	}
};

const getPhoneQuotas = async (sid, token) => {
	//sid is a voxco project id
	// console.log(sid)
	try {
		const res = await axios.get(
			`/voxco.api/projects/${sid}/stratas?status=All`,
			{
				headers: {
					Authorization: `Client ${token}`,
				},
			}
		);
		return res.data;
	} catch (error) {
		console.error('Error fetching phone quotas:');
	}
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
		whereConditions.unshift(`a.email = @userId`); //This adds the condition for the email to the beginning of the whereConditions array, making sure it appears first in the SQL WHERE clause.
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
		allowAbort: true,
		allowRetry: true,
	});
};

module.exports = {
	getWebQuotas,
	getPhoneQuotas,
	getProjectsList,
};
