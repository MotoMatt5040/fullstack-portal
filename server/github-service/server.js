require('dotenv').config();
const express = require('express');
const cors = require('cors');
const errorHandler = require('@internal/error-handler');
const { initializeRoles } = require('@internal/roles-config');
const { corsOptions } = require('@internal/cors-config');

const app = express();
const PORT = process.env.PORT || 5014;

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', service: 'github-service' });
});

// Initialize roles and start server
const startServer = async () => {
  await initializeRoles();

  const githubRoutes = require('./routes/githubRoutes');
  app.use('/api/github', githubRoutes);

  app.use(errorHandler);

  app.listen(PORT, () => {
    console.log(`GitHub service running on port ${PORT}`);
  });
};

startServer();
