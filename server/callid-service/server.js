// CallID Service - Standalone Microservice
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { corsOptions, credentials } = require('@internal/cors-config');
const errorHandler = require('@internal/error-handler');
const { initializeRoles } = require('@internal/roles-config');

const app = express();
const PORT = process.env.PORT || 5004;

// Handle credentials check before CORS
app.use(credentials);

// CORS
app.use(cors(corsOptions));

// Built-in middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Health check endpoints (both for direct access and via gateway)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', service: 'callid-service' });
});
app.get('/api/callid/health', (req, res) => {
  res.status(200).json({ status: 'healthy', service: 'callid-service' });
});

// Initialize roles and start server
const startServer = async () => {
  await initializeRoles();

  // Mount CallID routes
  const callidRoutes = require('./routes/callidRoutes');
  app.use('/api/callid', callidRoutes);

  // Global error handler
  app.use(errorHandler);

  app.listen(PORT, () => {
    console.log(`CallID Service running on port ${PORT}`);
  });
};

startServer();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Closing connections...');
  const { closeAllPools } = require('@internal/db-connection');
  await closeAllPools();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received. Closing connections...');
  const { closeAllPools } = require('@internal/db-connection');
  await closeAllPools();
  process.exit(0);
});
