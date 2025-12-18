const express = require('express');
const router = express.Router();
const { gatewayAuth, verifyRoles } = require('@internal/auth-middleware');
const { ROLES_LIST } = require('@internal/roles-config');
const dispositionController = require('../controllers/dispositionController');

// All routes require authentication via gateway
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
