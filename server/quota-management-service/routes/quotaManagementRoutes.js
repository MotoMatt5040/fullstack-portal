const express = require('express');
const router = express.Router();
const { ROLES_LIST } = require('@internal/roles-config');
const { gatewayAuth, verifyRoles } = require('@internal/auth-middleware');
const quotaManagementController = require('../controllers/quotaManagementController');

// Apply gateway auth to all routes
router.use(gatewayAuth);

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
