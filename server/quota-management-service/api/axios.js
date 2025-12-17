const axios = require('axios');

const VOXCO_WEB_API_ACCESS_KEY = process.env.VOXCO_WEB_API_ACCESS_KEY;

const instance = axios.create({
  baseURL: 'https://prcmmweb.promarkresearch.com',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptors for requests
instance.interceptors.request.use((config) => {
  // Add Authorization ONLY if the request URL starts with /api (Web API)
  if (config.url && config.url.startsWith('/api')) {
    if (VOXCO_WEB_API_ACCESS_KEY) {
      config.headers['Authorization'] = `Client ${VOXCO_WEB_API_ACCESS_KEY}`;
    }
  }

  return config;
}, (error) => Promise.reject(error));

// Interceptors for responses
instance.interceptors.response.use(
  (response) => response,
  (error) => {
    return Promise.reject(error);
  }
);

module.exports = instance;
