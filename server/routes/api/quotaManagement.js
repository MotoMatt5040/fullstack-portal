const express = require('express');
const router = express.Router();
const verifyRoles = require('../../middleware/verifyRoles');
const ROLES_LIST = require('../../config/rolesList');
const quotaManagementController = require('../../controllers/quotaManagementController');
const projectInfoController = require('../../controllers/projectInfoController');

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
    projectInfoController.handleGetProjectList
  );

router.route('/publish').get().post();

module.exports = router;
