const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { ROLES_LIST } = require('@internal/roles-config');
const { gatewayAuth, verifyRoles } = require('@internal/auth-middleware');
const quotaManagementController = require('../controllers/quotaManagementController');
const {
  setFetchFunction,
  setFilterFunction,
  addClient,
  removeClient,
  getSubscriptionStats,
  HEARTBEAT_INTERVAL_MS,
} = require('../services/quotaSSEManager');

// Wire up the SSE manager with the data-fetching functions
setFetchFunction(quotaManagementController.fetchQuotaData);
setFilterFunction(quotaManagementController.filterForExternalUsers);

// SSE endpoint - NO gatewayAuth (EventSource doesn't support custom headers)
router.get('/events', (req, res) => {
  const { projectId, username, isInternalUser } = req.query;

  if (!projectId) {
    return res.status(400).json({ message: 'projectId query parameter is required' });
  }

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  const clientId = uuidv4();
  const internal = isInternalUser === 'true';

  // Send connection confirmation
  res.write(`event: connected\ndata: ${JSON.stringify({ clientId, projectId })}\n\n`);

  // Register client for this project
  addClient(projectId, clientId, res, username || 'Anonymous', internal);

  // Heartbeat to keep connection alive
  const heartbeatInterval = setInterval(() => {
    try {
      res.write(`event: heartbeat\ndata: ${JSON.stringify({ timestamp: new Date().toISOString() })}\n\n`);
    } catch (err) {
      clearInterval(heartbeatInterval);
    }
  }, HEARTBEAT_INTERVAL_MS);

  // Cleanup on disconnect
  req.on('close', () => {
    clearInterval(heartbeatInterval);
    removeClient(projectId, clientId);
  });
});

// Apply gateway auth to all remaining routes
router.use(gatewayAuth);

// SSE subscription stats (admin only)
router.get(
  '/events/stats',
  verifyRoles(ROLES_LIST.Admin),
  (req, res) => {
    res.json({ subscriptions: getSubscriptionStats() });
  }
);

// GET quota projects list
router
  .route('/projects')
  .get(
    verifyRoles(
      ROLES_LIST.Admin,
      ROLES_LIST.Executive,
      ROLES_LIST.Programmer,
      ROLES_LIST.Manager,
      ROLES_LIST.External
    ),
    quotaManagementController.handleGetQuotaProjects
  );

// GET quota data
router
  .route('/data')
  .get(
    verifyRoles(
      ROLES_LIST.Admin,
      ROLES_LIST.Executive,
      ROLES_LIST.Programmer,
      ROLES_LIST.Manager,
      ROLES_LIST.External
    ),
    quotaManagementController.handleGetQuotas
  );

module.exports = router;
