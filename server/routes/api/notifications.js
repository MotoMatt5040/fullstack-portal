// server/routes/api/notifications.js
// Admin endpoints for broadcasting notifications (SSE events endpoint is in publicRoutes.js)
const express = require('express');
const router = express.Router();
const {
  sendMaintenanceNotification,
  sendNotification,
  getClientCount,
} = require('../../services/notificationService');
const verifyRoles = require('../../middleware/verifyRoles');
const { ROLES_LIST } = require('../../config/rolesConfig');

// Admin endpoint to trigger maintenance notification
router.post(
  '/maintenance',
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
  '/broadcast',
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
  '/clients',
  verifyRoles(ROLES_LIST.Admin),
  (req, res) => {
    res.json({
      clientCount: getClientCount(),
    });
  }
);

module.exports = router;
