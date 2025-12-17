// Notification Service - allowedOrigins.js

const allowedOrigins = [
    // Production
    'https://www.promarkresearch.com',
    'https://dashboard.promarkresearch.com',
    'https://api.dashboard.promarkresearch.com',
    // Testing
    'https://portaldevelopment1.promarkresearch.com',
    // Development (HTTP for local dev)
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
    'https://localhost',
    'https://localhost:443',
    // Dynamic from env
    process.env.CLIENT_URL,
    process.env.VITE_DOMAIN_NAME ? `https://${process.env.VITE_DOMAIN_NAME}` : null,
].filter(Boolean);

module.exports = allowedOrigins;
