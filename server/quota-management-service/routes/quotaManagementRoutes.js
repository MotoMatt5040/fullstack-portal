const express = require('express');
const router = express.Router();
const { ROLES_LIST } = require('../config/rolesConfig');
const gatewayAuth = require('../middleware/gatewayAuth');
const verifyRoles = require('../middleware/verifyRoles');
const quotaManagementController = require('../controllers/quotaManagementController');

// Apply gateway auth to all routes
router.use(gatewayAuth);

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
