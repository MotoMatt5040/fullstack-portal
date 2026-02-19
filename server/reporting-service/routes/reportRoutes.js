const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { ROLES_LIST } = require('@internal/roles-config');
const { gatewayAuth, verifyRoles } = require('@internal/auth-middleware');
const requestSequence = require('@internal/request-sequence');
const reportController = require('../controllers/reportController');
const reportSSEManager = require('../services/reportSSEManager');

// Wire up the SSE manager with the fetch function from the controller
reportSSEManager.setFetchFunction(reportController.fetchLiveReportData);

// SSE endpoint - BEFORE gatewayAuth (EventSource can't send custom headers)
router.route('/events').get((req, res) => {
  const projectId = req.query?.projectId || '';
  const useGpcph = req.query?.useGpcph === 'true';
  const username = req.query?.username || 'Anonymous';

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  const clientId = uuidv4();
  const subscriptionKey = reportSSEManager.buildKey(projectId, useGpcph);

  res.write(`event: connected\ndata: ${JSON.stringify({ clientId, subscriptionKey })}\n\n`);

  reportSSEManager.addClient(subscriptionKey, clientId, res, username, { projectId, useGpcph });

  const heartbeatInterval = setInterval(() => {
    try {
      res.write(`event: heartbeat\ndata: ${JSON.stringify({ time: Date.now() })}\n\n`);
    } catch (err) {
      clearInterval(heartbeatInterval);
    }
  }, reportSSEManager.HEARTBEAT_INTERVAL_MS);

  req.on('close', () => {
    clearInterval(heartbeatInterval);
    reportSSEManager.removeClient(subscriptionKey, clientId);
  });
});

// Apply gateway auth to all routes below
router.use(gatewayAuth);

// GET report data (live or historic) - /api/reports/tables/data/:type
router
  .route('/tables/data/:type')
  .get(
    verifyRoles(
      ROLES_LIST.Admin,
      ROLES_LIST.Executive,
      ROLES_LIST.Manager,
      ROLES_LIST.Programmer
    ),
    // Use request sequencing for live data to handle rapid requests gracefully
    requestSequence({ abortPrevious: true }),
    (req, res) => {
      reportController.handleGetReportData(req, res);
    }
  );

// GET interviewer production report data - /api/reports/data/productionreport
router
  .route('/data/productionreport')
  .get(
    verifyRoles(
      ROLES_LIST.Admin,
      ROLES_LIST.Executive,
      ROLES_LIST.Manager,
      ROLES_LIST.Programmer
    ),
    (req, res) => {
      reportController.handleGetInterviewerProductionReportData(req, res);
    }
  );

// PUT update target mph and cph - /api/reports/data/update/targetmphandcph
router
  .route('/data/update/targetmphandcph')
  .put(
    verifyRoles(ROLES_LIST.Admin, ROLES_LIST.Executive, ROLES_LIST.Manager),
    (req, res) => {
      reportController.handleUpdateTargetMphAndCph(req, res);
    }
  );

// GET topline report - /api/reports/topline-report
router
  .route('/topline-report')
  .get(
    verifyRoles(
      ROLES_LIST.Admin,
      ROLES_LIST.Executive,
      ROLES_LIST.Manager,
      ROLES_LIST.Programmer
    ),
    (req, res) => {
      reportController.handleGetToplineReport(req, res);
    }
  );

module.exports = router;
