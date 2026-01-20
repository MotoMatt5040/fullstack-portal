// User Management Service - Standalone Microservice
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { corsOptions, credentials } = require('@internal/cors-config');
const errorHandler = require('@internal/error-handler');
const { initializeRoles } = require('@internal/roles-config');

const app = express();
const PORT = process.env.PORT || 5007;

// Handle credentials check before CORS
app.use(credentials);

// CORS
app.use(cors(corsOptions));

// Built-in middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Health check endpoints (both for direct access and via gateway)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', service: 'user-management-service' });
});
app.get('/api/users/health', (req, res) => {
  res.status(200).json({ status: 'healthy', service: 'user-management-service' });
});

// Initialize roles and start server
const startServer = async () => {
  try {
    // Initialize roles from database before mounting routes
    await initializeRoles();

    // Mount User Management routes (after roles are initialized)
    const userRoutes = require('./routes/userRoutes');
    app.use('/api/users', userRoutes);

    // Global error handler
    app.use(errorHandler);

    // Start server
    app.listen(PORT, () => {
      console.log(`User Management Service running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start User Management Service:', error);
    process.exit(1);
  }
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
