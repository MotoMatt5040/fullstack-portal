const express = require('express');
const router = express.Router();
const configController = require('../controllers/configController');
const { addClient, removeClient } = require('../services/notificationService');
const { v4: uuidv4 } = require('uuid');

// These routes do not require JWT authentication
router.use('/auth', require('./auth'));
router.use('/refresh', require('./refresh'));
router.use('/logout', require('./logout'));
router.use('/reset', require('./resetPassword'));

router.get('/roles', configController.getRolesConfig);

// SSE endpoint for real-time notifications (public so SSE connection isn't blocked by JWT middleware)
router.get('/notifications/events', (req, res) => {
  // Set headers for SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

  // Generate unique client ID
  const clientId = uuidv4();

  // Send initial connection confirmation
  res.write(`event: connected\ndata: ${JSON.stringify({ clientId, message: 'Connected to notification service' })}\n\n`);

  // Add client to the list
  addClient(clientId, res);

  // Send heartbeat every 30 seconds to keep connection alive
  const heartbeatInterval = setInterval(() => {
    try {
      res.write(`event: heartbeat\ndata: ${JSON.stringify({ timestamp: new Date().toISOString() })}\n\n`);
    } catch (error) {
      clearInterval(heartbeatInterval);
    }
  }, 30000);

  // Handle client disconnect
  req.on('close', () => {
    clearInterval(heartbeatInterval);
    removeClient(clientId);
  });
}); 

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