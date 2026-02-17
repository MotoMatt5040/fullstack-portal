// Auth Service - Standalone Authentication Microservice
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { corsOptions } = require('@internal/cors-config');
const authRoutes = require('./routes/authRoutes');
const errorHandler = require('@internal/error-handler');
const { sequelize } = require('./models');

const app = express();
const PORT = process.env.AUTH_SERVICE_PORT || 5001;

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Health check endpoint
app.get('/health', async (req, res) => {
  let dbStatus = 'unknown';
  try {
    await sequelize.authenticate();
    dbStatus = 'connected';
  } catch (error) {
    dbStatus = `error: ${error.message}`;
  }

  res.status(200).json({
    status: 'healthy',
    service: 'auth-service',
    database: dbStatus,
    dbName: 'FAJITA',
    timestamp: new Date().toISOString()
  });
});

// Mount auth routes
app.use('/api', authRoutes);

// Error handler
app.use(errorHandler);

// Start server
app.listen(PORT, async () => {
  console.log(`Auth Service running on port ${PORT}`);

  // Test database connection
  try {
    await sequelize.authenticate();
    console.log('Auth Service: Database connection established (FAJITA)');
  } catch (error) {
    console.error('Auth Service: Unable to connect to database:', error.message);
  }
});
