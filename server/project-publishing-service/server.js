require('dotenv').config();
const express = require('express');
const cors = require('cors');
const errorHandler = require('@internal/error-handler');
const { initializeRoles } = require('@internal/roles-config');

const app = express();
const PORT = process.env.PORT || 5011;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', service: 'project-publishing-service' });
});

// Initialize roles and start server
const startServer = async () => {
  try {
    // Initialize roles from database before mounting routes
    await initializeRoles();

    // Mount routes (after roles are initialized)
    const projectPublishingRoutes = require('./routes/projectPublishingRoutes');
    app.use('/api/project-publishing', projectPublishingRoutes);

    // Error handler
    app.use(errorHandler);

    app.listen(PORT, () => {
      console.log(`Project Publishing service running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start Project Publishing Service:', error);
    process.exit(1);
  }
};

startServer();
