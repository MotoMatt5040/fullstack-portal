const axios = require('../api/axios');
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

const getProjectsList = async (directorId) => {
	return withDbConnection({
		database: promark,
		queryFn: async (pool) => {
			const request = pool.request();
			if (directorId) request.input('directorId', directorId);
			const result = await request.query(
				`
SELECT DISTINCT 
    projectId, 
    projectName, 
    fieldStart 
FROM 
    tblcc3projectheader 
WHERE 
    projectid NOT LIKE '%c' 
    AND projectid NOT LIKE '%w' 
ORDER BY 
    fieldstart DESC;`
			);
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
