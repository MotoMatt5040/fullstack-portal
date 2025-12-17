const express = require('express');
const router = express.Router();
const configController = require('../controllers/configController');

// Note: Auth routes (/auth, /refresh, /logout, /reset) are now handled by the auth-service microservice
// Note: Notification routes (/notifications/*) are now handled by the notification-service microservice

router.get('/roles', configController.getRolesConfig);

router.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    version: '1.0.0'
  });
});

module.exports = router;