const express = require('express');
const router = express.Router();
const verifyRoles = require('../../middleware/verifyRoles');
const ROLES_LIST = require('../../config/rolesList');
const projectPublishingController = require('../../controllers/projectPublishingController');

router
  .route('/')
  .get(
    verifyRoles(ROLES_LIST.Admin, ROLES_LIST.Executive, ROLES_LIST.Programmer),
    projectPublishingController.handleGetPublishedProjects
  )
  .post(
    verifyRoles(ROLES_LIST.Admin, ROLES_LIST.Executive, ROLES_LIST.Programmer),
    projectPublishingController.handlePublishProject
  );

router.route('/projects').get(
    verifyRoles(ROLES_LIST.Admin, ROLES_LIST.Executive, ROLES_LIST.Programmer),
    projectPublishingController.handleGetProjects
);

router.route('/clients').get(
    verifyRoles(ROLES_LIST.Admin, ROLES_LIST.Executive, ROLES_LIST.Programmer),
    projectPublishingController.handleGetClients
);

module.exports = router;