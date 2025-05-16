const axios = require('../api/axios');
const VOXCO_API_USERNAME = process.env.VOXCO_API_USERNAME;
const VOXCO_API_PASSWORD = process.env.VOXCO_API_PASSWORD;
const VOXCO_API_CONTEXT = process.env.VOXCO_API_CONTEXT;
const MATT_USERNAME = process.env.MATT_USERNAME;
const MATT_PASSWORD = process.env.MATT_PASSWORD;

const refreshAccessToken = async () => {
	try {
		const res = await axios.get(
			// `/Voxco.API/authentication/user?userInfo.username=${VOXCO_API_USERNAME}&userInfo.password=${VOXCO_API_PASSWORD}&userInfo.context=${VOXCO_API_CONTEXT}`
			`/Voxco.API/authentication/user`,
			{
				params: {
					'userInfo.username': VOXCO_API_USERNAME,
					'userInfo.password': VOXCO_API_PASSWORD,
					'userInfo.context': VOXCO_API_CONTEXT,
				}
			}
		);
		return res.data;
	} catch (error) {
		console.error('Error fetching web quotas:', error);
		// throw error;
	}
};

module.exports = { refreshAccessToken };
