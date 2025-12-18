// Sample Automation Service - Standalone Microservice
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const { corsOptions, credentials } = require('./config/corsOptions');
const errorHandler = require('./middleware/errorHandler');
const { initializeRoles } = require('@internal/roles-config');

const app = express();
const PORT = process.env.PORT || 5006;

// Handle credentials check before CORS
app.use(credentials);

// CORS
app.use(cors(corsOptions));

// Built-in middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

// Health check endpoints (both for direct access and via gateway)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', service: 'sample-automation-service' });
});
app.get('/api/sample-automation/health', (req, res) => {
  res.status(200).json({ status: 'healthy', service: 'sample-automation-service' });
});

// Initialize roles and start server
const startServer = async () => {
  try {
    // Initialize roles from database before mounting routes
    await initializeRoles();

    // Mount Sample Automation routes (after roles are initialized)
    const sampleAutomationRoutes = require('./routes/sampleAutomationRoutes');
    app.use('/api/sample-automation', sampleAutomationRoutes);

    // Global error handler
    app.use(errorHandler);

    // Start server
    app.listen(PORT, () => {
      console.log(`Sample Automation Service running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start Sample Automation Service:', error);
    process.exit(1);
  }
};

startServer();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Closing connections...');
  const { closeAllPools } = require('./config/dbConn');
  await closeAllPools();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received. Closing connections...');
  const { closeAllPools } = require('./config/dbConn');
  await closeAllPools();
  process.exit(0);
});
