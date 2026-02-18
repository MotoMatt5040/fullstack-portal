require('dotenv').config();
const express = require('express');
const cors = require('cors');
const errorHandler = require('@internal/error-handler');
const { initializeRoles } = require('@internal/roles-config');
const { corsOptions } = require('@internal/cors-config');

const app = express();
const PORT = process.env.PORT || 5016;

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res
    .status(200)
    .json({ status: 'healthy', service: 'extraction-task-service' });
});

// Initialize roles and start server
const startServer = async () => {
  await initializeRoles();

  const extractionTaskRoutes = require('./routes/extractionTaskRoutes');
  app.use('/api/extraction-tasks', extractionTaskRoutes);

  app.use(errorHandler);

  app.listen(PORT, () => {
    console.log(`Extraction Task service running on port ${PORT}`);
  });
};

startServer();
