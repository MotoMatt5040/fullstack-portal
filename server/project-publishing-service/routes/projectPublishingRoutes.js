const express = require('express');
const router = express.Router();
const { ROLES_LIST } = require('../config/rolesConfig');
const gatewayAuth = require('../middleware/gatewayAuth');
const verifyRoles = require('../middleware/verifyRoles');
const projectPublishingController = require('../controllers/projectPublishingController');

// Apply gateway auth to all routes
router.use(gatewayAuth);

// GET published projects, POST publish, DELETE unpublish - /api/project-publishing
router
  .route('/')
  .get(
    verifyRoles(ROLES_LIST.Admin, ROLES_LIST.Executive, ROLES_LIST.Programmer),
    projectPublishingController.handleGetPublishedProjects
  )
  .post(
    verifyRoles(ROLES_LIST.Admin, ROLES_LIST.Executive, ROLES_LIST.Programmer),
    projectPublishingController.handlePublishProject
  )
  .delete(
    verifyRoles(ROLES_LIST.Admin, ROLES_LIST.Executive, ROLES_LIST.Programmer),
    projectPublishingController.handleUnpublishProject
  );

// GET available projects - /api/project-publishing/projects
router
  .route('/projects')
  .get(
    verifyRoles(ROLES_LIST.Admin, ROLES_LIST.Executive, ROLES_LIST.Programmer),
    projectPublishingController.handleGetProjects
  );

// GET all clients - /api/project-publishing/clients
router
  .route('/clients')
  .get(
    verifyRoles(ROLES_LIST.Admin, ROLES_LIST.Executive, ROLES_LIST.Programmer),
    projectPublishingController.handleGetClients
  );

module.exports = router;
