require('dotenv').config();
const express = require('express');
const cors = require('cors');
const errorHandler = require('@internal/error-handler');
const { initializeRoles } = require('@internal/roles-config');

const app = express();
const PORT = process.env.PORT || 5009;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', service: 'reporting-service' });
});

// Initialize roles and start server
const startServer = async () => {
  try {
    // Initialize roles from database before mounting routes
    await initializeRoles();

    // Mount routes (after roles are initialized)
    const reportRoutes = require('./routes/reportRoutes');
    app.use('/api/reports', reportRoutes);

    // Error handler
    app.use(errorHandler);

    app.listen(PORT, () => {
      console.log(`Reporting service running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start Reporting Service:', error);
    process.exit(1);
  }
};

startServer();
