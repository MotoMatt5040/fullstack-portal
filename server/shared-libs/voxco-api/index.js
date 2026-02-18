// Voxco Web API axios instance
const axios = require('axios');

const VOXCO_WEB_API_ACCESS_KEY = process.env.VOXCO_WEB_API_ACCESS_KEY;

const instance = axios.create({
  baseURL: 'https://prcmmweb.promarkresearch.com',
  timeout: 10000, // 10 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptors for requests
instance.interceptors.request.use(
  (config) => {
    // Add Authorization ONLY if the request URL starts with /api (Web API)
    if (config.url && config.url.startsWith('/api')) {
      if (VOXCO_WEB_API_ACCESS_KEY) {
        config.headers['Authorization'] = `Client ${VOXCO_WEB_API_ACCESS_KEY}`;
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptors for responses
instance.interceptors.response.use(
  (response) => response,
  (error) => {
    return Promise.reject(error);
  }
);

const refreshAccessToken = async () => {
  try {
    const res = await instance.get(
      `/Voxco.API/authentication/user`,
      {
        params: {
          'userInfo.username': process.env.VOXCO_API_USERNAME,
          'userInfo.password': process.env.VOXCO_API_PASSWORD,
          'userInfo.context': process.env.VOXCO_API_CONTEXT,
        }
      }
    );
    return res.data;
  } catch (error) {
    console.error('Error refreshing Voxco access token:', error.message);
  }
};

// Export instance as default (backward compatible) with refreshAccessToken attached
instance.refreshAccessToken = refreshAccessToken;
module.exports = instance;
