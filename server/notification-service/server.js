// Notification Service - Standalone Notification Microservice
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const corsOptions = require('./config/corsOptions');
const errorHandler = require('./middleware/errorHandler');
const { initializeRoles } = require('@internal/roles-config');

const app = express();
const PORT = process.env.NOTIFICATION_SERVICE_PORT || 5002;

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Health check endpoint
app.get('/health', (req, res) => {
  const { getClientCount } = require('./services/notificationService');
  res.status(200).json({
    status: 'healthy',
    service: 'notification-service',
    timestamp: new Date().toISOString(),
    connectedClients: getClientCount()
  });
});

// Start server after initializing roles
const startServer = async () => {
  try {
    // Initialize roles from database before loading routes
    await initializeRoles();

    // Mount routes after roles are loaded
    const notificationRoutes = require('./routes/notificationRoutes');
    app.use('/api', notificationRoutes);

    // Error handler
    app.use(errorHandler);

    app.listen(PORT, () => {
      console.log(`Notification Service running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start Notification Service:', error);
    process.exit(1);
  }
};

startServer();
