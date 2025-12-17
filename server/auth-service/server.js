// Auth Service - Standalone Authentication Microservice
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const corsOptions = require('./config/corsOptions');
const authRoutes = require('./routes/authRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.AUTH_SERVICE_PORT || 5001;

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'auth-service',
    timestamp: new Date().toISOString()
  });
});

// Mount auth routes
app.use('/api', authRoutes);

// Error handler
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🔐 Auth Service running on port ${PORT}`);
});
