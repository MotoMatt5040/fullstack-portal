// Notification Service - notificationRoutes.js

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

const {
  addClient,
  removeClient,
  updateClientPage,
  sendMaintenanceNotification,
  sendNotification,
  getClientCount,
  getConnectedUsers,
} = require('../services/notificationService');
const { handleContactSupport } = require('../controllers/supportController');
const { gatewayAuth, verifyRoles } = require('@internal/auth-middleware');
const { ROLES_LIST } = require('@internal/roles-config');

// Health check (accessible via /api/notifications/health through Caddy)
router.get('/notifications/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'notification-service',
    timestamp: new Date().toISOString(),
    connectedClients: getClientCount()
  });
});

// SSE endpoint for real-time notifications (public - no auth required for SSE connection)
router.get('/notifications/events', (req, res) => {
  // Set headers for SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

  // Generate unique client ID
  const clientId = uuidv4();

  // Extract username from query param (sent by client on connect)
  const username = req.query.username || 'Anonymous';

  // Send initial connection confirmation
  res.write(`event: connected\ndata: ${JSON.stringify({ clientId, message: 'Connected to notification service' })}\n\n`);

  // Add client to the list with username
  addClient(clientId, res, username);

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

// Endpoint to update client's current page (called by client on route change)
router.post('/notifications/page', gatewayAuth, (req, res) => {
  const { clientId, page } = req.body;

  if (!clientId || !page) {
    return res.status(400).json({ error: 'clientId and page are required' });
  }

  updateClientPage(clientId, page);
  res.json({ success: true });
});

// Admin endpoint to trigger maintenance notification
router.post(
  '/notifications/maintenance',
  gatewayAuth,
  verifyRoles(ROLES_LIST.Admin),
  (req, res) => {
    const { minutes = 5, message } = req.body;

    if (typeof minutes !== 'number' || minutes < 1 || minutes > 60) {
      return res.status(400).json({ error: 'Minutes must be a number between 1 and 60' });
    }

    sendMaintenanceNotification(minutes, message);

    res.json({
      success: true,
      message: `Maintenance notification sent to ${getClientCount()} connected clients`,
      clientCount: getClientCount(),
    });
  }
);

// Admin endpoint to send a general notification
router.post(
  '/notifications/broadcast',
  gatewayAuth,
  verifyRoles(ROLES_LIST.Admin),
  (req, res) => {
    const { title, message, type = 'info' } = req.body;

    if (!title || !message) {
      return res.status(400).json({ error: 'Title and message are required' });
    }

    const validTypes = ['info', 'warning', 'error', 'success'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: `Type must be one of: ${validTypes.join(', ')}` });
    }

    sendNotification(title, message, type);

    res.json({
      success: true,
      message: `Notification sent to ${getClientCount()} connected clients`,
      clientCount: getClientCount(),
    });
  }
);

// Admin endpoint to get connected client count
router.get(
  '/notifications/clients',
  gatewayAuth,
  verifyRoles(ROLES_LIST.Admin),
  (req, res) => {
    res.json({
      clientCount: getClientCount(),
    });
  }
);

// Admin endpoint to get detailed connected users list
router.get(
  '/notifications/online-users',
  gatewayAuth,
  verifyRoles(ROLES_LIST.Admin),
  (req, res) => {
    res.json({
      users: getConnectedUsers(),
      count: getClientCount(),
    });
  }
);

// Support contact endpoint (requires authentication)
router.post('/support/contact', gatewayAuth, handleContactSupport);

module.exports = router;
