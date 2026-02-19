const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { gatewayAuth, verifyRoles } = require('@internal/auth-middleware');
const { ROLES_LIST } = require('@internal/roles-config');
const dispositionController = require('../controllers/dispositionController');
const dispositionSSEManager = require('../services/dispositionSSEManager');

// Wire up the SSE manager with the fetch function from the controller
dispositionSSEManager.setFetchFunction(dispositionController.fetchAllDispositionData);

// SSE endpoint - BEFORE gatewayAuth (EventSource can't send custom headers)
router.route('/events').get((req, res) => {
  const projectId = req.query?.projectId || '';
  const username = req.query?.username || 'Anonymous';

  if (!projectId) {
    return res.status(400).json({ error: 'Project ID is required' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  const clientId = uuidv4();

  res.write(`event: connected\ndata: ${JSON.stringify({ clientId, projectId })}\n\n`);

  dispositionSSEManager.addClient(projectId, clientId, res, username);

  const heartbeatInterval = setInterval(() => {
    try {
      res.write(`event: heartbeat\ndata: ${JSON.stringify({ time: Date.now() })}\n\n`);
    } catch (err) {
      clearInterval(heartbeatInterval);
    }
  }, dispositionSSEManager.HEARTBEAT_INTERVAL_MS);

  req.on('close', () => {
    clearInterval(heartbeatInterval);
    dispositionSSEManager.removeClient(projectId, clientId);
  });
});

// All routes below require authentication via gateway
router.use(gatewayAuth);

// GET /api/disposition-report/web/:projectId - Get web disposition data
router
  .route('/web/:projectId')
  .get(
    verifyRoles(
      ROLES_LIST.Admin,
      ROLES_LIST.Executive,
      ROLES_LIST.Programmer,
      ROLES_LIST.Manager,
      ROLES_LIST.External
    ),
    dispositionController.handleGetWebDisposition
  );

// GET /api/disposition-report/web/:projectId/counts - Get web dropout counts
router
  .route('/web/:projectId/counts')
  .get(
    verifyRoles(
      ROLES_LIST.Admin,
      ROLES_LIST.Executive,
      ROLES_LIST.Programmer,
      ROLES_LIST.Manager,
      ROLES_LIST.External
    ),
    dispositionController.handleGetWebDispositionCounts
  );

module.exports = router;
