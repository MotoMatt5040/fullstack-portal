const express = require('express');
const router = express.Router();
const { ROLES_LIST } = require('../config/rolesConfig');
const gatewayAuth = require('../middleware/gatewayAuth');
const verifyRoles = require('../middleware/verifyRoles');
const projectInfoController = require('../controllers/projectInfoController');

// Apply gateway auth to all routes
router.use(gatewayAuth);

// GET project list - /api/project-info/projects
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

module.exports = router;
