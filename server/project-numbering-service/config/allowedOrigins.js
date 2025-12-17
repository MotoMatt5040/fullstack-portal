// Project Numbering Service - allowedOrigins.js

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
  process.env.CLIENT_URL,
  process.env.VITE_DOMAIN_NAME ? `https://${process.env.VITE_DOMAIN_NAME}` : null,
].filter(Boolean);

module.exports = allowedOrigins;
