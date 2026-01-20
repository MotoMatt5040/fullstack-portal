require('dotenv').config();
const express = require('express');
const cors = require('cors');
const errorHandler = require('@internal/error-handler');
const { initializeRoles } = require('@internal/roles-config');
const { corsOptions } = require('@internal/cors-config');

const app = express();
const PORT = process.env.PORT || 5010;

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', service: 'project-info-service' });
});

// Initialize roles and start server
const startServer = async () => {
  try {
    // Initialize roles from database before mounting routes
    await initializeRoles();

    // Mount routes (after roles are initialized)
    const projectInfoRoutes = require('./routes/projectInfoRoutes');
    app.use('/api/project-info', projectInfoRoutes);

    // Error handler
    app.use(errorHandler);

    app.listen(PORT, () => {
      console.log(`Project Info service running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start Project Info Service:', error);
    process.exit(1);
  }
};

startServer();
