require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { initializeRoles } = require('@internal/roles-config');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5008;

// Middleware
app.use(cors());
app.use(express.json());
app.use(cookieParser());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', service: 'quota-management-service' });
});

// Initialize roles and start server
const startServer = async () => {
  try {
    await initializeRoles();

    // Routes must be registered AFTER roles are initialized
    app.use('/api/quota-management', require('./routes/quotaManagementRoutes'));

    // Error handler
    app.use(errorHandler);

    app.listen(PORT, () => {
      console.log(`Quota Management Service running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start Quota Management Service:', error);
    process.exit(1);
  }
};

startServer();
