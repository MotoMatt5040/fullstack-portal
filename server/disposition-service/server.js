require('dotenv').config();
const express = require('express');
const cors = require('cors');
const errorHandler = require('@internal/error-handler');
const { initializeRoles } = require('@internal/roles-config');

const app = express();
const PORT = process.env.PORT || 5012;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', service: 'disposition-service' });
});

// Initialize roles and start server
const startServer = async () => {
  await initializeRoles();

  const dispositionRoutes = require('./routes/dispositionRoutes');
  app.use('/api/disposition-report', dispositionRoutes);

  app.use(errorHandler);

  app.listen(PORT, () => {
    console.log(`Disposition service running on port ${PORT}`);
  });
};

startServer();
