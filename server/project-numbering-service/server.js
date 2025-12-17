// Project Numbering Service - server.js
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const corsOptions = require('./config/corsOptions');
const errorHandler = require('./middleware/errorHandler');
const projectRoutes = require('./routes/projectRoutes');

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

// Mount routes - all routes are under /api/projects
app.use('/api', projectRoutes);

// Error handler
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`Project Numbering Service running on port ${PORT}`);
});
