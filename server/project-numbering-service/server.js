// Project Numbering Service - server.js
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { corsOptions } = require('@internal/cors-config');
const errorHandler = require('@internal/error-handler');
const { initializeRoles } = require('@internal/roles-config');

const app = express();
const PORT = process.env.PROJECT_NUMBERING_PORT || 5003;

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

// Root health check (for Docker healthcheck)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'project-numbering-service',
    timestamp: new Date().toISOString()
  });
});

// Start server after initializing roles
const startServer = async () => {
  try {
    // Initialize roles from database before loading routes
    await initializeRoles();

    // Mount routes after roles are loaded
    const projectRoutes = require('./routes/projectRoutes');
    app.use('/api', projectRoutes);

    // Error handler
    app.use(errorHandler);

    app.listen(PORT, () => {
      console.log(`Project Numbering Service running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start Project Numbering Service:', error);
    process.exit(1);
  }
};

startServer();
