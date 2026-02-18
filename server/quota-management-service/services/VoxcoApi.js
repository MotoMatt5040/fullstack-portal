const axios = require('@internal/voxco-api');

const VOXCO_API_USERNAME = process.env.VOXCO_API_USERNAME;
const VOXCO_API_PASSWORD = process.env.VOXCO_API_PASSWORD;
const VOXCO_API_CONTEXT = process.env.VOXCO_API_CONTEXT;

const refreshAccessToken = async () => {
  try {
    const res = await axios.get(
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
    console.error('Error refreshing Voxco access token:', error.message);
  }
};

module.exports = { refreshAccessToken };
